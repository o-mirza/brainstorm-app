import { env } from "./env.js";
import { buildServer } from "./server.js";

const server = await buildServer();

try {
  await server.listen({ host: "0.0.0.0", port: env.PORT });
  server.log.info(`Brainstorm API listening on ${env.PORT}`);
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
