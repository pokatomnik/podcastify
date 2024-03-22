import { Provide } from "microdi";
import { BoundMethod, Retry } from "decorate";

@Provide()
export class Uploader0x0 implements Uploader {
  public readonly maxUploadSizeInBytes = 512 * 1024 * 1024;

  private readonly url = "https://0x0.st";

  @Retry(3)
  private async postFile(formData: FormData) {
    const response = await fetch(this.url, {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      return await response.text();
    } else {
      throw new Error("Failed to upload");
    }
  }

  @BoundMethod
  public async upload(filePath: string): Promise<string | null> {
    let fileBytes: Uint8Array | null = null;
    try {
      fileBytes = await Deno.readFile(filePath);
    } catch {
      return null;
    }
    const blob = new Blob([fileBytes]);
    const formData = new FormData();
    formData.append("file", blob);
    try {
      return this.postFile(formData);
    } catch {
      return null;
    }
  }
}
