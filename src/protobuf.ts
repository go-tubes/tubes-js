import { create, toBinary, fromBinary } from "@bufbuild/protobuf";
import type { IncommingMessage, OutgoingMessage, TubesCodec } from "./lib/client";
import { EnvelopeSchema, MessageType } from "./gen/envelope_pb";

const stringToEnum: Record<string, MessageType> = {
  subscribe: MessageType.SUBSCRIBE,
  unsubscribe: MessageType.UNSUBSCRIBE,
  message: MessageType.MESSAGE,
};

const enumToString: Partial<Record<MessageType, string>> = {
  [MessageType.SUBSCRIBE]: "subscribe",
  [MessageType.UNSUBSCRIBE]: "unsubscribe",
  [MessageType.MESSAGE]: "message",
};

/**
 * Coerce an application payload into the bytes carried by Envelope.payload.
 * Control messages (subscribe/unsubscribe) and empty payloads become empty
 * bytes; application messages should pass a Uint8Array (e.g. their own
 * protobuf-encoded message).
 */
function toBytes(payload: unknown): Uint8Array {
  if (payload instanceof Uint8Array) return payload;
  if (payload instanceof ArrayBuffer) return new Uint8Array(payload);
  if (ArrayBuffer.isView(payload)) {
    return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  }
  return new Uint8Array(0);
}

function toUint8Array(data: string | ArrayBuffer): Uint8Array {
  // A binary codec receives an ArrayBuffer (ws.binaryType = "arraybuffer").
  // Decode strings defensively in case of a misconfigured text frame.
  if (typeof data === "string") return new TextEncoder().encode(data);
  return new Uint8Array(data);
}

/**
 * createProtobufCodec returns a TubesCodec that encodes the message envelope as
 * the binary tubes.v1.Envelope (see proto/envelope.proto) over binary
 * WebSocket frames. It interoperates with the Go protobuf codec
 * (github.com/go-tubes/tubes/protobuf). The application payload is carried as
 * opaque bytes in Envelope.payload; pass/receive Uint8Array payloads.
 */
export function createProtobufCodec(): TubesCodec {
  return {
    binary: true,
    encode(message: OutgoingMessage) {
      const envelope = create(EnvelopeSchema, {
        type: stringToEnum[message.type] ?? MessageType.MESSAGE_TYPE_UNSPECIFIED,
        channel: message.channel,
        payload: toBytes(message.payload),
      });
      return toBinary(EnvelopeSchema, envelope);
    },
    decode(data: string | ArrayBuffer): IncommingMessage {
      const envelope = fromBinary(EnvelopeSchema, toUint8Array(data));
      return {
        channel: envelope.channel,
        payload: envelope.payload,
        // type is preserved for completeness; the client routes by channel.
        ...(enumToString[envelope.type]
          ? { type: enumToString[envelope.type] }
          : {}),
      } as IncommingMessage;
    },
  };
}
