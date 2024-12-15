import { Provide } from "microdi";
import { Uploader0x0 } from "services/Uploader0x0.ts";
import { UploaderFileDoge } from "services/UploaderFileDoge.ts";
import { UploaderLibriciel } from "services/UploaderLibriciel.ts";
import { UploaderBashupload } from "services/UploaderBashUpload.ts";
import { UploaderTarrHU } from "services/UploaderTarrHU.ts";
import { UploaderChTools } from "services/UploaderChTools.ts";
import { UploaderReol } from "services/UploaderReol.ts";
import { UploaderSHub } from "services/UploaderSHub.ts";
import { UploaderGBX } from "services/UploaderGBX.ts";
import { UploaderInternMB } from "services/UploaderInternMB.ts";
import { UploaderAmbrosus } from "services/UploaderAmbrosus.ts";
import { UploaderDov } from "services/UploaderDov.ts";
import { UploaderKuwaitnet } from "services/UploaderKuwaitnet.ts";
import { BoundMethod, MemoizedGetter } from "decorate";
import { ConsoleLogger } from "services/ConsoleLogger.ts";
import { Logger } from "services/Logger.ts";

@Provide(
  ConsoleLogger,
  Uploader0x0,
  UploaderFileDoge,
  UploaderLibriciel,
  UploaderBashupload,
  UploaderTarrHU,
  UploaderChTools,
  UploaderReol,
  UploaderSHub,
  UploaderGBX,
  UploaderInternMB,
  UploaderAmbrosus,
  UploaderDov,
  UploaderKuwaitnet
)
export class UploaderPool implements Uploader {
  private readonly uploaders: ReadonlyArray<Uploader>;

  public constructor(
    private readonly logger: Logger,
    uploader0x0: Uploader,
    uploaderFileDoge: Uploader,
    uploaderLibriciel: Uploader,
    uploaderBashupload: Uploader,
    uploaderTarrHU: Uploader,
    uploaderChTools: Uploader,
    uploaderReol: Uploader,
    uploaderSHub: Uploader,
    uploaderGBX: Uploader,
    uploaderInternMB: Uploader,
    uploaderAmbrosus: Uploader,
    uploaderDov: Uploader,
    uploaderKuwaitnet: Uploader
  ) {
    this.uploaders = [
      uploaderBashupload,
      uploaderFileDoge,
      uploader0x0,
      uploaderLibriciel,
      uploaderTarrHU,
      uploaderChTools,
      uploaderReol,
      uploaderSHub,
      uploaderGBX,
      uploaderInternMB,
      uploaderAmbrosus,
      uploaderDov,
      uploaderKuwaitnet,
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
      this.logger.error(`No uploaders support fileSize ${fileSizeInBytes}b`);
      return null;
    }
    for (const uploader of availableUploaderShuffled) {
      this.logger.info(`Selected uploader: "${uploader}"`);
      const fileURL = await uploader.upload(filePath, fileSizeInBytes);
      if (fileURL !== null) {
        this.logger.info(
          `Selected uploader has successfully uploaded "${filePath}" with size ${fileSizeInBytes}b`
        );
        return fileURL;
      } else {
        this.logger.warn(
          `Selected uploader can not upload "${filePath}" with size ${fileSizeInBytes}b`
        );
      }
    }
    this.logger.warn(
      `No uploaders succeeded with file "${filePath}" with size ${fileSizeInBytes}b`
    );
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
