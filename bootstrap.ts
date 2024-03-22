import { load } from "dotenv";
import { resolve } from "microdi";
import { PanicBus } from "services/PanicBus.ts";
import { PodcastifyBot } from "services/PodcastifyBot.ts";

await load({ export: true });

const bot = resolve(PodcastifyBot);
const panicBus = resolve(PanicBus);

bot.start();

panicBus.subscribe(function subscriber({ message, serviceName }) {
  console.error(`[${serviceName}] ${message}`);
  Deno.exit(1);
});
