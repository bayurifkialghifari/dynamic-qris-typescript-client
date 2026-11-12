import type { CreateQrisRequest, Qris, RequestOptions } from "../types";
import type { Transport } from "../transport";
import { integer, textValue, validateCreate } from "../validation";

export class QrisModule {
  constructor(private readonly transport: Transport) {}
  create(input: CreateQrisRequest, options?: RequestOptions): Promise<Qris> {
    validateCreate(input);
    return this.transport.request("POST", "/v1/qris/create", input, options);
  }
  url(id: string | number): string {
    if (typeof id === "number") integer(id, "id");
    else textValue(id, "id");
    return this.transport
      .url("/qr/" + encodeURIComponent(String(id)))
      .toString();
  }
  raw(id: string | number, options?: RequestOptions): Promise<string> {
    this.url(id);
    return this.transport.request(
      "GET",
      "/qr/" + encodeURIComponent(String(id)),
      { format: "raw" },
      options,
      "text",
      false,
    );
  }
  image(id: string | number, options?: RequestOptions): Promise<Uint8Array> {
    this.url(id);
    return this.transport.request(
      "GET",
      "/qr/" + encodeURIComponent(String(id)),
      {},
      options,
      "binary",
      false,
    );
  }
}
