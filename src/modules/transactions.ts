import type {
  AllTransactionsResult,
  ProviderSelector,
  RequestOptions,
  TransactionsQuery,
  TransactionsResult,
} from "../types";
import type { Transport } from "../transport";
import { provider, validateTransactions } from "../validation";

export class TransactionsModule {
  constructor(private readonly transport: Transport) {}
  list(
    query: TransactionsQuery = {},
    options?: RequestOptions,
  ): Promise<TransactionsResult> {
    validateTransactions(query);
    return this.transport.request(
      "GET",
      "/transactions",
      query,
      options,
      "envelope",
    );
  }
  /** The gateway's current-month history, evaluated in WIB. */
  all(
    query: { provider?: ProviderSelector } = {},
    options?: RequestOptions,
  ): Promise<AllTransactionsResult> {
    provider(query.provider);
    return this.transport.request(
      "GET",
      "/transactions/all",
      query,
      options,
      "envelope",
    );
  }
}
