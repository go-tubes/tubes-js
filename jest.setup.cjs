// jsdom does not provide TextEncoder/TextDecoder, which @bufbuild/protobuf needs
// at import time. Polyfill them from Node's util before any test module loads.
const { TextEncoder, TextDecoder } = require("util");
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder;
}
