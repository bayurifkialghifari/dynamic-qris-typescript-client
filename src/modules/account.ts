import type { Account, RequestOptions } from "../types";
import type { Transport } from "../transport";

export class AccountModule {
  constructor(private readonly transport: Transport) {}
  get(options?: RequestOptions): Promise<Account> {
    return this.transport.request("GET", "/v1/account", {}, options);
  }
}
