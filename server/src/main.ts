import 'dotenv/config';
import { createServer } from 'node:net';

import {
  createLogger,
  parseHandshake,
  proxyRequest,
  Vhost,
  VhostStore,
  Cypher,
} from '@proxygram/utils';

import { config } from './config';

const cypher = new Cypher(config.signingKey);
const logger = createLogger('server');
const vhostStore = new VhostStore();

const tcpServer = createServer({
  keepAlive: true,
  keepAliveInitialDelay: 1000,
});

tcpServer.listen(3000, () => {
  logger.info('Server is listening on port 3000');
});

tcpServer.on('connection', (socket) => {
  logger.debug(`New connection from: ${socket.remoteAddress}`);
  socket.once('data', (data) => {
    logger.debug(
      `Received data from ${socket.remoteAddress} with length: ${data.length}`
    );

    if (data.toString().startsWith('TTUNNEL_HANDSHAKE')) {
      logger.debug(
        `Received handshake: ${data.toString()} from ${socket.remoteAddress}`
      );
      let parsed: ReturnType<typeof parseHandshake>;

      try {
        parsed = parseHandshake(data.toString(), cypher);
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.error('Error:', error);
          socket.write(`TTUNNEL_INVALID_HANDSHAKE/${error.message}`);
        }
        socket.end();
        return;
      }

      socket.setKeepAlive(true, 1000);
      socket.setMaxListeners(1);
      parsed.subdomains.forEach((subdomain) => {
        logger.debug(`Adding vhost: ${subdomain}`);
        vhostStore.addVhost(Vhost.fromSocket(subdomain, socket));
      });
      socket.write('TTUNNEL_KEEPALIVE');
    } else {
      proxyRequest({ request: data, vhostStore: vhostStore, socket, logger });
    }
  });
});

tcpServer.on('error', (error) => {
  logger.error('Error:', error);
});
