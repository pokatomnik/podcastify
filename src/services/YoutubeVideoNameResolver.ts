import { BoundMethod } from "decorate";
import { Provide } from "microdi";
import { DownloaderConfiguration } from "services/DownloaderConfiguration.ts";

@Provide(DownloaderConfiguration)
export class YoutubeVideoNameResolver {
  private static readonly enAlphaLower = "abcdefghijklmnopqrstuvwxyz";
  private static readonly enAlpha = new Set(
    Array.from(
      YoutubeVideoNameResolver.enAlphaLower.concat(
        YoutubeVideoNameResolver.enAlphaLower.toLocaleUpperCase()
      )
    )
  );
  private static readonly ruAlphaLower = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  private static readonly ruAlpha = new Set(
    Array.from(
      YoutubeVideoNameResolver.ruAlphaLower.concat(
        YoutubeVideoNameResolver.ruAlphaLower.toLocaleUpperCase()
      )
    )
  );
  private static readonly numbers = new Set(Array.from("0123456789"));
  private static readonly specialChars = new Set([" ,.!?"]);
  private static allowedChars = new Set([
    ...YoutubeVideoNameResolver.enAlpha,
    ...YoutubeVideoNameResolver.ruAlpha,
    ...YoutubeVideoNameResolver.numbers,
    ...YoutubeVideoNameResolver.specialChars,
  ]);

  public constructor(
    private readonly downloaderConfiguration: DownloaderConfiguration
  ) {}

  private async downloadWithNoProxy(url: string): Promise<string | null> {
    const command = new Deno.Command("yt-dlp", {
      args: this.getArgs(url),
    });
    try {
      const { success, stdout } = await command.output();
      return success ? new TextDecoder().decode(stdout) : null;
    } catch {
      return null;
    }
  }

  private async downloadWithProxy(
    url: string,
    proxyUrl: string
  ): Promise<string | null> {
    const command = new Deno.Command("yt-dlp", {
      args: this.getArgs(url, proxyUrl),
    });
    try {
      const { success, stdout } = await command.output();
      return success ? new TextDecoder().decode(stdout) : null;
    } catch {
      return null;
    }
  }

  private getArgs(url: string, proxyUrl?: string) {
    return ["--get-title", ...(proxyUrl ? ["--proxy", proxyUrl] : []), url];
  }

  private cleanFileName(rawFileName: string): string {
    return Array.from(rawFileName)
      .filter((char) => YoutubeVideoNameResolver.allowedChars.has(char))
      .join("");
  }

  /**
   * Get file filesystem-friendly file name with '.mp3' extension
   * @param youtubeUrl Youtube video URL
   * @returns name or null if can't get it
   */
  @BoundMethod
  public async resolve(youtubeUrl: string): Promise<string | null> {
    let fileName: string | null = null;
    try {
      fileName = await this.downloadWithNoProxy(youtubeUrl);
    } catch {
      // skip, try with proxy further
    }
    if (!fileName && this.downloaderConfiguration.proxyUrl) {
      fileName = await this.downloadWithProxy(
        youtubeUrl,
        this.downloaderConfiguration.proxyUrl
      );
    }
    const cleanFileName = fileName ? this.cleanFileName(fileName.trim()) : null;
    return cleanFileName ? `${cleanFileName}.mp3` : null;
  }
}
