import { createHmac, timingSafeEqual } from "node:crypto";
import { DynamicQrisError, WebhookSignatureVerificationError } from "../errors";
import type { WebhookEvent, WebhookPaymentPayload } from "../types";

export class WebhookModule {
  /**
   * Calculate HMAC-SHA256 signature for raw body using the webhook secret.
   * Returns 'sha256=<hex_digest>'.
   */
  sign(rawBody: string | Uint8Array, secret: string): string {
    const payload =
      typeof rawBody === "string" ? rawBody : Buffer.from(rawBody);
    const digest = createHmac("sha256", secret).update(payload).digest("hex");
    return `sha256=${digest}`;
  }

  /**
   * Verify an incoming HMAC-SHA256 signature against the raw request body.
   * Accepts signature with or without 'sha256=' prefix.
   */
  verifySignature(
    rawBody: string | Uint8Array,
    signature: string,
    secret: string,
  ): boolean {
    if (!signature || !secret) return false;

    const cleanSig = signature.trim();
    const expectedPrefix = "sha256=";
    const providedHex = cleanSig.startsWith(expectedPrefix)
      ? cleanSig.slice(expectedPrefix.length)
      : cleanSig;

    // Check valid 64-character hex string
    if (!/^[0-9a-fA-F]{64}$/.test(providedHex)) {
      return false;
    }

    const payload =
      typeof rawBody === "string" ? rawBody : Buffer.from(rawBody);
    const computedHex = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const providedBuf = Buffer.from(providedHex.toLowerCase(), "utf8");
    const computedBuf = Buffer.from(computedHex.toLowerCase(), "utf8");

    if (providedBuf.length !== computedBuf.length) {
      return false;
    }

    return timingSafeEqual(providedBuf, computedBuf);
  }

  /**
   * Check if an idempotency delivery key has already been processed.
   * If seenDeliveries is a Set, automatically records unseen IDs.
   */
  async verifyDelivery(
    deliveryId: string,
    isProcessed: Set<string> | ((id: string) => boolean | Promise<boolean>),
  ): Promise<boolean> {
    if (!deliveryId) return false;
    if (isProcessed instanceof Set) {
      if (isProcessed.has(deliveryId)) {
        return false; // Already processed / duplicate delivery
      }
      isProcessed.add(deliveryId);
      return true; // Fresh delivery
    }
    const alreadyProcessed = await isProcessed(deliveryId);
    return !alreadyProcessed;
  }

  /**
   * Construct and validate a typed webhook event from raw HTTP request payload and headers.
   * Throws WebhookSignatureVerificationError if the signature does not match.
   */
  constructEvent<T = WebhookPaymentPayload>(
    rawBody: string | Uint8Array,
    signature: string,
    secret: string,
    deliveryId?: string,
  ): WebhookEvent<T> {
    if (!this.verifySignature(rawBody, signature, secret)) {
      throw new WebhookSignatureVerificationError(
        "Webhook signature verification failed",
        signature,
      );
    }

    const rawStr =
      typeof rawBody === "string"
        ? rawBody
        : Buffer.from(rawBody).toString("utf8");
    let payload: T;
    try {
      payload = JSON.parse(rawStr) as T;
    } catch (err) {
      throw new DynamicQrisError(
        "Malformed JSON webhook payload",
        400,
        undefined,
        { cause: err },
      );
    }

    const eventName = (payload as Record<string, unknown>)?.event;
    return {
      event: typeof eventName === "string" ? eventName : "payment.success",
      deliveryId,
      signature,
      payload,
      rawBody: rawStr,
    };
  }
}

export const Webhook = new WebhookModule();
