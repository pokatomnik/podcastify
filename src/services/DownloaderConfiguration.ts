import { Provide } from "microdi";

@Provide()
export class DownloaderConfiguration {
  public readonly proxyUrl: string | undefined;

  public constructor() {
    this.proxyUrl = Deno.env.get("PROXY_URL");
  }
}
