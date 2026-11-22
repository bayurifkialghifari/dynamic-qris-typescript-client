# Changelog

## 0.3.0

- Add `POST /v1/transaction` support via `TransactionModule` (`client.transaction.create()` and `client.transactions.create()`).
- Add `CreateTransactionRequest` and `CreatedTransaction` types supporting QRIS and Bank Transfer payments (including bank account fields: `bank_name`, `bank_logo`, `account_number`, `account_holder_name`, and `payment_type`).
- Support `bank_transfer` provider type (e.g. `bank_transfer:bca-utama`) in provider validation.
- Deprecate `POST /v1/qris/create` (`client.qris.create()`) as legacy with runtime `console.warn` and `@deprecated` annotation while maintaining full backward compatibility.
- Update documentation and examples to use `transaction.create()`.

## 0.2.1

- Align `CreateQrisRequest` and `Qris` types strictly with gateway OpenAPI specification.
- Release version bump.

## 0.2.0

- Add `WebhookModule` and `Webhook` utility for verifying HMAC-SHA256 signatures (`x-karuhun-signature`), parsing typed events (`constructEvent`), and checking idempotency keys (`verifyDelivery`).
- Add `WebhookSignatureVerificationError` error class.
- Support `custom` provider accounts (e.g. `custom:dana-1`, `custom:bca-bisnis`) alongside ShopeePay and GoPay.
- Support `POST /v1/qris/create` fields: `amount`, `provider`, `description`, `products` (items with `name`, `price`, `qty`), and `callback_url`.
- Add `payment_link`, `callback_url`, `description`, and `products` to `Qris` response interface.

## 0.1.1

- Point checkout examples to the Karuhun QRIS service.
- Add website and Telegram registration links, registry installation instructions, and version/download badges.
- Document standalone SDK development and publishing.

## 0.1.0

- Initial modular SDK for account, QRIS, payments, transactions, provider credentials, and gateway probes.
- Per-request authentication overrides, idempotency headers, raw/PNG QR downloads, and long-poll timeout handling.
- Typed requests/responses, mocked contract tests, examples, documentation, and CI.
