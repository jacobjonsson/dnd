import fastify from "fastify";
import fastifyStatic from "fastify-static";
import path from "node:path";
import fastifyCompress from "fastify-compress";

const app = fastify({ logger: true });

app.register(fastifyCompress);

const modulePath = new URL(import.meta.url);
const moduleDir = path.dirname(modulePath.pathname);
const clientDir = path.join(moduleDir, "../client");

console.log(clientDir);

app.register(fastifyStatic, {
  root: clientDir,
});

app.get("/", (_, reply) => {
  return reply.sendFile("./index.html");
});

app.listen(3000);
