import { BoundMethod } from "decorate";
import { Provide } from "microdi";
import { WorkerPool } from "services/WorkerPool.ts";

interface DownloadResultError {
  readonly filePath: null;
  deleteFile(): Promise<void>;
}

interface DownloadResultOK {
  readonly filePath: string;
  deleteFile(): Promise<void>;
}

@Provide(WorkerPool)
export class Downloader {
  public constructor(private readonly workerPool: WorkerPool) {}

  private getFileName(uuid: string): string {
    return `${uuid}.mp3`;
  }

  private getArgs(uuid: string, url: string) {
    const fileName = this.getFileName(uuid);
    return ["-x", "--audio-format", "mp3", "--output", `/tmp/${fileName}`, url];
  }

  private async download(url: string): Promise<string | null> {
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

  private async deleteFile(path: string): Promise<void> {
    try {
      await Deno.remove(path);
    } catch {
      // do nothing
    }
  }

  @BoundMethod
  public async submitDownloadTaskAndGetResult(
    url: string
  ): Promise<DownloadResultError | DownloadResultOK> {
    const uuid = await this.workerPool.submitTaskAndGetResult(() => {
      return this.download(url);
    });
    if (uuid) {
      const filePath = `/tmp/${this.getFileName(uuid)}`;
      return {
        filePath,
        deleteFile: () => this.deleteFile(filePath),
      };
    }
    return {
      filePath: null,
      deleteFile: () => Promise.resolve(),
    };
  }
}
