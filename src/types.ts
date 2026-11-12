/** Provider account selectors use the gateway's lowercase kind:label format. */
export type Provider = "shopee" | "gopay";
export type ProviderSelector = Provider | `${Provider}:${string}`;

export interface ProviderMetadata {
  provider: Provider;
  label: string;
  provider_selector: ProviderSelector;
}
export interface ProviderAccount {
  id: number;
  provider: Provider;
  label: string;
  provider_selector: ProviderSelector;
  active: boolean;
  configured: boolean;
  has_qris_static: boolean;
  status: string;
  merchant_name: string;
  merchant_city: string;
}
export interface Account {
  user_id: string;
  username: string;
  first_name: string;
  api_key: string;
  has_shopee_token: boolean;
  has_qris_static: boolean;
  token_valid: boolean;
  active_provider: Provider;
  active_provider_label: string | null;
  active_provider_selector: ProviderSelector | null;
  providers: ProviderAccount[];
  is_active: boolean;
  balance: number;
  qris_creation_fee: number;
}
export interface CreateQrisRequest {
  /** Positive integer Rupiah, before the gateway adds a unique code. */
  amount: number;
  provider?: ProviderSelector;
}
export interface Qris extends ProviderMetadata {
  id: string;
  token: string;
  qris_url: string;
  qris_string: string;
  amount: number;
  requested_amount: number;
  unique_code: number;
  creation_fee: number;
  balance_remaining: number;
  expires_at: string;
  expires_in_seconds: number;
  idempotent_replay: boolean;
}
export interface Transaction extends ProviderMetadata {
  transactionId: string;
  amount: number;
  status: string;
  time: string;
  issuer: string;
  /** Absent when the gateway reconstructs an already-paid transaction. */
  timestamp?: number;
}
export interface CheckPaymentRequest {
  token: string;
  provider?: ProviderSelector;
  /** Unix timestamp in seconds. */
  startTime?: number;
  wait?: boolean;
  /** Server long-poll budget in seconds, 1–300; defaults to 120. */
  timeout?: number;
  /** Server polling interval in seconds, 2–300; defaults to 3. */
  polling_interval?: number;
}
export interface PaymentData extends ProviderMetadata {
  token: string;
  amount: number;
}
export type PaymentResult =
  | (ProviderMetadata & {
      success: true;
      paid: true;
      status: "success";
      transaction: Transaction;
      data: PaymentData & { transaction: Transaction };
    })
  | (ProviderMetadata & {
      success: true;
      paid: false;
      status: "pending" | "expired";
      data: PaymentData & { expires_at: string };
    });
export interface TransactionsQuery {
  provider?: ProviderSelector;
  startTime?: number;
  endTime?: number;
  page_size?: number;
  next_position?: string;
}
export interface TransactionsResult extends ProviderMetadata {
  success: true;
  /** Preserved as a string, as returned by the gateway. */
  total_amount: string;
  data: ProviderMetadata & {
    transactions: Transaction[];
    next_position: string;
    total: number;
  };
}
export interface AllTransactionsResult extends ProviderMetadata {
  success: true;
  total_amount: string;
  data: ProviderMetadata & {
    transactions: Transaction[];
    period: string;
    total_count: number;
  };
}
export interface TokenStatusResult {
  /** false with HTTP 200 means missing or invalid provider credentials. */
  success: boolean;
  data: ProviderMetadata & {
    token_status: "not_set" | "valid" | "invalid";
    message: string;
  };
}
export interface UpdateTokenRequest {
  token: string;
  /** Token updates are only supported for ShopeePay accounts. */
  provider?: "shopee" | `shopee:${string}`;
}
export interface TokenUpdate extends ProviderMetadata {
  message: string;
}
export interface Health {
  success: true;
  name: string;
  version: string;
  message: string;
  timestamp: string;
  uptime_seconds: number;
}
export interface Readiness {
  success: true;
  database: "ready";
  timestamp: string;
}
export interface ClientOptions {
  baseUrl: string;
  apiKey?: string;
  /** HTTP timeout in milliseconds; defaults to 30,000. */
  timeoutMs?: number;
  /** Injectable fetch for tests or custom runtimes. */
  fetch?: typeof globalThis.fetch;
}
export interface RequestOptions {
  apiKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  idempotencyKey?: string;
  shopeeToken?: string;
}
