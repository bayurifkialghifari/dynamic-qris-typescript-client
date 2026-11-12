import type { ClientOptions } from "./types";
import { Transport } from "./transport";
import { AccountModule } from "./modules/account";
import { QrisModule } from "./modules/qris";
import { PaymentModule } from "./modules/payment";
import { TransactionsModule } from "./modules/transactions";
import { TokenModule } from "./modules/token";
import { SystemModule } from "./modules/system";

export class DynamicQrisClient {
  readonly account: AccountModule;
  readonly qris: QrisModule;
  readonly payment: PaymentModule;
  readonly transactions: TransactionsModule;
  readonly token: TokenModule;
  readonly system: SystemModule;

  constructor(options: ClientOptions) {
    const transport = new Transport(options);
    this.account = new AccountModule(transport);
    this.qris = new QrisModule(transport);
    this.payment = new PaymentModule(transport);
    this.transactions = new TransactionsModule(transport);
    this.token = new TokenModule(transport);
    this.system = new SystemModule(transport);
  }
}
export * from "./types";
export * from "./errors";
export {
  AccountModule,
  QrisModule,
  PaymentModule,
  TransactionsModule,
  TokenModule,
  SystemModule,
};
