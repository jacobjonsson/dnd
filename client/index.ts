import { createMachine, assign, interpret } from "xstate";

interface Context {
  selectedElement?: HTMLElement;
  draggableElement?: HTMLElement;
  offsetX: number;
  offsetY: number;
}

type DragAndDropEvent = MouseEvent | PointerEvent | KeyboardEvent;

const dragAndDropMachine = createMachine<Context, DragAndDropEvent>(
  {
    id: "dragAndDrop",
    initial: "idle",
    context: {
      selectedElement: undefined,
      draggableElement: undefined,
      offsetX: 0,
      offsetY: 0,
    },
    states: {
      idle: {
        on: {
          pointerdown: {
            target: "dragging",
            actions: ["setDraggableItem", "setSelectedElement"],
            cond: "isDraggable",
          },
          pointerup: {
            actions: ["unsetSelectedElement", "addBlock"],
          },
          keyup: {
            actions: ["removeSelectedElement"],
            cond: "hasSelectedElementAndIsBackspace",
          },
          dblclick: {
            target: "editing",
            actions: ["setSelectedElement"],
            cond: "isDraggable",
          },
        },
      },

      dragging: {
        on: {
          pointermove: {
            actions: "moveItem",
          },
          pointerup: {
            target: "idle",
            actions: "dropItem",
          },
        },
      },

      editing: {
        entry: "openModal",
        on: {
          pointerup: {
            target: "idle",
            actions: "closeModal",
          },
        },
      },
    },
  },
  {
    actions: {
      setSelectedElement: assign((context, event) => {
        if (context.selectedElement) {
          context.selectedElement.setAttribute("data-selected", "false");
        }

        const selectedElement = event.target as HTMLElement;
        selectedElement.setAttribute("data-selected", "true");
        return { selectedElement };
      }),

      unsetSelectedElement: assign((context, event) => {
        if (!context.selectedElement) {
          return;
        }

        if (event.target instanceof HTMLElement) {
          if (event.target.getAttribute("data-selected") === "true") {
            return;
          }
        }

        context.selectedElement.setAttribute("data-selected", "false");
        return { selectedElement: undefined };
      }),

      removeSelectedElement: (context) => {
        context.selectedElement?.remove();
      },

      setDraggableItem: assign((_, event) => {
        if (!isMouseEvent(event) || event.type !== "pointerdown") {
          return;
        }

        const element = event.target as HTMLElement;

        element.setAttribute("data-dragging", "true");

        // Bring the active element to the front
        document.querySelectorAll("[data-dragging]").forEach((draggable) => {
          if (!(draggable instanceof HTMLElement)) return;
          draggable.style.zIndex = `${draggable === element ? 1 : 0}`;
        });

        const computed = getComputedStyle(element);
        const y = parseFloat(computed.getPropertyValue("top"));
        const x = parseFloat(computed.getPropertyValue("left"));

        return {
          draggableElement: element,
          offsetX: event.clientX - x,
          offsetY: event.clientY - y,
        };
      }),

      moveItem: (context, event) => {
        if (!isMouseEvent(event) || event.type !== "pointermove") {
          return;
        }

        let newX = event.clientX - context.offsetX;
        if (newX < 0) {
          newX = 0;
        } else if (
          newX + context.draggableElement.offsetWidth >
          window.innerWidth - 16
        ) {
          newX = window.innerWidth - context.draggableElement.offsetWidth - 16;
        }

        let newY = event.clientY - context.offsetY;
        if (newY < 0) {
          newY = 0;
        } else if (
          newY + context.draggableElement.offsetHeight >
          window.innerHeight - 16
        ) {
          newY =
            window.innerHeight - context.draggableElement.offsetHeight - 16;
        }

        context.draggableElement.style.setProperty("left", `${newX}px`);
        context.draggableElement.style.setProperty("top", `${newY}px`);
      },

      dropItem: assign((context, event) => {
        if (!isPointerEvent(event) || event.type !== "pointerup") {
          return;
        }
        context.draggableElement.setAttribute("data-dragging", "false");
        return { draggableElement: undefined };
      }),

      openModal: () => {
        const modal = document.querySelector(".edit-block-modal");
        if (!(modal instanceof HTMLElement)) {
          return;
        }

        modal.setAttribute("data-open", "true");
      },

      closeModal: () => {
        const modal = document.querySelector(".edit-block-modal");
        if (!(modal instanceof HTMLElement)) {
          return;
        }

        modal.setAttribute("data-open", "false");
      },

      addBlock: (_, event) => {
        if (!(event.target instanceof HTMLElement)) {
          return;
        }

        if (event.target.id !== "add-block") {
          return;
        }

        const block = createBlock("Block", 60);
        document
          .querySelector(".blocks")
          .insertAdjacentHTML("beforeend", block);
      },
    },

    guards: {
      isDraggable: (_, event) => {
        const target = event.target as HTMLElement;
        return target.hasAttribute("data-draggable");
      },

      hasSelectedElementAndIsBackspace: (context, event) => {
        if (!isKeyboardEvent(event)) {
          return false;
        }

        if (event.key !== "Backspace") {
          return false;
        }

        return context.selectedElement !== undefined;
      },
    },
  }
);

function isMouseEvent(event: Event): event is MouseEvent {
  return event instanceof MouseEvent;
}

function isPointerEvent(event: Event): event is PointerEvent {
  return event instanceof PointerEvent;
}

function isKeyboardEvent(event: Event): event is KeyboardEvent {
  return event instanceof KeyboardEvent;
}

const dragAndDropServer = interpret(dragAndDropMachine);

dragAndDropServer.start();

window.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
  },
  { passive: false }
);

window.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  dragAndDropServer.send(event);
});
window.addEventListener("pointermove", (event) => {
  event.preventDefault();
  dragAndDropServer.send(event);
});
window.addEventListener("pointerup", (event) => {
  event.preventDefault();
  dragAndDropServer.send(event);
});
window.addEventListener("keyup", (event) => {
  event.preventDefault();
  dragAndDropServer.send(event);
});
window.addEventListener("dblclick", (event) => {
  event.preventDefault();
  dragAndDropServer.send(event);
});

function createBlock(type: string, duration: number) {
  return `<div class="block" data-draggable data-dragging="false">
  <p id="type">${type}</p>
  <p id="duration">${duration}</p>
</div>`;
}
