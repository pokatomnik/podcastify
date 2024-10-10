import { BoundMethod, Nullable } from "decorate";
import { Bot, CommandContext, Context, InputFile } from "grammy";
import { Provide } from "microdi";
import { PodcastifyBotConfiguration } from "services/PodcastifyBotConfiguration.ts";
import { LinksExtractor } from "services/LinksExtractor.ts";
import { Downloader } from "services/Downloader.ts";
import { BotTalks } from "services/BotTalks.ts";
import { UploaderPool } from "services/UploaderPool.ts";
import { VideoNameResolver } from "services/VideoNameResolver.ts";

@Provide(
  PodcastifyBotConfiguration,
  LinksExtractor,
  Downloader,
  VideoNameResolver,
  BotTalks,
  UploaderPool
)
export class PodcastifyBot {
  private static readonly UPLOAD_LIMIT_HOSTED_50_MB = 50 * 1024 * 1024;

  private static readonly UPLOAD_LIMIT_TELEGRAM_BOT_API_2_GB =
    2 * 1024 * 1024 * 1024;

  private readonly bot: Bot;

  public constructor(
    private readonly configuration: PodcastifyBotConfiguration,
    private readonly linksExtractor: LinksExtractor,
    private readonly downloader: Downloader,
    private readonly videoNameResolver: VideoNameResolver,
    private readonly botTalks: BotTalks,
    private readonly uploaderPool: UploaderPool
  ) {
    if (configuration.apiRoot) {
      this.bot = new Bot(configuration.botToken, {
        client: { apiRoot: configuration.apiRoot },
      });
    } else {
      this.bot = new Bot(configuration.botToken);
    }
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

        const [downloadResult, fileName] = await Promise.all([
          this.downloader.submitDownloadTaskAndGetResult(url.toString()),
          this.videoNameResolver.resolve(url.toString()),
        ]);

        try {
          if (downloadResult.filePath === null) {
            await this.tryOrIngnoreError(() => {
              return ctx.reply(
                this.botTalks.downloadFailed(url.toString()),
                this.getReplyParameters(ctx.message.message_id)
              );
            });
            continue;
          }
          const downloadedFileStats = await Deno.stat(downloadResult.filePath);
          const isTelegramBotApiEnabled = Boolean(this.configuration.apiRoot);
          const maxTelegramUploadSize = isTelegramBotApiEnabled
            ? PodcastifyBot.UPLOAD_LIMIT_TELEGRAM_BOT_API_2_GB
            : PodcastifyBot.UPLOAD_LIMIT_HOSTED_50_MB;

          if (downloadedFileStats.size <= maxTelegramUploadSize) {
            await ctx.api.editMessageText(
              ctx.message.chat.id,
              waitMessage.message_id,
              this.botTalks.uploadingNormalFile(url.toString())
            );
            await this.tryOrIngnoreError(() => {
              const params = {
                ...this.getCaptionParams(url.toString()),
                ...this.getReplyParameters(ctx.message.message_id),
                duration: downloadResult.durationMs
                  ? Math.floor(downloadResult.durationMs / 1000)
                  : undefined,
              };
              return ctx.replyWithAudio(
                new InputFile(downloadResult.filePath, fileName ?? undefined),
                params
              );
            });
          } else {
            await ctx.api.editMessageText(
              ctx.message.chat.id,
              waitMessage.message_id,
              this.botTalks.uploadingBigFile(url.toString())
            );
            const uploadURL = await this.uploaderPool.upload(
              downloadResult.filePath,
              downloadedFileStats.size
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
