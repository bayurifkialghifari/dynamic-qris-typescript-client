import type { ClientOptions } from "./types";
import { Transport } from "./transport";
import { AccountModule } from "./modules/account";
import { TransactionModule } from "./modules/transaction";
import { QrisModule } from "./modules/qris";
import { PaymentModule } from "./modules/payment";
import { TransactionsModule } from "./modules/transactions";
import { TokenModule } from "./modules/token";
import { SystemModule } from "./modules/system";
import { WebhookModule, Webhook } from "./modules/webhook";

export class DynamicQrisClient {
  readonly account: AccountModule;
  readonly transaction: TransactionModule;
  readonly qris: QrisModule;
  readonly payment: PaymentModule;
  readonly transactions: TransactionsModule;
  readonly token: TokenModule;
  readonly system: SystemModule;
  readonly webhook: WebhookModule;

  constructor(options: ClientOptions) {
    const transport = new Transport(options);
    this.account = new AccountModule(transport);
    this.transaction = new TransactionModule(transport);
    this.qris = new QrisModule(transport);
    this.payment = new PaymentModule(transport);
    this.transactions = new TransactionsModule(transport);
    this.token = new TokenModule(transport);
    this.system = new SystemModule(transport);
    this.webhook = new WebhookModule();
  }
}
export * from "./types";
export * from "./errors";
export {
  AccountModule,
  TransactionModule,
  QrisModule,
  PaymentModule,
  TransactionsModule,
  TokenModule,
  SystemModule,
  WebhookModule,
  Webhook,
};
