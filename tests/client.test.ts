import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DynamicQrisClient,
  DynamicQrisError,
  DynamicQrisTransportError,
  WebhookSignatureVerificationError,
  Webhook,
} from "../src";
import fixture from "./fixtures/gateway.json";

function setup(body: unknown = fixture.account, status = 200) {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () => new Response(JSON.stringify(body), { status }),
    );
  const client = new DynamicQrisClient({
    baseUrl: "https://gateway.example/proxy/",
    apiKey: "test-key",
    fetch: fetcher,
  });
  return { client, fetcher };
}
function request(fetcher: ReturnType<typeof setup>["fetcher"]) {
  const [url, init] = fetcher.mock.calls[0]!;
  return {
    url: new URL(String(url)),
    init: init!,
    headers: new Headers(init!.headers),
  };
}
afterEach(() => vi.useRealTimers());

describe("gateway contract", () => {
  it("authenticates account requests and retains provider accounts", async () => {
    const { client, fetcher } = setup();
    expect(await client.account.get()).toEqual(fixture.account.data);
    expect(request(fetcher).url.pathname).toBe("/proxy/v1/account");
    expect(request(fetcher).headers.get("x-api-key")).toBe("test-key");
    expect(request(fetcher).init.redirect).toBe("error");
  });
  it.each([201, 200])(
    "accepts QRIS creation and idempotent replay (HTTP %s)",
    async (status) => {
      const body = {
        success: true,
        data: { ...fixture.qris.data, idempotent_replay: status === 200 },
      };
      const { client, fetcher } = setup(body, status);
      expect(
        (
          await client.qris.create(
            { amount: 10000, provider: "shopee:store" },
            { idempotencyKey: "order-123" },
          )
        ).idempotent_replay,
      ).toBe(status === 200);
      expect(request(fetcher).headers.get("idempotency-key")).toBe("order-123");
      expect(JSON.parse(String(request(fetcher).init.body))).toEqual({
        amount: 10000,
        provider: "shopee:store",
      });
    },
  );
  it.each(["paid", "pending", "expired"] as const)(
    "preserves the %s payment envelope",
    async (state) => {
      const { client, fetcher } = setup(fixture[state]);
      expect(
        await client.payment.check(
          { token: "qr_example", provider: "shopee:store" },
          { shopeeToken: "provider-token" },
        ),
      ).toEqual(fixture[state]);
      expect(request(fetcher).url.pathname).toBe("/proxy/v1/payment/check");
      expect(request(fetcher).headers.get("x-shopee-token")).toBe(
        "provider-token",
      );
    },
  );
  it("encodes pagination and Unix-second query parameters", async () => {
    const { client, fetcher } = setup(fixture.transactions);
    expect(
      await client.transactions.list({
        provider: "gopay:store",
        startTime: 100,
        endTime: 200,
        page_size: 50,
        next_position: "cursor/next+1",
      }),
    ).toEqual(fixture.transactions);
    const { url } = request(fetcher);
    expect(url.searchParams.get("next_position")).toBe("cursor/next+1");
    expect(url.searchParams.get("page_size")).toBe("50");
    expect(url.searchParams.get("startTime")).toBe("100");
  });
  it("preserves totals and the current-month period", async () => {
    const { client, fetcher } = setup(fixture.allTransactions);
    expect(await client.transactions.all({ provider: "gopay:store" })).toEqual(
      fixture.allTransactions,
    );
    expect(request(fetcher).url.pathname).toBe("/proxy/transactions/all");
  });
  it.each(["invalid", "not_set", "valid"] as const)(
    "returns token status %s without throwing",
    async (state) => {
      const body = {
        success: state === "valid",
        data: { ...fixture.tokenStatus.data, token_status: state },
      };
      const { client } = setup(body);
      expect(await client.token.status({ provider: "shopee:store" })).toEqual(
        body,
      );
    },
  );
  it("updates a selected ShopeePay account", async () => {
    const { client, fetcher } = setup(fixture.tokenUpdate);
    expect(
      await client.token.update({
        token: "new-provider-token",
        provider: "shopee:store",
      }),
    ).toEqual(fixture.tokenUpdate.data);
    expect(request(fetcher).url.pathname).toBe("/proxy/update-token");
  });
  it.each(["health", "ready"] as const)(
    "allows anonymous %s probes",
    async (method) => {
      const { fetcher } = setup(fixture[method]);
      const client = new DynamicQrisClient({
        baseUrl: "https://gateway.example",
        fetch: fetcher,
      });
      expect(await client.system[method]()).toEqual(fixture[method]);
      expect(request(fetcher).headers.has("x-api-key")).toBe(false);
    },
  );
  it("retrieves authenticated logs", async () => {
    const { client } = setup(fixture.logs);
    expect(await client.system.logs()).toEqual({ logs: [] });
  });
  it("downloads raw QR data and PNG bytes without credentials", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("000201"))
      .mockResolvedValueOnce(new Response(bytes));
    const client = new DynamicQrisClient({
      baseUrl: "https://gateway.example",
      fetch: fetcher,
    });
    expect(await client.qris.raw("qr_example")).toBe("000201");
    expect(await client.qris.image(1)).toEqual(bytes);
    expect(request(fetcher).url.searchParams.get("format")).toBe("raw");
    expect(request(fetcher).headers.has("x-api-key")).toBe(false);
    expect(client.qris.url("qr/one")).toBe(
      "https://gateway.example/qr/qr%2Fone",
    );
  });
  it("isolates API-key overrides from the next request", async () => {
    const { client, fetcher } = setup();
    await client.account.get({ apiKey: "tenant-two" });
    await client.account.get();
    expect(
      new Headers(fetcher.mock.calls[0]![1]!.headers).get("x-api-key"),
    ).toBe("tenant-two");
    expect(
      new Headers(fetcher.mock.calls[1]![1]!.headers).get("x-api-key"),
    ).toBe("test-key");
  });
});

