import { createServer } from "node:http";
import { env } from "./config/env.js";
import { prisma } from "./database/client.js";
import { createApp } from "./app.js";

const server = createServer(createApp());

server.listen(env.PORT, () => {
  console.info(`TrustTrade API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  console.info(`Received ${signal}; shutting down.`);
  server.close(async (error) => {
    await prisma.$disconnect();
    if (error) {
      console.error("API server shutdown failed.", error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
