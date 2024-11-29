<h1 align="center">
  <img src="https://raw.githubusercontent.com/go-tubes/tubes/images/logo.png"><br>
  Tubes - JavaScript Client
</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@go-tubes/tubes-js"><img src="https://img.shields.io/npm/v/@go-tubes/tubes-js.svg" alt="npm version"></a>
</p>

`tubes-js` is a JavaScript client library to connect to a `tubes` server. It provides a simple API to connect to WebSocket channels and send/receive messages.

## Get Started

Install the package using your preferred package manager:


```bash
pnpm add @go-tubes/tubes-js
```

## Example

```javascript
import { TubesClient } from '@go-tubes/tubes-js';

// Initialize the client
const client = new TubesClient({ url: 'ws://localhost:8080', debugging: true });

// Connect to a channel
client.subscribeChannel("test", console.log);
client.send("test", { payload: { foo: "bar" } })
```


