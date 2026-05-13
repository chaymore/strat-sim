import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { registerRestRoutes } from "./routes.js";
import { registerWebsocketRoutes } from "./ws.js";
import { registerLlmRoutes } from "./llm.js";

export async function buildApp() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
  });
  await app.register(cors, { origin: true });
  await app.register(websocket);
  await registerRestRoutes(app);
  await registerWebsocketRoutes(app);
  await registerLlmRoutes(app);
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
