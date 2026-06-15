/**
 * @jest-environment jsdom
 */
import { TubesClient, jsonCodec } from "./client";
import { createProtobufCodec } from "../protobuf";

// Minimal stand-in for the browser WebSocket. The client accepts an injected
// socket via the `socket` config option, so no real network is involved.
class FakeSocket {
  static readonly OPEN = 1;
  readonly OPEN = 1;
  readyState = 1; // OPEN -> client connects synchronously
  binaryType = "blob";
  onopen: ((ev?: unknown) => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  sent: unknown[] = [];
  send(data: unknown) {
    this.sent.push(data);
  }
  close() {}
  emit(data: unknown) {
    this.onmessage?.({ data });
  }
}

describe("jsonCodec", () => {
  it("round-trips an envelope as JSON text", () => {
    expect(jsonCodec.binary).toBe(false);
    const wire = jsonCodec.encode({
      type: "message",
      channel: "/c",
      payload: { a: 1 },
    });
    expect(typeof wire).toBe("string");
    expect(jsonCodec.decode(wire as string)).toEqual({
      type: "message",
      channel: "/c",
      payload: { a: 1 },
    });
  });
});

describe("TubesClient default (JSON) codec", () => {
  it("sends JSON text frames and routes incoming messages", async () => {
    const socket = new FakeSocket();
    const client = new TubesClient({ socket: socket as unknown as WebSocket });

    const received: unknown[] = [];
    await client.subscribe("/echo/demo", (p) => received.push(p));

    // Stays a text socket; subscribe is a JSON string envelope.
    expect(socket.binaryType).toBe("blob");
    expect(typeof socket.sent[0]).toBe("string");
    expect(JSON.parse(socket.sent[0] as string)).toEqual({
      type: "subscribe",
      channel: "/echo/demo",
      payload: {},
    });

    await client.send("/echo/demo", { payload: { text: "hi" } });
    expect(JSON.parse(socket.sent[1] as string)).toEqual({
      type: "message",
      channel: "/echo/demo",
      payload: { text: "hi" },
    });

    socket.emit(JSON.stringify({ channel: "/echo/demo", payload: { text: "yo" } }));
    expect(received).toEqual([{ text: "yo" }]);
  });
});

describe("TubesClient protobuf codec", () => {
  it("uses binary frames and round-trips a Uint8Array payload", async () => {
    const socket = new FakeSocket();
    const codec = createProtobufCodec();
    const client = new TubesClient({
      socket: socket as unknown as WebSocket,
      codec,
    });

    const received: Uint8Array[] = [];
    await client.subscribe("/echo/demo", (p) => received.push(p as Uint8Array));

    // Binary codec switches the socket to arraybuffer and sends binary frames.
    expect(socket.binaryType).toBe("arraybuffer");
    expect(socket.sent[0]).toBeInstanceOf(Uint8Array);

    const payload = new Uint8Array([9, 8, 7]);
    await client.send("/echo/demo", { payload });
    const frame = socket.sent[socket.sent.length - 1] as Uint8Array;
    const decoded = codec.decode(frame.slice().buffer as ArrayBuffer);
    expect(decoded.channel).toBe("/echo/demo");
    expect(Array.from(decoded.payload as Uint8Array)).toEqual([9, 8, 7]);

    // Incoming binary frame (ArrayBuffer) is decoded and routed.
    const incoming = codec.encode({
      type: "message",
      channel: "/echo/demo",
      payload: new Uint8Array([5, 5]),
    }) as Uint8Array;
    socket.emit(incoming.slice().buffer);
    expect(Array.from(received[0])).toEqual([5, 5]);
  });
});
