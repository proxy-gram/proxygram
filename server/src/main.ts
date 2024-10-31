import 'dotenv/config';
import { createServer, Socket } from 'node:net';
import {
  createLogger,
  VhostStore,
  Cypher,
  tryParseFrame,
  proxyStart,
} from '@proxygram/utils';

import { config } from './config';
import { WebSocketServer } from 'ws';

const cypher = new Cypher(config.signingKey);
const logger = createLogger('server');
const vhostStore = new VhostStore();
const routingTable = new Map<number, Socket>();
const webSocketServer = new WebSocketServer({ port: 3300 });

webSocketServer.on('connection', (ws) => {
  ws.binaryType = 'nodebuffer';

  // Grace period for handshake
  const timeout = setTimeout(() => {
    logger.debug(`No handshake received, terminating connection`);
    ws.terminate();
  }, 1000);

  ws.on('handshake', () => {
    clearTimeout(timeout);
  });

  ws.on('message', (message) => {
    if (!(message instanceof Buffer)) {
      logger.debug(`Received an invalid message`);
      ws.terminate();
      return;
    }

    const frameParseResult = tryParseFrame({
      logger,
      ws,
      data: message,
      cypher,
      vhostStore,
      routingTable,
    });

    if (!frameParseResult) {
      logger.error('Error parsing frame');
      ws.terminate();
      return;
    }
  });
});

const tcpServer = createServer();

tcpServer.listen(3000, () => {
  logger.info('Server is listening on port 3000');
});

tcpServer.on('connection', (socket) => {
  const remotePort = socket.remotePort;
  if (!remotePort) {
    logger.error('No remote port, dropping connection');
    socket.destroy();
    return;
  }

  routingTable.set(remotePort, socket);
  logger.debug(
    `Connection from ${socket.remoteAddress}:${remotePort} to ${socket.localAddress}:${socket.localPort}`
  );

  socket.on('data', (data) => {
    logger.debug(
      `--Received data from ${remotePort} with length %s`,
      data.length
    );
    logger.debug(`--Proxying data from ${remotePort}`);
    proxyStart({ logger, socket, vhostStore, data, socketId: remotePort });
    socket.resume();
  });
  socket.on('close', (err) => {
    logger.debug(`Connection closed from ${remotePort}, had error: ${err}`);
    routingTable.delete(remotePort);
  });
  socket.on('end', () => {
    logger.debug(`Connection ended from ${remotePort}`);
    routingTable.delete(remotePort);
  });
  socket.on('error', (err) => {
    logger.error(`Error in connection from ${remotePort}: ${err}`);
    routingTable.delete(remotePort);
  });
  socket.on('timeout', () => {
    logger.debug(`Connection timed out from ${remotePort}`);
    routingTable.delete(remotePort);
  });
});

tcpServer.on('error', (error) => {
  logger.error('Error:', error);
});
