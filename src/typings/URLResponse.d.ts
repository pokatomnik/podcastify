declare interface URLResponseUknown {
  readonly type: "UNKNOWN";
  readonly url: URL;
  readonly message: string;
}

declare interface URLResponseValid {
  readonly type: "DOWNLOADABLE";
  readonly url: URL;
  readonly message: null;
}

declare type URLResponse = URLResponseUknown | URLResponseValid;
