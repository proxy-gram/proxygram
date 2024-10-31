import {
  computeFrameTail,
  decodeFrameTail,
  decodeFrame,
  ProxygramFramesFactory,
  computeFrame,
  ProxygramSignals,
} from './protocol';

describe('signals', () => {
  describe('computeFrame', () => {
    test('compute 3 parts', () => {
      const frame = computeFrameTail(
        Buffer.from('a'),
        Buffer.from('b'),
        Buffer.from('c')
      );

      expect(frame.subarray(0, 16)).toEqual(
        Buffer.concat([
          Buffer.from([0x00, 0x00, 0x00, 0x03]),
          Buffer.from([0x00, 0x00, 0x00, 0x01]),
          Buffer.from([0x00, 0x00, 0x00, 0x01]),
          Buffer.from([0x00, 0x00, 0x00, 0x01]),
        ])
      );

      expect(frame.subarray(16, 17)).toEqual(Buffer.from('a'));
      expect(frame.subarray(17, 18)).toEqual(Buffer.from('b'));
      expect(frame.subarray(18, 19)).toEqual(Buffer.from('c'));
    });
    test('decode 3 parts', () => {
      const frame = computeFrameTail(
        Buffer.from('a'),
        Buffer.from('b'),
        Buffer.from('c')
      );

      const decoded = decodeFrameTail(frame);
      expect(decoded).toEqual([
        Buffer.from('a'),
        Buffer.from('b'),
        Buffer.from('c'),
      ]);
    });
    test('compute 2 parts', () => {
      const frame = computeFrameTail(
        Buffer.from('token'),
        Buffer.from('subdomains')
      );

      expect(frame.subarray(0, 12)).toEqual(
        Buffer.concat([
          Buffer.from([0x00, 0x00, 0x00, 0x02]),
          Buffer.from([0x00, 0x00, 0x00, 0x05]),
          Buffer.from([0x00, 0x00, 0x00, 0xa]),
        ])
      );
      expect(frame.subarray(12, 17)).toEqual(Buffer.from('token'));
      expect(frame.subarray(17, 27)).toEqual(Buffer.from('subdomains'));
      expect(frame.subarray(27)).toEqual(Buffer.from([]));
    });
  });
  test('handshake', () => {
    const handshake = ProxygramFramesFactory.createHandshake(
      Buffer.from('token'),
      Buffer.from('subdomains')
    );
    expect(handshake.subarray(0, 1).equals(Buffer.from([0x00]))).toBeTruthy();
    expect(handshake).toEqual(
      Buffer.concat([
        Buffer.from([0x00]),
        Buffer.concat([
          Buffer.from([0x00, 0x00, 0x00, 0x02]),
          Buffer.from([0x00, 0x00, 0x00, 0x05]),
          Buffer.from([0x00, 0x00, 0x00, 0xa]),
          Buffer.from('token'),
          Buffer.from('subdomains'),
        ]),
      ])
    );
    const decoded = decodeFrame(handshake);
    expect(decoded).toEqual({
      signal: 0,
      data: {
        token: Buffer.from('token'),
        subdomains: Buffer.from('subdomains'),
      },
    });
  });
  test('socket_data', () => {
    const frame = computeFrame(
      ProxygramSignals.SOCKET_DATA,
      Buffer.from('data')
    );
    expect(frame).toEqual(
      Buffer.concat([
        Buffer.from([0x05]),
        Buffer.from([0x00, 0x00, 0x00, 0x01]),
        Buffer.from([0x00, 0x00, 0x00, 0x04]),
        Buffer.from('data'),
      ])
    );
  });
});
