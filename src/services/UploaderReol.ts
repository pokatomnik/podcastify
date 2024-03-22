import { Provide } from "microdi";
import { TransferSH } from "services/UploaderTransferSH.ts";

@Provide()
export class UploaderReol extends TransferSH {
  public override readonly maxUploadSizeInBytes = 10 * 1024 * 1024 * 1024;
  public override readonly origin = "https://files.reol.com";
}