describe("errors and validation", () => {
  it.each([400, 401, 402, 409, 429, 500, 503])(
    "preserves HTTP %s and the server error",
    async (status) => {
      const body = { success: false, error: "Gateway rejected request" };
      const { client, fetcher } = setup(body, status);
      await expect(client.qris.create({ amount: 10000 })).rejects.toMatchObject(
        { status, response: body, message: body.error },
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("preserves text errors from QR downloads", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("QR expired", { status: 410 }));
    const client = new DynamicQrisClient({
      baseUrl: "https://gateway.example",
      fetch: fetcher,
    });
    await expect(client.qris.image(1)).rejects.toMatchObject({
      status: 410,
      response: "QR expired",
    });
  });
  it.each(["not json", [], {}, { success: "true" }, { success: true }])(
    "rejects malformed account responses %#",
    async (body) => {
      const { client } = setup(body);
      await expect(client.account.get()).rejects.toBeInstanceOf(
        DynamicQrisError,
      );
    },
  );
  it("rejects an HTTP-200 API failure", async () => {
    const { client } = setup({ success: false, error: "Not authorized" });
    await expect(client.account.get()).rejects.toMatchObject({
      status: 200,
      message: "Not authorized",
    });
  });
  it("rejects malformed token-status responses", async () => {
    const { client } = setup({ success: false, error: "Unexpected error" });
    await expect(client.token.status()).rejects.toBeInstanceOf(
      DynamicQrisError,
    );
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN])(
    "rejects invalid Rupiah amount %s before I/O",
    (amount) => {
      const { client, fetcher } = setup();
      expect(() => client.qris.create({ amount })).toThrow(TypeError);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("rejects invalid selectors, token updates, ranges, and polling", () => {
    const { client, fetcher } = setup();
    expect(() =>
      client.qris.create({ amount: 1, provider: "gopay:Invalid" }),
    ).toThrow();
    expect(() =>
      client.token.update({ token: "new", provider: "gopay" } as never),
    ).toThrow();
    expect(() =>
      client.transactions.list({ startTime: 200, endTime: 100 }),
    ).toThrow();
    expect(() => client.transactions.list({ page_size: 101 })).toThrow();
    expect(() => client.payment.check({ token: "" })).toThrow();
    expect(() => client.payment.check({ token: "qr", timeout: 301 })).toThrow();
    expect(() =>
      client.payment.check({ token: "qr", polling_interval: 1 }),
    ).toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["", "x".repeat(129), "line\nbreak"])(
    "rejects invalid idempotency keys before I/O",
    async (idempotencyKey) => {
      const { client, fetcher } = setup();
      await expect(
        client.qris.create({ amount: 1 }, { idempotencyKey }),
      ).rejects.toBeInstanceOf(TypeError);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it.each([
    "ftp://gateway.example",
    "https://u:p@gateway.example",
    "https://gateway.example?q=1",
    "https://gateway.example#fragment",
  ])("rejects base URL %s", (baseUrl) => {
    expect(() => new DynamicQrisClient({ baseUrl })).toThrow(TypeError);
  });
  it("requires authentication for private endpoints", async () => {
    const { fetcher } = setup();
    const client = new DynamicQrisClient({
      baseUrl: "https://gateway.example",
      fetch: fetcher,
    });
    await expect(client.account.get()).rejects.toBeInstanceOf(TypeError);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("wraps network failures and retains their cause", async () => {
    const error = new TypeError("Network unavailable");
    const { client, fetcher } = setup();
    fetcher.mockRejectedValue(error);
    await expect(client.account.get()).rejects.toMatchObject({
      status: 0,
      cause: error,
    });
  });
});

describe("HTTP timeout and cancellation", () => {
  function stalledFetch() {
    return vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) reject(init.signal.reason);
          else
            init?.signal?.addEventListener(
              "abort",
              () => reject(init.signal!.reason),
              { once: true },
            );
        }),
    );
  }
  it("aborts a stalled HTTP request", async () => {
    vi.useFakeTimers();
    const client = new DynamicQrisClient({
      baseUrl: "https://gateway.example",
      apiKey: "test",
      timeoutMs: 20,
      fetch: stalledFetch(),
    });
    const assertion = expect(client.account.get()).rejects.toMatchObject({
      status: 0,
      message: "Request timed out",
    });
    await vi.advanceTimersByTimeAsync(20);
    await assertion;
  });
  it("extends the default HTTP timeout for long polling", async () => {
    vi.useFakeTimers();
    const client = new DynamicQrisClient({
      baseUrl: "https://gateway.example",
      apiKey: "test",
      timeoutMs: 20,
      fetch: stalledFetch(),
    });
    const pending = client.payment.check({
      token: "qr",
      wait: true,
      timeout: 1,
      polling_interval: 2,
    });
    const assertion = expect(pending).rejects.toMatchObject({
      message: "Request timed out",
    });
    await vi.advanceTimersByTimeAsync(17_999);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
  });
  it("honors an explicit HTTP timeout during long polling", async () => {
    vi.useFakeTimers();
    const client = new DynamicQrisClient({
      baseUrl: "https://gateway.example",
      apiKey: "test",
      fetch: stalledFetch(),
    });
    const assertion = expect(
      client.payment.check({ token: "qr", wait: true }, { timeoutMs: 10 }),
    ).rejects.toBeInstanceOf(DynamicQrisTransportError);
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
  });
  it("honors caller cancellation and clears timers", async () => {
    const controller = new AbortController();
    const client = new DynamicQrisClient({
      baseUrl: "https://gateway.example",
      apiKey: "test",
      fetch: stalledFetch(),
    });
    const assertion = expect(
      client.account.get({ signal: controller.signal }),
    ).rejects.toMatchObject({ message: "Request cancelled" });
    controller.abort();
    await assertion;
  });
});

describe("custom provider and extended qris create", () => {
  it("supports custom provider, description, callback_url and products", async () => {
    const responsePayload = {
      success: true,
      data: {
        ...fixture.qris.data,
        provider: "custom",
        label: "dana-1",
        provider_selector: "custom:dana-1",
        callback_url: "https://my-store.example/api/webhook",
        payment_link: "https://gateway.example/pay/qr_example",
        description: "Order #123",
        products: [{ name: "Product A", price: 10000, qty: 1 }],
      },
    };
    const { client, fetcher } = setup(responsePayload);
    const result = await client.qris.create({
      amount: 10000,
      provider: "custom:dana-1",
      description: "Order #123",
      callback_url: "https://my-store.example/api/webhook",
      products: [{ name: "Product A", price: 10000, qty: 1 }],
    });

    expect(result.provider).toBe("custom");
    expect(result.callback_url).toBe("https://my-store.example/api/webhook");
    expect(result.payment_link).toBe("https://gateway.example/pay/qr_example");
    expect(result.description).toBe("Order #123");

    const sent = JSON.parse(String(request(fetcher).init.body));
    expect(sent.provider).toBe("custom:dana-1");
    expect(sent.callback_url).toBe("https://my-store.example/api/webhook");
    expect(sent.description).toBe("Order #123");
  });

  it("rejects invalid callback_url format", () => {
    const { client } = setup();
    expect(() =>
      client.qris.create({
        amount: 10000,
        callback_url: "not-a-valid-url",
      }),
    ).toThrow("callback_url must be an HTTP(S) URL");
  });
});

describe("webhook signature, idempotency and event handling", () => {
  const secret = "whsec_test_secret_1234567890abcdef";
  const payload = JSON.stringify({
    event: "payment.success",
    token: "tok_test_123",
    status: "success",
    amount: 10000,
    unique_code: 1,
    total_amount: 10001,
    description: null,
    products: null,
    issuer: "ShopeePay",
    transaction_id: "TX-999",
    paid_at: "2026-11-20T05:00:00.000Z",
    created_at: "2026-11-20T04:45:00.000Z",
  });

  it("generates and verifies valid sha256= signature", () => {
    const signature = Webhook.sign(payload, secret);
    expect(signature.startsWith("sha256=")).toBe(true);
    expect(Webhook.verifySignature(payload, signature, secret)).toBe(true);

    // Also accepts plain hex
    const plainHex = signature.replace("sha256=", "");
    expect(Webhook.verifySignature(payload, plainHex, secret)).toBe(true);
  });

  it("detects tampered payload or incorrect secret", () => {
    const signature = Webhook.sign(payload, secret);
    const tampered = payload.replace("10001", "99999");
    expect(Webhook.verifySignature(tampered, signature, secret)).toBe(false);
    expect(Webhook.verifySignature(payload, signature, "wrong_secret")).toBe(
      false,
    );
    expect(Webhook.verifySignature(payload, "invalid_sig", secret)).toBe(false);
  });

  it("constructs typed WebhookEvent on valid signature", () => {
    const signature = Webhook.sign(payload, secret);
    const deliveryId = "del_uuid_12345";
    const event = Webhook.constructEvent(
      payload,
      signature,
      secret,
      deliveryId,
    );

    expect(event.event).toBe("payment.success");
    expect(event.deliveryId).toBe(deliveryId);
    expect(event.payload.token).toBe("tok_test_123");
    expect(event.payload.total_amount).toBe(10001);
  });

  it("throws WebhookSignatureVerificationError on invalid signature in constructEvent", () => {
    expect(() =>
      Webhook.constructEvent(payload, "sha256=bad_signature", secret),
    ).toThrow(WebhookSignatureVerificationError);
  });

  it("verifies idempotency delivery key with Set and callback", async () => {
    const seen = new Set<string>();
    expect(await Webhook.verifyDelivery("del_1", seen)).toBe(true);
    expect(await Webhook.verifyDelivery("del_1", seen)).toBe(false); // Duplicate!
    expect(await Webhook.verifyDelivery("del_2", seen)).toBe(true);

    const asyncSeen = new Set<string>(["del_existing"]);
    const isProcessed = async (id: string) => asyncSeen.has(id);
    expect(await Webhook.verifyDelivery("del_existing", isProcessed)).toBe(
      false,
    );
    expect(await Webhook.verifyDelivery("del_fresh", isProcessed)).toBe(true);
  });

  it("is accessible via client.webhook instance", () => {
    const { client } = setup();
    expect(client.webhook).toBeDefined();
    const sig = client.webhook.sign(payload, secret);
    expect(client.webhook.verifySignature(payload, sig, secret)).toBe(true);
  });
});

describe("transaction module and bank transfer support", () => {
  const transactionQrisPayload = {
    success: true,
    data: {
      id: "tx_qris_123",
      token: "tok_tx_qris",
      payment_type: "qris",
      payment_link: "https://gateway.example/pay/tx_qris_123",
      callback_url: "https://my-store.example/webhook",
      description: "Order #INV-100",
      products: [{ name: "Item 1", price: 10000, qty: 1 }],
      qris_url: "https://gateway.example/qr/tx_qris_123",
      qris_string: "0002010102126304A13F",
      bank_name: null,
      bank_logo: null,
      account_number: null,
      account_holder_name: null,
      amount: 10001,
      requested_amount: 10000,
      unique_code: 1,
      creation_fee: 100,
      balance_remaining: 149900,
      expires_at: "2026-10-19T03:30:30.000Z",
      expires_in_seconds: 900,
      idempotent_replay: false,
      provider: "gopay",
      label: "default",
      provider_selector: "gopay:default",
    },
  };

  const transactionBankTransferPayload = {
    success: true,
    data: {
      id: "tx_bt_456",
      token: "tok_tx_bt",
      payment_type: "bank_transfer",
      payment_link: "https://gateway.example/pay/tx_bt_456",
      callback_url: "https://my-store.example/webhook",
      description: "Order #INV-101",
      products: null,
      qris_url: null,
      qris_string: null,
      bank_name: "BCA",
      bank_logo: "https://gateway.example/images/bca.svg",
      account_number: "1234567890",
      account_holder_name: "PT MAKMUR JAYA",
      amount: 50001,
      requested_amount: 50000,
      unique_code: 1,
      creation_fee: 100,
      balance_remaining: 149900,
      expires_at: "2026-10-19T03:30:30.000Z",
      expires_in_seconds: 900,
      idempotent_replay: false,
      provider: "bank_transfer",
      label: "bca-utama",
      provider_selector: "bank_transfer:bca-utama",
    },
  };

  it("creates QRIS transaction via client.transaction.create (POST /v1/transaction)", async () => {
    const { client, fetcher } = setup(transactionQrisPayload, 201);
    const result = await client.transaction.create(
      {
        amount: 10000,
        provider: "gopay:default",
        description: "Order #INV-100",
        callback_url: "https://my-store.example/webhook",
        products: [{ name: "Item 1", price: 10000, qty: 1 }],
      },
      { idempotencyKey: "idemp-tx-1" },
    );

    expect(result.id).toBe("tx_qris_123");
    expect(result.payment_type).toBe("qris");
    expect(result.qris_url).toBe("https://gateway.example/qr/tx_qris_123");
    expect(request(fetcher).url.pathname).toBe("/proxy/v1/transaction");
    expect(request(fetcher).headers.get("idempotency-key")).toBe("idemp-tx-1");
    expect(request(fetcher).init.method).toBe("POST");
  });

  it("creates Bank Transfer transaction with bank account details", async () => {
    const { client, fetcher } = setup(transactionBankTransferPayload, 201);
    const result = await client.transaction.create({
      amount: 50000,
      provider: "bank_transfer:bca-utama",
      description: "Order #INV-101",
    });

    expect(result.payment_type).toBe("bank_transfer");
    expect(result.qris_url).toBeNull();
    expect(result.qris_string).toBeNull();
    expect(result.bank_name).toBe("BCA");
    expect(result.account_number).toBe("1234567890");
    expect(result.account_holder_name).toBe("PT MAKMUR JAYA");
    expect(request(fetcher).url.pathname).toBe("/proxy/v1/transaction");
  });

  it("supports client.transactions.create alias", async () => {
    const { client, fetcher } = setup(transactionQrisPayload, 201);
    const result = await client.transactions.create({
      amount: 10000,
      provider: "gopay:default",
    });
    expect(result.id).toBe("tx_qris_123");
    expect(request(fetcher).url.pathname).toBe("/proxy/v1/transaction");
  });

  it("emits console.warn when legacy client.qris.create is called", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client, fetcher } = setup(fixture.qris, 201);

    const result = await client.qris.create({ amount: 10000 });
    expect(result.token).toBe("qr_example");
    expect(request(fetcher).url.pathname).toBe("/proxy/v1/qris/create");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("qris.create() is legacy and deprecated"),
    );
    warnSpy.mockRestore();
  });

  it("accepts bank_transfer provider selector in validation", async () => {
    const { client } = setup(transactionBankTransferPayload, 201);
    await expect(
      client.transaction.create({
        amount: 50000,
        provider: "bank_transfer",
      }),
    ).resolves.toBeDefined();

    await expect(
      client.transaction.create({
        amount: 50000,
        provider: "bank_transfer:mandiri-1",
      }),
    ).resolves.toBeDefined();
  });
});
