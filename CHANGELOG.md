# Changelog

## 0.2.0

- Add `WebhookModule` and `Webhook` utility for verifying HMAC-SHA256 signatures (`x-karuhun-signature`), parsing typed events (`constructEvent`), and checking idempotency keys (`verifyDelivery`).
- Add `WebhookSignatureVerificationError` error class.
- Support `custom` provider accounts (e.g. `custom:dana-1`, `custom:bca-bisnis`) alongside ShopeePay and GoPay.
- Support extended `POST /v1/qris/create` fields: `callback_url`, `products`, `items`, `custom_order_id`, `customer_name`, `customer_email`, `customer_phone`, `redirect_url`, `cancel_url`, and `expires_in_minutes`.
- Add `callback_url`, `payment_url`, `qr_image_url`, `total_amount`, and `merchant_name` to `Qris` response interface.

## 0.1.1

- Point checkout examples to the Karuhun QRIS service.
- Add website and Telegram registration links, registry installation instructions, and version/download badges.
- Document standalone SDK development and publishing.

## 0.1.0

- Initial modular SDK for account, QRIS, payments, transactions, provider credentials, and gateway probes.
- Per-request authentication overrides, idempotency headers, raw/PNG QR downloads, and long-poll timeout handling.
- Typed requests/responses, mocked contract tests, examples, documentation, and CI.
