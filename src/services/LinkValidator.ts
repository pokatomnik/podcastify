import { BoundMethod } from "decorate";
import { Provide } from "microdi";

@Provide()
export class LinkValidator {
  private readonly rules: Map<string, ReadonlyArray<(url: URL) => boolean>> =
    new Map([
      [
        "youtube.com",
        [
          (url) => url.pathname === "/watch",
          (url) => url.searchParams.has("v"),
          (url) => url.searchParams.get("v") !== "",
        ],
      ],
      ["youtu.be", [(url) => url.pathname !== "/"]],
    ]);

  public constructor() {
    for (const [domain, rules] of Array.from(this.rules.entries())) {
      this.rules.set(`www.${domain}`, rules);
    }
  }

  @BoundMethod
  public getURLResponse(url: URL): URLResponse {
    const rules =
      this.rules.get(url.hostname) ??
      this.rules.get(`www.${url.hostname}`) ??
      null;
    if (rules === null) {
      return {
        type: "UNKNOWN",
        message: `Домен ${url.hostname} не похож ни на один из доменов Youtube.`,
        url,
      };
    }
    const validByRules = rules.every((currentRule) => {
      return currentRule(url);
    });
    if (validByRules) {
      return {
        type: "DOWNLOADABLE",
        message: null,
        url,
      };
    }
    return {
      type: "UNKNOWN",
      message: `Ссыллка ${url.toString()} пока что не поддерживается. Попробуйте скопировать прямую ссылку на Youtube видео`,
      url,
    };
  }
}
