//bashupload.com/X-U7k/JEQMR.mp3?download=1
import { Provide } from "microdi";
import { BoundMethod, Retry } from "decorate";
import { find } from "linkifyjs";

@Provide()
export class UploaderBashupload implements Uploader {
  public readonly maxUploadSizeInBytes = 50 * 1024 * 1024 * 1024;

  private readonly url = "https://bashupload.com";

  @Retry(3)
  private async postFile(file: File, fileName: string) {
    const response = await fetch(`${this.url}/${fileName}`, {
      method: "PUT",
      body: file,
    });
    if (response.ok) {
      const responseText = await response.text();
      if (!responseText) {
        throw new Error("Incorrect response");
      }
      const links = find(responseText);
      const [link] = links.filter(({ isLink }) => isLink);
      if (!link) {
        throw new Error("No links found");
      }
      return `${link.href}?download=1`;
    } else {
      throw new Error("Failed to upload");
    }
  }

  @BoundMethod
  public async upload(filePath: string): Promise<string | null> {
    const fileName = filePath.split("/").pop() ?? "podcast.mp3";
    let fileBytes: Uint8Array | null = null;
    try {
      fileBytes = await Deno.readFile(filePath);
    } catch {
      return null;
    }
    const file = new File([new Blob([fileBytes])], "podcast.mp3");
    try {
      return this.postFile(file, fileName);
    } catch {
      return null;
    }
  }
}
