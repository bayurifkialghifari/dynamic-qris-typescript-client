import type { Health, Readiness, RequestOptions } from "../types";
import type { Transport } from "../transport";

export class SystemModule {
  constructor(private readonly transport: Transport) {}
  health(options?: RequestOptions): Promise<Health> {
    return this.transport.request(
      "GET",
      "/api/health",
      {},
      options,
      "envelope",
      false,
    );
  }
  ready(options?: RequestOptions): Promise<Readiness> {
    return this.transport.request(
      "GET",
      "/api/ready",
      {},
      options,
      "envelope",
      false,
    );
  }
  logs(options?: RequestOptions): Promise<{ logs: unknown[] }> {
    return this.transport.request("GET", "/api/logs", {}, options);
  }
}
