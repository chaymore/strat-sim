import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import staticPlugin from "@fastify/static";
import websocket from "@fastify/websocket";
import { registerRestRoutes } from "./routes.js";
import { registerWebsocketRoutes } from "./ws.js";
import { registerLlmRoutes } from "./llm.js";

const API_PREFIXES = ["/api/", "/ws/", "/classes", "/matches", "/health"];

export async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });
  await app.register(cors, { origin: true });
  await app.register(websocket);
  await registerRestRoutes(app);
  await registerWebsocketRoutes(app);
  await registerLlmRoutes(app);

  const here = dirname(fileURLToPath(import.meta.url));
  const webDist = resolve(here, "../../web/dist");
  if (existsSync(webDist)) {
    await app.register(staticPlugin, { root: webDist, wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.method !== "GET") return reply.code(404).send({ error: "not found" });
      const path = req.url.split("?")[0] ?? "";
      if (API_PREFIXES.some((p) => path === p || path.startsWith(p))) {
        return reply.code(404).send({ error: "not found" });
      }
      return reply.type("text/html").sendFile("index.html");
    });
  }

  return app;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = Number(process.env.PORT ?? 3001);
  buildApp()
    .then((app) => app.listen({ port, host: "0.0.0.0" }))
    .then((addr) => {
      // eslint-disable-next-line no-console
      console.log(`strat-sim server listening on ${addr}`);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
