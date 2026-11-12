import type {
  CheckPaymentRequest,
  PaymentResult,
  RequestOptions,
} from "../types";
import type { Transport } from "../transport";
import { validatePayment } from "../validation";

export class PaymentModule {
  constructor(private readonly transport: Transport) {}
  check(
    input: CheckPaymentRequest,
    options: RequestOptions = {},
  ): Promise<PaymentResult> {
    validatePayment(input);
    const minimumTimeout =
      ((input.timeout ?? 120) + (input.polling_interval ?? 3) + 15) * 1000;
    const resolved =
      input.wait && options.timeoutMs === undefined
        ? {
            ...options,
            timeoutMs: Math.max(this.transport.timeoutMs, minimumTimeout),
          }
        : options;
    return this.transport.request(
      "POST",
      "/v1/payment/check",
      input,
      resolved,
      "envelope",
    );
  }
}
