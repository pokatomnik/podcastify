import * as path from "path";
import { BoundMethod, type Nullable } from "decorate";
import { Provide } from "microdi";
import { WorkerPool } from "services/WorkerPool.ts";
import { DownloaderConfiguration } from "services/DownloaderConfiguration.ts";
import { duration } from "@dbushell/audio-duration";
import { ConsoleLogger } from "services/ConsoleLogger.ts";
import { Logger } from "services/Logger.ts";

interface DownloadResultError {
  readonly filePath: null;
  readonly durationMs: null;
  deleteFile(): Promise<void>;
}

interface DownloadResultOK {
  readonly filePath: string;
  readonly durationMs: Nullable<number>;
  deleteFile(): Promise<void>;
}

@Provide(WorkerPool, DownloaderConfiguration, ConsoleLogger)
export class Downloader {
  public constructor(
    private readonly workerPool: WorkerPool,
    private readonly downloaderConfiguration: DownloaderConfiguration,
    private readonly logger: Logger
  ) {}

  private getFileName(uuid: string): string {
    return `${uuid}.mp3`;
  }

  private getOSTempDir() {
    return (
      Deno.env.get("TMPDIR") ||
      Deno.env.get("TMP") ||
      Deno.env.get("TEMP") ||
      "/tmp"
    );
  }

  private getTempFilePath(tempFilename: string) {
    return path.join(this.getOSTempDir(), tempFilename);
  }

  private getArgs(uuid: string, url: string, proxyUrl?: string) {
    const fileName = this.getFileName(uuid);
    return [
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "96K",
      ...(proxyUrl ? ["--proxy", proxyUrl] : []),
      "--output",
      this.getTempFilePath(fileName),
      url,
    ];
  }

  private async downloadWithNoProxy(url: string): Promise<string | null> {
    const uuid = crypto.randomUUID();
    const args = this.getArgs(uuid, url);
    this.logger.info(`Running yt-dlp with args: ${args.join(" ")}`);
    const command = new Deno.Command("yt-dlp", { args });
    try {
      const { success, stderr } = await command.output();

      if (!success) {
        const errorText = new TextDecoder().decode(stderr);
        this.logger.error(
          `Failed to download video (without proxy) with url: "${url}"`
        );
        this.logger.error(errorText);
      }

      return success ? uuid : null;
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error");
      this.logger.error(
        `Failed to download video (without proxy) with url: "${url}`
      );
      this.logger.error(error.message);
      return null;
    }
  }

  private async downloadWithProxy(
    url: string,
    proxyUrl: string
  ): Promise<string | null> {
    const uuid = crypto.randomUUID();
    const args = this.getArgs(uuid, url, proxyUrl);
    this.logger.info(`Running yt-dlp with args: ${args.join(" ")}`);
    const command = new Deno.Command("yt-dlp", { args });
    try {
      const { success, stderr } = await command.output();

      if (!success) {
        const errorText = new TextDecoder().decode(stderr);
        this.logger.error(
          `Failed to download video (with proxy) with url: "${url}"`
        );
        this.logger.error(errorText);
      }

      return success ? uuid : null;
    } catch (e) {
      const error = e instanceof Error ? e : new Error("Unknown error");
      this.logger.error(
        `Failed to download video (with proxy) with url: "${url}"`
      );
      this.logger.error(error.message);
      return null;
    }
  }

  private async deleteFile(path: string): Promise<void> {
    try {
      await Deno.remove(path);
    } catch {
      this.logger.error(`Failed to remove file "${path}"`);
    }
  }

  private async getDurationMsOrNull(path: string) {
    try {
      return await duration(path);
    } catch {
      this.logger.error(`Failed to find out audio duration for file "${path}"`);
      return null;
    }
  }

  @BoundMethod
  public async submitDownloadTaskAndGetResult(
    url: string
  ): Promise<DownloadResultError | DownloadResultOK> {
    let uuid: string | null = null;

    this.logger.info(`Trying to download video without proxy: "${url}"`);
    uuid = await this.workerPool.submitTaskAndGetResult(() => {
      return this.downloadWithNoProxy(url);
    });

    const proxyUrl = this.downloaderConfiguration.proxyUrl;
    if (!uuid && proxyUrl) {
      this.logger.info(`Trying to download video with proxy: "${url}"`);
      uuid = await this.workerPool.submitTaskAndGetResult(() => {
        return this.downloadWithProxy(url, proxyUrl);
      });
    }

    if (uuid) {
      const filePath = this.getTempFilePath(this.getFileName(uuid));
      const durationMs = await this.getDurationMsOrNull(filePath);
      return {
        filePath,
        durationMs,
        deleteFile: () => this.deleteFile(filePath),
      };
    }
    return {
      filePath: null,
      durationMs: null,
      deleteFile: () => Promise.resolve(),
    };
  }
}
