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
