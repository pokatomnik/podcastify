import * as path from "path";
import { BoundMethod, type Nullable } from "decorate";
import { Provide } from "microdi";
import { WorkerPool } from "services/WorkerPool.ts";
import { DownloaderConfiguration } from "services/DownloaderConfiguration.ts";
import { duration } from "@dbushell/audio-duration";

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

@Provide(WorkerPool, DownloaderConfiguration)
export class Downloader {
  public constructor(
    private readonly workerPool: WorkerPool,
    private readonly downloaderConfiguration: DownloaderConfiguration
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
    const command = new Deno.Command("yt-dlp", {
      args: this.getArgs(uuid, url),
    });
    try {
      const { success } = await command.output();
      return success ? uuid : null;
    } catch {
      return null;
    }
  }

  private async downloadWithProxy(
    url: string,
    proxyUrl: string
  ): Promise<string | null> {
    const uuid = crypto.randomUUID();
    const command = new Deno.Command("yt-dlp", {
      args: this.getArgs(uuid, url, proxyUrl),
    });
    try {
      const { success } = await command.output();
      return success ? uuid : null;
    } catch {
      return null;
    }
  }

  private async deleteFile(path: string): Promise<void> {
    try {
      await Deno.remove(path);
    } catch {
      // do nothing
    }
  }

  private async getDurationMsOrNull(path: string) {
    try {
      return await duration(path);
    } catch {
      return null;
    }
  }

  @BoundMethod
  public async submitDownloadTaskAndGetResult(
    url: string
  ): Promise<DownloadResultError | DownloadResultOK> {
    let uuid: string | null = null;

    uuid = await this.workerPool.submitTaskAndGetResult(() => {
      return this.downloadWithNoProxy(url);
    });

    const proxyUrl = this.downloaderConfiguration.proxyUrl;
    if (!uuid && proxyUrl) {
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
