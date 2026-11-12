"use strict";

const assert = require("node:assert/strict");

async function main() {
  const commonjs = require("../dist/index.cjs");
  const esm = await import("../dist/index.js");
  for (const sdk of [commonjs, esm]) {
    const client = new sdk.DynamicQrisClient({
      baseUrl: "https://gateway.example",
    });
    assert.equal(client.qris.url(1), "https://gateway.example/qr/1");
    assert.equal(typeof sdk.DynamicQrisError, "function");
    assert.equal(typeof client.payment.check, "function");
  }
  console.log("ESM and CommonJS package exports passed.");
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
