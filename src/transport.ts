import { DynamicQrisError, DynamicQrisTransportError } from "./errors";
import type { ClientOptions, RequestOptions } from "./types";
import { integer, textValue } from "./validation";

type Envelope = Record<string, unknown> & { success: boolean };
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class Transport {
  private readonly base: URL;
  private readonly fetcher: typeof globalThis.fetch;
  readonly timeoutMs: number;

  constructor(private readonly config: ClientOptions) {
    this.base = new URL(
      config.baseUrl.endsWith("/") ? config.baseUrl : config.baseUrl + "/",
    );
    if (
      !["https:", "http:"].includes(this.base.protocol) ||
      this.base.username ||
      this.base.password ||
      this.base.search ||
      this.base.hash
    ) {
      throw new TypeError(
        "baseUrl must be an HTTP(S) URL without credentials, query, or fragment",
      );
    }
    this.timeoutMs = config.timeoutMs ?? 30_000;
    integer(this.timeoutMs, "timeoutMs", 2_147_483_647);
    this.fetcher = config.fetch ?? globalThis.fetch;
    if (typeof this.fetcher !== "function")
      throw new TypeError("A fetch implementation is required");
  }

  url(path: string): URL {
    return new URL(path.replace(/^\/+/, ""), this.base);
  }

  async request<T>(
    method: "GET" | "POST",
    path: string,
    data: object = {},
    options: RequestOptions = {},
    mode: "data" | "envelope" | "status" | "text" | "binary" = "data",
    authenticated = true,
  ): Promise<T> {
    const headers = new Headers({
      Accept:
        mode === "binary"
          ? "image/png"
          : mode === "text"
            ? "text/plain"
            : "application/json",
    });
    if (authenticated) {
      const key = options.apiKey ?? this.config.apiKey;
      textValue(key, "apiKey");
      headers.set("x-api-key", key);
    }
    if (options.idempotencyKey !== undefined) {
      textValue(options.idempotencyKey, "idempotencyKey");
      if (
        options.idempotencyKey.length > 128 ||
        /[^\x21-\x7e]/.test(options.idempotencyKey)
      )
        throw new TypeError(
          "idempotencyKey must be 1–128 printable ASCII characters without spaces",
        );
      headers.set("Idempotency-Key", options.idempotencyKey);
    }
    if (options.shopeeToken !== undefined) {
      textValue(options.shopeeToken, "shopeeToken");
      headers.set("x-shopee-token", options.shopeeToken);
    }
    const url = this.url(path);
    const timeoutMs = options.timeoutMs ?? this.timeoutMs;
    integer(timeoutMs, "timeoutMs", 2_147_483_647);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([controller.signal, options.signal])
      : controller.signal;
    const init: RequestInit = { method, headers, signal, redirect: "error" };
    if (method === "GET") {
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null)
          url.searchParams.set(key, String(value));
      }
    } else {
      headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(data);
    }
    try {
      const response = await this.fetcher(url, init);
      if (response.ok && mode === "binary")
        return new Uint8Array(await response.arrayBuffer()) as T;
      const raw = await response.text();
      if (response.ok && mode === "text") return raw as T;
      let body: unknown;
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
      if (!response.ok) {
        const message =
          isObject(body) && typeof body.error === "string"
            ? body.error
            : "Gateway returned HTTP " + response.status;
        throw new DynamicQrisError(message, response.status, body);
      }
      if (!isObject(body) || typeof body.success !== "boolean")
        throw new DynamicQrisError(
          "Invalid gateway response envelope",
          response.status,
          body,
        );
      const envelope = body as Envelope;
      if (!envelope.success && mode !== "status") {
        throw new DynamicQrisError(
          typeof envelope.error === "string"
            ? envelope.error
            : "Gateway request failed",
          response.status,
          body,
        );
      }
      if (mode === "data") {
        if (!isObject(envelope.data))
          throw new DynamicQrisError(
            "Gateway response is missing data",
            response.status,
            body,
          );
        return envelope.data as T;
      }
      if (
        mode === "status" &&
        (!isObject(envelope.data) ||
          !["not_set", "valid", "invalid"].includes(
            String(envelope.data.token_status),
          ))
      ) {
        throw new DynamicQrisError(
          "Invalid token status response",
          response.status,
          body,
        );
      }
      return envelope as T;
    } catch (error) {
      if (error instanceof DynamicQrisError) throw error;
      throw new DynamicQrisTransportError(
        options.signal?.aborted
          ? "Request cancelled"
          : controller.signal.aborted
            ? "Request timed out"
            : "Unable to reach the QRIS gateway",
        error,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
