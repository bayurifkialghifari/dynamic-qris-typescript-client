import type {
  CreateTransactionRequest,
  CreatedTransaction,
  RequestOptions,
} from "../types";
import type { Transport } from "../transport";
import { validateTransactionCreate } from "../validation";

export class TransactionModule {
  constructor(private readonly transport: Transport) {}

  create(
    input: CreateTransactionRequest,
    options?: RequestOptions,
  ): Promise<CreatedTransaction> {
    validateTransactionCreate(input);
    return this.transport.request("POST", "/v1/transaction", input, options);
  }
}
