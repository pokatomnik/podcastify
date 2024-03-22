import { Provide } from "microdi";
import { TransferSH } from "services/UploaderTransferSH.ts";

@Provide()
export class UploaderTarrHU extends TransferSH {
  public override readonly maxUploadSizeInBytes = 1024 * 1024 * 1024;
  public override readonly origin = "https://big.tarr.hu";
}
