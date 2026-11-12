import type {
  CheckPaymentRequest,
  CreateQrisRequest,
  TransactionsQuery,
} from "./types";

export function textValue(
  value: unknown,
  name: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim())
    throw new TypeError(name + " must be a non-empty string");
}
export function integer(
  value: unknown,
  name: string,
  max = Number.MAX_SAFE_INTEGER,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > max
  ) {
    throw new TypeError(name + " must be a positive safe integer up to " + max);
  }
}
export function provider(value: unknown, shopeeOnly = false): void {
  if (value === undefined) return;
  if (
    typeof value !== "string" ||
    !/^(shopee|gopay)(:[a-z0-9_-]{1,64})?$/.test(value)
  ) {
    throw new TypeError("provider must be shopee, gopay, or kind:label");
  }
  if (shopeeOnly && !value.startsWith("shopee"))
    throw new TypeError("Token updates only support ShopeePay");
}
export function validateCreate(input: CreateQrisRequest): void {
  integer(input.amount, "amount");
  provider(input.provider);
}
export function validatePayment(input: CheckPaymentRequest): void {
  textValue(input.token, "token");
  provider(input.provider);
  if (input.startTime !== undefined) integer(input.startTime, "startTime");
  if (input.wait !== undefined && typeof input.wait !== "boolean")
    throw new TypeError("wait must be a boolean");
  if (input.timeout !== undefined) integer(input.timeout, "timeout", 300);
  if (input.polling_interval !== undefined) {
    integer(input.polling_interval, "polling_interval", 300);
    if (input.polling_interval < 2)
      throw new TypeError("polling_interval must be at least 2 seconds");
  }
}
export function validateTransactions(input: TransactionsQuery): void {
  provider(input.provider);
  if (input.startTime !== undefined) integer(input.startTime, "startTime");
  if (input.endTime !== undefined) integer(input.endTime, "endTime");
  if (input.page_size !== undefined) integer(input.page_size, "page_size", 100);
  if (
    input.startTime !== undefined &&
    input.endTime !== undefined &&
    input.startTime > input.endTime
  ) {
    throw new TypeError("startTime must not exceed endTime");
  }
}
