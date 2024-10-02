import { BoundMethod } from "decorate";
import { Provide } from "microdi";

@Provide()
export class LinkValidator {
  private readonly rules: Map<string, ReadonlyArray<(url: URL) => boolean>> =
    new Map([
      /*
       * Надо обрабатывать следующие виды ссылок:
       * - [youtube.com/watch?v=VIDEO_ID]
       * - [m.youtube.com/watch?v=VIDEO_ID]
       * - [youtu.be/VIDEO_ID]
       */
      [
        "youtube.com",
        [
          (url) => url.pathname === "/watch",
          (url) => url.searchParams.has("v"),
          (url) => url.searchParams.get("v") !== "",
        ],
      ],
      [
        "m.youtube.com",
        [
          (url) => url.pathname === "/watch",
          (url) => url.searchParams.has("v"),
          (url) => url.searchParams.get("v") !== "",
        ],
      ],
      ["youtu.be", [(url) => url.pathname !== "/"]],
      /*
       * Надо обрабатывать следующие виды ссылок:
       * [vk.com/video-VIDEO_ID]
       * [m.vk.com/video-VIDEO_ID]
       * [m.vk.com/video/CATEGORY?z=video-VIDEO_ID%2ADDITIONAL_INFO]
       */
      ["vk.com", [(url) => url.pathname.startsWith("/video")]],
      ["m.vk.com", [(url) => url.pathname.startsWith("/video")]],
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
        message: `Домен ${url.hostname} не похож ни на один из доменов Youtube или Vkontakte.`,
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
      message: `Ссыллка ${url.toString()} пока что не поддерживается. Попробуйте скопировать прямую ссылку на Youtube или Vkontakte видео`,
      url,
    };
  }
}
