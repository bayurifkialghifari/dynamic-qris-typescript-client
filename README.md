# Dynamic QRIS TypeScript Client

Client TypeScript modular untuk Dynamic QRIS Gateway. Mendukung ShopeePay, GoPay, banyak akun provider, QRIS dengan idempotency key, dan long-poll pembayaran. Runtime menggunakan native fetch tanpa dependency produksi; tersedia ESM, CommonJS, serta deklarasi TypeScript.

## Instalasi

Node.js 22+. Jalankan SDK di backend agar API key tetap di server.

```bash
npm install @bayurifkialghifari/dynamic-qris-client
```

Perintah ini tersedia setelah paket dipublish ke npm.

## Quick start

```ts
import { DynamicQrisClient } from "@bayurifkialghifari/dynamic-qris-client";

const client = new DynamicQrisClient({
  baseUrl: process.env.DYNAMIC_QRIS_BASE_URL ?? "http://localhost:4000",
  apiKey: process.env.DYNAMIC_QRIS_API_KEY!,
});

const account = await client.account.get();
console.log(account.balance, account.providers);

const qr = await client.qris.create(
  { amount: 10000, provider: "shopee:store" },
  { idempotencyKey: "order-123" },
);
console.log(qr.token, qr.qris_url, qr.amount);

const result = await client.payment.check({ token: qr.token });
if (result.paid) {
  console.log(result.transaction.transactionId, result.transaction.issuer);
}
```

CommonJS juga didukung:

```js
const {
  DynamicQrisClient,
} = require("@bayurifkialghifari/dynamic-qris-client");
```

## Modul

| Method                                    | Hasil                                                      |
| ----------------------------------------- | ---------------------------------------------------------- |
| account.get(options?)                     | Account, termasuk saldo dan daftar provider                |
| qris.create(input, options?)              | Qris; data envelope dibuka                                 |
| qris.url(id)                              | URL gambar tanpa HTTP request                              |
| qris.raw(id, options?)                    | Payload QRIS string                                        |
| qris.image(id, options?)                  | Uint8Array PNG                                             |
| payment.check(input, options?)            | Envelope PaymentResult dengan paid/status/transaction      |
| transactions.list(query?, options?)       | Envelope TransactionsResult dengan total_amount dan cursor |
| transactions.all({ provider }?, options?) | Riwayat bulan berjalan beserta period                      |
| token.status({ provider }?, options?)     | Envelope TokenStatusResult, termasuk success: false        |
| token.update(input, options?)             | TokenUpdate                                                |
| system.health(options?)                   | Health, tanpa autentikasi                                  |
| system.ready(options?)                    | Readiness; HTTP 503 melempar error                         |
| system.logs(options?)                     | Objek dengan logs, perlu API key                           |

Nama field respons mengikuti API (snake_case dan transactionId). PaymentResult adalah discriminated union: ketika paid bernilai true, transaction tersedia dengan tipe yang pasti.

## Provider dan nominal

Provider bisa shopee, gopay, atau selector akun seperti shopee:store / gopay:outlet_2. Label terdiri dari 1–64 huruf kecil, angka, underscore, atau strip. Jika provider kosong, gateway memilih akun aktif; pengecekan pembayaran tetap terikat pada akun pembuat QRIS.

amount wajib integer Rupiah positif yang aman di JavaScript. requested_amount adalah nominal pesanan; amount pada respons QRIS sudah mencakup unique_code. Tampilkan amount tersebut kepada pembayar. creation_fee dipotong dari saldo merchant; baca account.qris_creation_fee untuk biaya aktual.

Simpan token dan idempotency key bersama pesanan. Untuk mengulang pembuatan QRIS setelah koneksi terputus, gunakan key dan input yang sama. Gateway mengembalikan HTTP 200 dengan idempotent_replay: true untuk replay, atau HTTP 201 untuk QRIS baru. SDK mengirim satu request per pemanggilan; pengulangan dikendalikan aplikasi.

## Long polling dan pembatalan

```ts
const controller = new AbortController();
const result = await client.payment.check(
  {
    token: "saved-qris-token",
    wait: true,
    timeout: 120,
    polling_interval: 3,
  },
  { signal: controller.signal },
);
// Panggil controller.abort() dari lifecycle aplikasi untuk membatalkan.
```

wait memakai satu request long-poll ke server. timeout adalah detik (1–300); polling_interval adalah detik (2–300). Timeout HTTP default 30.000 ms otomatis diperpanjang menjadi sekurangnya timeout + polling_interval + 15 detik untuk long polling. Override timeoutMs tetap dihormati. Hasil pending berarti belum ada pembayaran terverifikasi; expired berarti QRIS sudah kedaluwarsa.

## Mutasi, QR PNG, dan token

```ts
import { writeFile } from "node:fs/promises";

const page = await client.transactions.list({
  provider: "gopay:store",
  startTime: Math.floor(Date.now() / 1000) - 86400,
  endTime: Math.floor(Date.now() / 1000),
  page_size: 50,
  next_position: "", // Gunakan page.data.next_position untuk halaman berikutnya.
});
console.log(page.total_amount, page.data.transactions);

const month = await client.transactions.all({ provider: "gopay:store" });
console.log(month.data.period);
await writeFile("payment.png", await client.qris.image("saved-qris-token"));

const status = await client.token.status({ provider: "shopee:store" });
console.log(status.data.token_status); // valid | invalid | not_set
await client.token.update({
  token: "new-shopeepay-token",
  provider: "shopee:store",
});
```

Timestamp query memakai Unix detik. total_amount dipertahankan sebagai string. token.status dengan HTTP 200 dan success: false adalah hasil pemeriksaan kredensial, sehingga tidak melempar error. Update token hanya tersedia untuk ShopeePay; sesi GoPay dikelola gateway lewat bot.

## Konfigurasi dan error

ClientOptions: baseUrl, apiKey opsional untuk public endpoint, timeoutMs (default 30000), serta fetch opsional untuk transport kustom. baseUrl dapat memiliki prefix reverse proxy. RequestOptions: apiKey, timeoutMs, signal, idempotencyKey, shopeeToken. Override API key berlaku hanya pada request tersebut. shopeeToken mengirim x-shopee-token untuk pengecekan QRIS ShopeePay.

```ts
import { DynamicQrisError } from "@bayurifkialghifari/dynamic-qris-client";

try {
  await client.qris.create({ amount: 10000 }, { idempotencyKey: "order-456" });
} catch (error) {
  if (error instanceof DynamicQrisError) {
    console.error(error.status, error.message);
    if (error.status === 402)
      console.log("Saldo merchant perlu diisi lewat bot.");
  } else {
    throw error;
  }
}
```

HTTP/API errors menyimpan status dan response asli. DynamicQrisTransportError memiliki status 0 dan cause untuk gangguan jaringan, timeout, atau pembatalan. Input yang tidak valid menghasilkan TypeError sebelum request. Redirect HTTP ditolak.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run format:check
npm pack --dry-run
```

Test menggunakan fixture gateway dan fetch fake. Contoh checkout ada di [examples/checkout.ts](examples/checkout.ts); [panduan pengembangan SDK](docs/maintenance.md), [CHANGELOG](CHANGELOG.md), [MIT License](LICENSE).
