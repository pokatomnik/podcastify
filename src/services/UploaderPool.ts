import { Provide } from "microdi";
import { Uploader0x0 } from "services/Uploader0x0.ts";

@Provide(Uploader0x0)
export class UploaderPool implements Uploader {
  private readonly uploaders: ReadonlyArray<Uploader>;

  public constructor(uploader0x0: Uploader) {
    this.uploaders = [uploader0x0];
  }

  public async upload(filePath: string): Promise<string | null> {
    for (const uploader of this.uploaders) {
      const fileURL = await uploader.upload(filePath);
      if (fileURL !== null) {
        return fileURL;
      }
    }
    return null;
  }
}
