import { Provide } from "microdi";
import { TransferSH } from "services/UploaderTransferSH.ts";

@Provide()
export class UploaderSHub extends TransferSH {
  public override readonly maxUploadSizeInBytes = 512 * 1024 * 1024;
  public override readonly origin = "https://t.s-hub.xyz";
}
