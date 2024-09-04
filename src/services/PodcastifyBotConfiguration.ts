import { Provide } from "microdi";
import { PanicBus } from "services/PanicBus.ts";

@Provide(PanicBus)
export class PodcastifyBotConfiguration {
  public readonly botToken: string;

  public readonly apiRoot: string | undefined;

  public constructor(panicBus: PanicBus) {
    const botToken = Deno.env.get("BOT_TOKEN");
    const apiRoot = Deno.env.get("API_ROOT");
    if (!botToken) {
      panicBus.publish({
        serviceName: PodcastifyBotConfiguration.name,
        message: "No BOT_TOKEN variable provided",
      });
      throw new Error();
    }
    this.botToken = botToken;
    this.apiRoot = apiRoot;
  }
}
