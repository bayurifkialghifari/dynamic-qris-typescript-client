import type {
  ProviderSelector,
  RequestOptions,
  TokenStatusResult,
  TokenUpdate,
  UpdateTokenRequest,
} from "../types";
import type { Transport } from "../transport";
import { provider, textValue } from "../validation";

export class TokenModule {
  constructor(private readonly transport: Transport) {}
  status(
    query: { provider?: ProviderSelector } = {},
    options?: RequestOptions,
  ): Promise<TokenStatusResult> {
    provider(query.provider);
    return this.transport.request(
      "GET",
      "/token-status",
      query,
      options,
      "status",
    );
  }
  update(
    input: UpdateTokenRequest,
    options?: RequestOptions,
  ): Promise<TokenUpdate> {
    textValue(input.token, "token");
    provider(input.provider, true);
    return this.transport.request("POST", "/update-token", input, options);
  }
}
