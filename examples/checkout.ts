import { DynamicQrisClient } from "../src";

/** Call from a server checkout handler after persisting an immutable order ID. */
export async function createCheckout(orderId: string, amount: number) {
  const client = new DynamicQrisClient({
    baseUrl: "https://qris.karuhundeveloper.com",
    apiKey: process.env.DYNAMIC_QRIS_API_KEY!,
  });
  const tx = await client.transaction.create(
    { amount },
    { idempotencyKey: orderId },
  );
  // Persist tx.token with orderId. Show amount including the unique code.
  return {
    token: tx.token,
    paymentType: tx.payment_type,
    imageUrl: tx.qris_url,
    amount: tx.amount,
    expiresAt: tx.expires_at,
  };
}
