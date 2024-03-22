import { Provide } from "microdi";
import { BoundMethod, Retry } from "decorate";

@Provide()
export class UploaderLibriciel implements Uploader {
  public readonly maxUploadSizeInBytes = 1024 * 1024 * 1024;

  private readonly url = "https://curl.libriciel.fr";

  @Retry(3)
  private async postFile(formData: FormData, fileName: string) {
    const response = await fetch(`${this.url}/${fileName}`, {
      method: "PUT",
      body: formData,
    });
    if (response.ok) {
      const downloadUrl = await response.text();
      return downloadUrl
        ? downloadUrl.replace(
            "https://curl.libriciel.fr",
            "https://curl.libriciel.fr/get"
          )
        : null;
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
