export enum ProxygramSignals {
  HANDSHAKE = 0,
  INVALID_HANDSHAKE = 1,
  KEEPALIVE = 2,
  SOCKET_START = 3,
  SOCKET_END = 4,
  SOCKET_DATA = 5,
}

const ProxygramSignalBuffers: Record<ProxygramSignals, Buffer> = {
  // HANDSHAKE
  [ProxygramSignals.HANDSHAKE]: Buffer.from([0x00]),
  [ProxygramSignals.INVALID_HANDSHAKE]: Buffer.from([0x01]),
  // KEEPALIVE
  [ProxygramSignals.KEEPALIVE]: Buffer.from([0x02]),
  [ProxygramSignals.SOCKET_START]: Buffer.from([0x03]),
  [ProxygramSignals.SOCKET_END]: Buffer.from([0x04]),
  [ProxygramSignals.SOCKET_DATA]: Buffer.from([0x05]),
};

const SignalBuffersLookup = Object.entries(ProxygramSignalBuffers).reduce(
  (acc, [key, value]) => {
    acc[value.toString()] = +key;
    return acc;
  },
  {} as Record<string, ProxygramSignals>
);

export const computeFrameTail = (...parts: Buffer[]) => {
  const lengths = parts.map((part) => part.length);
  const totalDataLength = parts.reduce((acc, curr) => acc + curr.length, 0);
  const buf = Buffer.alloc(
    4 + // parts count
      4 * parts.length + // parts lengths
      totalDataLength // parts data
  );
  let offset = 0;
  buf.writeUInt32BE(parts.length, offset); // parts count

  offset += 4;
  lengths.forEach((length) => {
    buf.writeUInt32BE(length, offset); // parts lengths

    offset += 4;
  });

  parts.forEach((part) => {
    part.copy(buf, offset); // parts data
    offset += part.length;
  });

  return buf;
};

export const decodeFrameTail = (frame: Buffer) => {
  let offset = 0;
  const partsLength = frame.readUInt32BE(offset);
  offset += 4;
  const lengths = Array.from({ length: partsLength }, () => {
    const length = frame.readUInt32BE(offset);
    offset += 4;
    return length;
  });

  return lengths.map((length) => {
    const part = frame.subarray(offset, offset + length);
    offset += length;
    return part;
  });
};

export const computeFrame = (signal: ProxygramSignals, ...data: Buffer[]) => {
  const signalBuffer = ProxygramSignalBuffers[signal];
  if (data) {
    return Buffer.concat([signalBuffer, computeFrameTail(...data)]);
  }

  return signalBuffer;
};

export const decodeFrame = (chunk: Buffer) => {
  const signal = chunk.subarray(0, 1);
  const lookup = SignalBuffersLookup[signal.toString()];
  const tail = chunk.subarray(1);

  switch (lookup) {
    case ProxygramSignals.HANDSHAKE: {
      const [token, subdomains] = decodeFrameTail(tail);

      return {
        signal: lookup,
        data: {
          token,
          subdomains,
        },
      };
    }
    case ProxygramSignals.INVALID_HANDSHAKE: {
      return {
        signal: lookup,
      };
    }
    case ProxygramSignals.KEEPALIVE: {
      return {
        signal: lookup,
      };
    }
    case ProxygramSignals.SOCKET_START: {
      const [socketId, destination, data] = decodeFrameTail(tail);
      return {
        signal: lookup,
        data: {
          socketId,
          destination,
          data,
        },
      };
    }
    case ProxygramSignals.SOCKET_END: {
      const [socketId] = decodeFrameTail(tail);

      return {
        signal: lookup,
        data: {
          socketId,
        },
      };
    }
    case ProxygramSignals.SOCKET_DATA: {
      const [socketId, destination, data] = decodeFrameTail(tail);
      return {
        signal: lookup,
        data: { socketId, destination, data },
      };
    }
    default:
      return null;
  }
};

export const ProxygramFramesFactory = {
  createHandshake: (token: Buffer, subdomains: Buffer) =>
    computeFrame(ProxygramSignals.HANDSHAKE, token, subdomains),
  createInvalidHandshake: (error: Buffer) =>
    computeFrame(ProxygramSignals.INVALID_HANDSHAKE, error),
  createKeepAlive: () => computeFrame(ProxygramSignals.KEEPALIVE),
  createSocketStart: (socketId: Buffer, destination: Buffer, data: Buffer) =>
    computeFrame(ProxygramSignals.SOCKET_START, socketId, destination, data),
  createSocketEnd: (socketId: Buffer) =>
    computeFrame(ProxygramSignals.SOCKET_END, socketId),
  createSocketData: (socketId: Buffer, destination: Buffer, data: Buffer) =>
    computeFrame(ProxygramSignals.SOCKET_DATA, socketId, destination, data),
};
