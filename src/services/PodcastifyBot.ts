import { BoundMethod, Nullable } from "decorate";
import { Bot, CommandContext, Context, InputFile } from "grammy";
import { Provide } from "microdi";
import { PodcastifyBotConfiguration } from "services/PodcastifyBotConfiguration.ts";
import { LinksExtractor } from "services/LinksExtractor.ts";
import { Downloader } from "services/Downloader.ts";
import { BotTalks } from "services/BotTalks.ts";
import { UploaderPool } from "services/UploaderPool.ts";

@Provide(
  PodcastifyBotConfiguration,
  LinksExtractor,
  Downloader,
  BotTalks,
  UploaderPool
)
export class PodcastifyBot {
  private static readonly UPLOAD_LIMIT = 50 * 1024 * 1024;

  private readonly bot: Bot;

  public constructor(
    configuration: PodcastifyBotConfiguration,
    private readonly linksExtractor: LinksExtractor,
    private readonly downloader: Downloader,
    private readonly botTalks: BotTalks,
    private readonly uploaderPool: UploaderPool
  ) {
    this.bot = new Bot(configuration.botToken);
  }

  private getCaptionParams(caption: string) {
    return { caption };
  }

  private getReplyParameters(messageId: Nullable<number>) {
    if (!messageId) {
      return undefined;
    }
    return {
      reply_parameters: {
        message_id: messageId,
      },
    };
  }

  @BoundMethod
  private async tryOrIngnoreError(
    callback: () => Promise<unknown>
  ): Promise<void> {
    try {
      await callback();
    } catch {
      // do nothing
    }
  }

  @BoundMethod
  public start() {
    this.bot.command("start", this.handleStart);
    this.bot.on("message", async (ctx) => {
      const { text } = ctx.message;
      if (!text) {
        return await this.tryOrIngnoreError(() => {
          return ctx.reply(
            this.botTalks.incorrectMessageType(),
            this.getReplyParameters(ctx.message.message_id)
          );
        });
      }

      const links = this.linksExtractor.getUrlsFromText(text);
      if (links.length === 0) {
        return await this.tryOrIngnoreError(() => {
          return ctx.reply(
            this.botTalks.linksNotFound(),
            this.getReplyParameters(ctx.message.message_id)
          );
        });
      }

      for (const { type, message, url } of links) {
        if (type === "UNKNOWN") {
          await this.tryOrIngnoreError(() => {
            return ctx.reply(
              message,
              this.getReplyParameters(ctx.message.message_id)
            );
          });
          continue;
        }
        const waitMessage = await ctx.reply(
          this.botTalks.downloadStarted(url.toString()),
          this.getReplyParameters(ctx.message.message_id)
        );
        const downloadResult =
          await this.downloader.submitDownloadTaskAndGetResult(url.toString());

        try {
          if (downloadResult.filePath === null) {
            return await this.tryOrIngnoreError(() => {
              return ctx.reply(
                this.botTalks.downloadFailed(url.toString()),
                this.getReplyParameters(ctx.message.message_id)
              );
            });
          }
          const downloadedFileStats = await Deno.stat(downloadResult.filePath);
          if (downloadedFileStats.size <= PodcastifyBot.UPLOAD_LIMIT) {
            await this.tryOrIngnoreError(() => {
              const params = {
                ...this.getCaptionParams(url.toString()),
                ...this.getReplyParameters(ctx.message.message_id),
              };
              return ctx.replyWithAudio(
                new InputFile(downloadResult.filePath),
                params
              );
            });
          } else {
            const uploadURL = await this.uploaderPool.upload(
              downloadResult.filePath
            );

            if (uploadURL) {
              await ctx.reply(
                this.botTalks.replyWithUploadedFileLink(uploadURL),
                this.getReplyParameters(ctx.message.message_id)
              );
            } else {
              await ctx.reply(
                this.botTalks.failedToUpload(url.toString()),
                this.getReplyParameters(ctx.message.message_id)
              );
            }
          }
        } finally {
          if (waitMessage) {
            await this.tryOrIngnoreError(() => {
              return ctx.api.deleteMessage(ctx.chat.id, waitMessage.message_id);
            });
          }
          await this.tryOrIngnoreError(() => downloadResult.deleteFile());
        }
      }
    });
    return this.bot.start();
  }

  @BoundMethod
  private handleStart(ctx: CommandContext<Context>) {
    return ctx.reply(this.botTalks.welcome());
  }
}
