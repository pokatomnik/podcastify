import { Provide } from "microdi";
import { find } from "linkifyjs";
import { LinkValidator } from "services/LinkValidator.ts";
import { BoundMethod } from "decorate";

@Provide(LinkValidator)
export class LinksExtractor {
  public constructor(private readonly validator: LinkValidator) {}

  private getAllValidURLsFromText(text: string): ReadonlyArray<URL> {
    const urlsUnsafe = find(text).reduce((acc, { isLink, href }) => {
      return isLink ? acc.add(href) : acc;
    }, new Set<string>());
    return Array.from(urlsUnsafe).reduce((acc, urlUnsafe) => {
      try {
        const url = new URL(urlUnsafe);
        acc.push(url);
      } catch {
        return acc;
      }
      return acc;
    }, new Array<URL>());
  }

  @BoundMethod
  public getUrlsFromText(
    text: string
  ): ReadonlyArray<URLResponseUknown | URLResponseValid> {
    const validURLs = this.getAllValidURLsFromText(text);
    return Array.from(new Set(validURLs)).map((url) =>
      this.validator.getURLResponse(url)
    );
  }
}
