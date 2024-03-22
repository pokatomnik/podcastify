import { Provide } from "microdi";
import { BoundMethod, Retry } from "decorate";

@Provide()
export class UploaderFileDoge implements Uploader {
  public readonly maxUploadSizeInBytes = 200 * 1024 * 1024;

  private readonly url = "https://api.filedoge.com/upload";

  @Retry(3)
  private async postFile(formData: FormData) {
    const response = await fetch(this.url, {
      method: "POST",
      body: formData,
    });
    if (response.ok) {
      const jsonResponse: DogeUploadResponse = await response.json();
      if (jsonResponse?.token) {
        return `https://api.filedoge.com/download/${jsonResponse.token}`;
      } else {
        throw new Error("Incorrect response");
      }
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
    const file = new File([blob], "podcast.mp3");
    const formData = new FormData();
    formData.append("file", file);
    try {
      return this.postFile(formData);
    } catch {
      return null;
    }
  }
}

interface DogeUploadResponse {
  readonly token: string;
  readonly name: string;
  readonly size: number;
  readonly originalFilename: string;
  readonly createdAt: string;
  readonly mimeType: string;
  readonly deleteToken: string;
}
