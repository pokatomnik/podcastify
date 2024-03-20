import { Bot } from "grammy";
import { Provide } from "microdi";
import { PodcastifyBotConfiguration } from "services/PodcastifyBotConfiguration.ts";

@Provide(PodcastifyBotConfiguration)
export class PodcastifyBot extends Bot {
  public constructor(configuration: PodcastifyBotConfiguration) {
    super(configuration.botToken);
  }
}
