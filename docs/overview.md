# SDK Karuhun QRIS

Daftar melalui [website Karuhun QRIS](https://qris.karuhundeveloper.com/) atau langsung buka [bot Telegram @karuhunqris_bot](https://t.me/karuhunqris_bot) untuk mendapatkan API key merchant. Base URL layanan adalah https://qris.karuhundeveloper.com. Lihat [dokumentasi API](https://qris.karuhundeveloper.com/reference#description/introduction) untuk kontrak endpoint.

| SDK           | Runtime                 | Repository                                                                                             |
| ------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| TypeScript    | Node.js 22+             | [dynamic-qris-typescript-client](https://github.com/bayurifkialghifari/dynamic-qris-typescript-client) |
| PHP / Laravel | PHP 8.3+, Laravel 12–13 | [dynamic-qris-php-client](https://github.com/bayurifkialghifari/dynamic-qris-php-client)               |

Kedua SDK mendukung profil merchant, QRIS dinamis, idempotency, pengecekan pembayaran, long polling, mutasi, status kredensial provider, serta QRIS PNG/raw.

Dokumentasi TypeScript tersedia di [README](../README.md). Panduan PHP tersedia di repository SDK PHP. [Panduan pengembangan](maintenance.md) menjelaskan test dan publikasi paket TypeScript.
