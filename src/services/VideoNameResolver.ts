import { BoundMethod } from "decorate";
import { Provide } from "microdi";
import { DownloaderConfiguration } from "services/DownloaderConfiguration.ts";
import { ConsoleLogger } from "services/ConsoleLogger.ts";
import { Logger } from "services/Logger.ts";

@Provide(DownloaderConfiguration, ConsoleLogger)
export class VideoNameResolver {
  private static readonly enAlphaLower = "abcdefghijklmnopqrstuvwxyz";
  private static readonly enAlpha = new Set(
    Array.from(
      VideoNameResolver.enAlphaLower.concat(
        VideoNameResolver.enAlphaLower.toLocaleUpperCase()
      )
    )
  );
  private static readonly ruAlphaLower = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  private static readonly ruAlpha = new Set(
    Array.from(
      VideoNameResolver.ruAlphaLower.concat(
        VideoNameResolver.ruAlphaLower.toLocaleUpperCase()
      )
    )
  );
  private static readonly numbers = new Set(Array.from("0123456789"));
  private static readonly specialChars = new Set(Array.from(" ,.!?"));
  private static allowedChars = new Set([
    ...VideoNameResolver.enAlpha,
    ...VideoNameResolver.ruAlpha,
    ...VideoNameResolver.numbers,
    ...VideoNameResolver.specialChars,
  ]);

  public constructor(
    private readonly downloaderConfiguration: DownloaderConfiguration,
    private readonly logger: Logger
  ) {}

  private async downloadWithNoProxy(url: string): Promise<string | null> {
    const args = this.getArgs(url);
    this.logger.info(`Running yt-dlp with args: ${args.join(" ")}`);
    const command = new Deno.Command("yt-dlp", { args });
    try {
      const { success, stdout, stderr } = await command.output();
      const result = success ? new TextDecoder().decode(stdout) : null;

      if (!success) {
        const errorText = new TextDecoder().decode(stderr);
        this.logger.error(
          `Finding out video title resulted with error (without proxy):`
        );
        this.logger.error(errorText);
      }

      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error");
      this.logger.error(
        `Finding out video title resulted with error (without proxy):`
      );
      this.logger.error(error.message);
      return null;
    }
  }

  private async downloadWithProxy(
    url: string,
    proxyUrl: string
  ): Promise<string | null> {
    const args = this.getArgs(url, proxyUrl);
    this.logger.info(`Running yt-dlp with args: ${args.join(" ")}`);
    const command = new Deno.Command("yt-dlp", { args });
    try {
      const { success, stdout, stderr } = await command.output();

      if (!success) {
        const errorText = new TextDecoder().decode(stderr);
        this.logger.error(
          `Finding out video title resulted with error (with proxy):`
        );
        this.logger.error(errorText);
      }

      return success ? new TextDecoder().decode(stdout) : null;
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error");
      this.logger.error(
        `Finding out video title resulted with error (without proxy):`
      );
      this.logger.error(error.message);
      return null;
    }
  }

  private getArgs(url: string, proxyUrl?: string) {
    return ["--get-title", ...(proxyUrl ? ["--proxy", proxyUrl] : []), url];
  }

  private cleanFileName(rawFileName: string): string {
    return Array.from(rawFileName)
      .filter((char) => VideoNameResolver.allowedChars.has(char))
      .join("");
  }

  /**
   * Get file filesystem-friendly file name with '.mp3' extension
   * @param url Youtube video URL
   * @returns name or null if can't get it
   */
  @BoundMethod
  public async resolve(url: string): Promise<string | null> {
    let fileName: string | null = null;
    try {
      this.logger.info(
        `Trying to get the video title for url (without proxy): "${url}"`
      );
      fileName = await this.downloadWithNoProxy(url);
    } catch {
      this.logger.error(
        `Trying to get the video title for url (without proxy) "${url}" failed`
      );
    }
    if (!fileName && this.downloaderConfiguration.proxyUrl) {
      this.logger.info(
        `Trying to get the video title for url (with proxy): "${url}"`
      );
      fileName = await this.downloadWithProxy(
        url,
        this.downloaderConfiguration.proxyUrl
      );
    }

    if (!fileName) {
      this.logger.error(
        `Trying to get the video title for url (with proxy) "${url}" failed`
      );
    }

    const cleanFileName = fileName ? this.cleanFileName(fileName.trim()) : null;
    return cleanFileName ? `${cleanFileName}.mp3` : null;
  }
}
