import { DynamicQrisClient } from "../src";

/** Call from a server checkout handler after persisting an immutable order ID. */
export async function createCheckout(orderId: string, amount: number) {
  const client = new DynamicQrisClient({
    baseUrl: process.env.DYNAMIC_QRIS_BASE_URL ?? "http://localhost:4000",
    apiKey: process.env.DYNAMIC_QRIS_API_KEY!,
  });
  const qr = await client.qris.create({ amount }, { idempotencyKey: orderId });
  // Persist qr.token with orderId. Show amount including the unique code.
  return {
    token: qr.token,
    imageUrl: qr.qris_url,
    amount: qr.amount,
    expiresAt: qr.expires_at,
  };
}
