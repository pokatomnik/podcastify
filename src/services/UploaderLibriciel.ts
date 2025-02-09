import { Provide } from "microdi";
import { TransferSH } from "services/UploaderTransferSH.ts";

@Provide()
export class UploaderLibriciel extends TransferSH {
  public override readonly maxUploadSizeInBytes = 1024 * 1024 * 1024;
  public override readonly origin = "https://curl.libriciel.fr";
}
