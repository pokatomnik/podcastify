import { LinkValidator } from "services/LinkValidator.ts";
import { LinksExtractor } from "services/LinksExtractor.ts";
import { assertEquals } from "testing";

Deno.test("LinksExtractor - one URL, without embracing text", () => {
  const text = `https://www.youtube.com/watch?v=yQebXIkBAws`;
  const urls = new LinksExtractor(new LinkValidator()).getUrlsFromText(text);
  assertEquals(urls.length, 1);
  assertEquals(urls[0]?.url.toString(), text);
});

Deno.test("LinksExtractor - one URL, with embracing text", () => {
  const text = `Here is the URL: https://www.youtube.com/watch?v=yQebXIkBAws, try parse It`;
  const urls = new LinksExtractor(new LinkValidator()).getUrlsFromText(text);
  assertEquals(urls.length, 1);
  assertEquals(
    urls[0]?.url.toString(),
    "https://www.youtube.com/watch?v=yQebXIkBAws"
  );
});

Deno.test("LinksExtractor - two URL, with embracing text", () => {
  const text = `Here is the URL: https://www.youtube.com/watch?v=yQebXIkBAws, try parse It, the second one is:
  https://www.youtube.com/watch?v=7HPitFccK10`;
  const urls = new LinksExtractor(new LinkValidator()).getUrlsFromText(text);
  assertEquals(urls.length, 2);
  assertEquals(
    urls[0]?.url.toString(),
    "https://www.youtube.com/watch?v=yQebXIkBAws"
  );
  assertEquals(
    urls[1]?.url.toString(),
    "https://www.youtube.com/watch?v=7HPitFccK10"
  );
});
