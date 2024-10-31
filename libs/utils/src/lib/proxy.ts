import { Socket } from 'node:net';
import { Logger } from 'winston';
import {
  extractHostFromHttpRequest,
  parseHandshakeData,
  Vhost,
  VhostStore,
} from './httpUtils';
import {
  decodeFrame,
  ProxygramFramesFactory,
  ProxygramSignals,
} from './protocol';
import { Cypher } from './cypher';
import * as net from 'node:net';
import { WebSocket } from 'ws';

export function tryParseFrame({
  logger,
  ws,
  data,
  cypher,
  vhostStore,
  routingTable,
}: {
  routingTable: Map<number, Socket>;
  vhostStore: VhostStore;
  cypher: Cypher;
  ws: WebSocket;
  data: Buffer;
  logger: Logger;
}): boolean {
  const decoded = decodeFrame(data);

  if (!decoded) {
    return false;
  }
  logger.debug(`Decoded frame: %o`, decoded);
  if (decoded.signal === ProxygramSignals.HANDSHAKE) {
    try {
      const handshakeData = parseHandshakeData(decoded.data, cypher, logger);
      logger.debug(`Adding vhosts: ${handshakeData.subdomains}`);
      for (const subdomain of handshakeData.subdomains) {
        vhostStore.addVhost(Vhost.fromWebSocket(subdomain, ws));
      }
      ws.emit('handshake');
      ws.send(ProxygramFramesFactory.createKeepAlive());
    } catch (err) {
      if (err instanceof Error) {
        logger.error(`Handshake error %s`, err.message);
        ws.send(
          ProxygramFramesFactory.createInvalidHandshake(
            Buffer.from(err.message)
          )
        );
      }
      ws.terminate();
    }
  } else if (decoded.signal === ProxygramSignals.SOCKET_DATA) {
    const { socketId, data } = decoded.data;
    logger.debug(
      `----Received data from vhost with actual length: ${
        data.length
      }, forwarding to origin: ${socketId.readUInt32BE()}`
    );
    logger.debug(`----Routing table: %o`, routingTable.keys());
    const origin = routingTable.get(socketId.readUInt32BE());
    if (!origin) {
      logger.error('Origin not found');
      return true;
    }
    logger.debug(`----Origin status: ${origin.readyState}`);
    origin.write(data, (err) => {
      logger.debug(
        `------Data with length ${data.length} written, error: ${err}`
      );
    });
  } else if (decoded.signal === ProxygramSignals.SOCKET_END) {
    const { socketId } = decoded.data;
    const origin = routingTable.get(socketId.readUInt32BE());
    if (!origin) {
      logger.error('Origin not found, dropping frame');
      return true;
    }
    origin.end();
    routingTable.delete(socketId.readUInt32BE());
  }

  return true;
}

export function proxyStart({
  logger,
  socket,
  data,
  socketId,
  vhostStore,
}: {
  vhostStore: VhostStore;
  socket: Socket;
  data: Buffer;
  socketId: number;
  logger: Logger;
}) {
  const host = extractHostFromHttpRequest(data.toString());
  logger.debug(`----Host: ${host}`);
  if (!host) {
    socket.end();
    return;
  }
  const subdomain = host.split('.')[0];
  logger.debug(`----Subdomain: ${subdomain}`);

  if (!subdomain) {
    socket.end();
    return;
  }

  const vhost = vhostStore.getVhost(subdomain);
  logger.debug(`----Vhost: %s`, vhost?.subdomain);

  if (!vhost || !vhost.ws) {
    socket.end();
    return;
  }

  const socketIdBuf = Buffer.alloc(4);
  socketIdBuf.writeUInt32BE(socketId);
  logger.debug(`----Sending data frame with socketId: ${socketId}`);
  const socketDataFrame = ProxygramFramesFactory.createSocketData(
    socketIdBuf,
    Buffer.from(subdomain),
    data
  );
  vhost.ws.send(socketDataFrame);
}

export function processProxyStart({
  logger,
  ws,
  socketId,
  data,
  vhostStore,
  destination,
  routingTable,
}: {
  routingTable: Map<number, Socket>;
  vhostStore: VhostStore;
  ws: WebSocket;
  socketId: Buffer;
  destination: Buffer;
  data: Buffer;
  logger: Logger;
}) {
  const host = destination.toString();
  logger.debug(`Host: ${host}`);
  if (!host) {
    ws.terminate();
    return;
  }

  const vhost = vhostStore.getVhost(host);
  logger.debug(`Vhost: ${vhost?.subdomain}`);

  if (!vhost || !vhost.address) {
    ws.terminate();
    return;
  }
  let vSocket = routingTable.get(socketId.readUInt32BE());
  if (vSocket) {
    vSocket.write(data);
  } else {
    vSocket = net.createConnection(vhost.address);
    routingTable.set(socketId.readUInt32BE(), vSocket);

    vSocket.unref();
    logger.debug(`----Default buffer size ${vSocket.writableLength}`);
    vSocket.on('data', (data) => {
      logger.debug(`Received data from vhost with length: ${data.length}`);
      const socketDataFrame = ProxygramFramesFactory.createSocketData(
        socketId,
        destination,
        data
      );
      logger.debug(
        `----Sending data frame with length: ${socketDataFrame.length}`
      );
      ws.send(socketDataFrame);
    });
    vSocket.on('end', () => {
      logger.debug('Vhost ended connection');
      const socketEndFrame = ProxygramFramesFactory.createSocketEnd(socketId);
      ws.send(socketEndFrame);
      routingTable.delete(socketId.readUInt32BE());
    });
    vSocket.on('error', (error) => {
      logger.error('Error:', error);
      const socketEndFrame = ProxygramFramesFactory.createSocketEnd(socketId);
      ws.send(socketEndFrame);
      routingTable.delete(socketId.readUInt32BE());
    });
    vSocket.on('close', () => {
      routingTable.delete(socketId.readUInt32BE());
    });

    vSocket.write(data);
  }
}
