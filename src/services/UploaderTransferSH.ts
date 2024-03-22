import { BoundMethod, Retry } from "decorate";

export abstract class TransferSH implements Uploader {
  public abstract readonly maxUploadSizeInBytes: number;

  /**
   * Example: "https://curl.libriciel.fr"
   */
  protected abstract readonly origin: string;

  @Retry(3)
  private async postFile(formData: FormData, fileName: string) {
    const response = await fetch(`${this.origin}/${fileName}`, {
      method: "PUT",
      body: formData,
    });
    if (response.ok) {
      const downloadUrlText = await response.text();
      if (!downloadUrlText) {
        throw new Error("Incorrect response");
      }
      const url = new URL(downloadUrlText);
      url.protocol = "https://";
      url.pathname = `/get${url.pathname}`;
      return url.toString();
    } else {
      throw new Error("Failed to upload");
    }
  }

  @BoundMethod
  public async upload(filePath: string): Promise<string | null> {
    const fileName = filePath.split("/").pop() ?? `${crypto.randomUUID()}.mp3`;
    let fileBytes: Uint8Array | null = null;
    try {
      fileBytes = await Deno.readFile(filePath);
    } catch {
      return null;
    }
    const blob = new Blob([fileBytes]);
    const file = new File([blob], "podcast.mp3");
    const formData = new FormData();
    formData.append("file", file);
    try {
      return this.postFile(formData, fileName);
    } catch {
      return null;
    }
  }
}
