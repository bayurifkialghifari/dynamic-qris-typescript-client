# Pengembangan SDK

Panduan penggunaan tersedia di [README](../README.md). Untuk memakai layanan, daftar melalui [website Karuhun QRIS](https://qris.karuhundeveloper.com/) atau [bot Telegram](https://t.me/karuhunqris_bot). Kontrak endpoint tersedia di [dokumentasi API](https://qris.karuhundeveloper.com/reference#description/introduction).

## Development

Test SDK menggunakan fixture dan HTTP mock sehingga tidak membutuhkan akun merchant atau mengirim request pembayaran.

```bash
npm ci
npm run typecheck
npm test
npm run test:coverage
npm run build
npm run format:check
node tests/package-smoke.cjs
```

## Rilis npm

Paket memakai scope @bayurifkialgh. Update version pada package.json menggunakan SemVer dan catat perubahan di CHANGELOG. Setelah pemeriksaan development lolos, periksa isi paket dengan npm pack --dry-run, lalu publish versi tersebut ke npm.

```bash
npm publish --access public
```

Workflow [Tests](../.github/workflows/tests.yml) menguji Node 22/24, typecheck, coverage, format, build, dan package exports.
