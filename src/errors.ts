export class DynamicQrisError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response: unknown = undefined,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DynamicQrisError";
  }
}

/** Network errors, cancellation, and HTTP timeouts have status 0. */
export class DynamicQrisTransportError extends DynamicQrisError {
  constructor(message: string, cause: unknown) {
    super(message, 0, undefined, { cause });
    this.name = "DynamicQrisTransportError";
  }
}

/** Webhook HMAC-SHA256 signature verification failed. */
export class WebhookSignatureVerificationError extends DynamicQrisError {
  constructor(
    message = "Invalid webhook signature",
    public readonly signature?: string,
  ) {
    super(message, 401);
    this.name = "WebhookSignatureVerificationError";
  }
}
