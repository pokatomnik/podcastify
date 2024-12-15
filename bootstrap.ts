import { load } from "dotenv";
import { resolve } from "microdi";
import { PanicBus } from "services/PanicBus.ts";
import { PodcastifyBot } from "services/PodcastifyBot.ts";
import type { Logger } from "services/Logger.ts";
import { ConsoleLogger } from "services/ConsoleLogger.ts";

await load({ export: true });

const bot = resolve(PodcastifyBot);
const panicBus = resolve(PanicBus);
const logger: Logger = resolve(ConsoleLogger);

bot.start();

panicBus.subscribe(function subscriber({ message, serviceName }) {
  logger.error(`${serviceName}: ${message}`);
  Deno.exit(1);
});
