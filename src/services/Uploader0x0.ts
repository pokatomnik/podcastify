import { Provide } from "microdi";

@Provide()
export class Uploader0x0 implements Uploader {
  private readonly url = "https://0x0.st";

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
      const response = await fetch(this.url, {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        return await response.text();
      } else {
        return null;
      }
    } catch {
      return null;
    }
  }
}
