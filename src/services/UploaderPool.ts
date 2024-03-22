import { Provide } from "microdi";
import { Uploader0x0 } from "services/Uploader0x0.ts";
import { UploaderFileDoge } from "services/UploaderFileDoge.ts";
import { UploaderLibriciel } from "services/UploaderLibriciel.ts";
import { UploaderBashupload } from "services/UploaderBashUpload.ts";
import { UploaderTarrHU } from "services/UploaderTarrHU.ts";
import { UploaderChTools } from "services/UploaderChTools.ts";
import { BoundMethod, MemoizedGetter } from "decorate";

@Provide(
  Uploader0x0,
  UploaderFileDoge,
  UploaderLibriciel,
  UploaderBashupload,
  UploaderTarrHU,
  UploaderChTools
)
export class UploaderPool implements Uploader {
  private readonly uploaders: ReadonlyArray<Uploader>;

  public constructor(
    uploader0x0: Uploader,
    uploaderFileDoge: Uploader,
    uploaderLibriciel: Uploader,
    uploaderBashupload: Uploader,
    uploaderTarrHU: Uploader,
    uploaderChTools: Uploader
  ) {
    this.uploaders = [
      uploaderBashupload,
      uploaderFileDoge,
      uploader0x0,
      uploaderLibriciel,
      uploaderTarrHU,
      uploaderChTools,
    ];
  }

  @BoundMethod
  public async upload(
    filePath: string,
    fileSizeInBytes: number
  ): Promise<string | null> {
    const availableUploaders = this.uploaders.filter((currentUploader) => {
      return currentUploader.maxUploadSizeInBytes >= fileSizeInBytes;
    });
    const availableUploaderShuffled = availableUploaders.toSorted(() => {
      return Math.random() - 0.5;
    });
    if (availableUploaderShuffled.length === 0) {
      return null;
    }
    for (const uploader of availableUploaderShuffled) {
      const fileURL = await uploader.upload(filePath, fileSizeInBytes);
      if (fileURL !== null) {
        return fileURL;
      }
    }
    return null;
  }

  @MemoizedGetter()
  public get maxUploadSizeInBytes() {
    let maxUploadSizeInBytes = 0;
    for (const uploader of this.uploaders) {
      maxUploadSizeInBytes = Math.max(
        maxUploadSizeInBytes,
        uploader.maxUploadSizeInBytes
      );
    }
    return maxUploadSizeInBytes;
  }
}
