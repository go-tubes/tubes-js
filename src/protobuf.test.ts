import { createProtobufCodec } from "./protobuf";

// A tight ArrayBuffer of exactly the view's bytes, mirroring what arrives on a
// WebSocket binary frame (ws.binaryType = "arraybuffer").
function bufOf(u8: Uint8Array): ArrayBuffer {
  return u8.slice().buffer as ArrayBuffer;
}

describe("createProtobufCodec", () => {
  const codec = createProtobufCodec();

  it("reports binary frames", () => {
    expect(codec.binary).toBe(true);
  });

  it("round-trips a binary payload", () => {
    const payload = new Uint8Array([0x00, 0x01, 0xfe, 0xff, 0x10]);
    const wire = codec.encode({
      type: "message",
      channel: "/echo/demo",
      payload,
    });
    expect(wire).toBeInstanceOf(Uint8Array);

    const back = codec.decode(bufOf(wire as Uint8Array));
    expect(back.channel).toBe("/echo/demo");
    expect(Array.from(back.payload as Uint8Array)).toEqual(Array.from(payload));
  });

  it("coerces empty/non-bytes payloads (control messages) to empty bytes", () => {
    const wire = codec.encode({ type: "subscribe", channel: "/c", payload: {} });
    const back = codec.decode(bufOf(wire as Uint8Array));
    expect(back.channel).toBe("/c");
    expect((back.payload as Uint8Array).length).toBe(0);
  });

  it("preserves the message type in the decoded envelope", () => {
    const wire = codec.encode({
      type: "message",
      channel: "/c",
      payload: new Uint8Array([1]),
    });
    const back = codec.decode(bufOf(wire as Uint8Array)) as {
      type?: string;
      channel: string;
    };
    expect(back.type).toBe("message");
  });

  it("produces canonical protobuf wire bytes (matches the Go golden)", () => {
    // type=MESSAGE(3), channel="ab", payload=[0x01,0x02]
    const wire = codec.encode({
      type: "message",
      channel: "ab",
      payload: new Uint8Array([0x01, 0x02]),
    }) as Uint8Array;
    expect(Array.from(wire)).toEqual([
      0x08, 0x03, 0x12, 0x02, 0x61, 0x62, 0x1a, 0x02, 0x01, 0x02,
    ]);
  });
});
