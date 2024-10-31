import 'dotenv/config';
import { Socket } from 'node:net';
import type { VhostsConfig } from './config';
import { Logger } from 'winston';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  decodeFrame,
  processProxyStart,
  ProxygramFramesFactory,
  ProxygramSignals,
  Vhost,
  VhostStore,
} from '@proxygram/utils';
import { WebSocket } from 'ws';

export function connectToServer({
  vhostsConfig,
  logger,
  proxygramToken,
  proxygramHost,
  proxygramPort,
}: {
  vhostsConfig: VhostsConfig;
  logger: Logger;
  proxygramToken: string;
  proxygramHost: string;
  proxygramPort: number;
}) {
  const vhostStore = new VhostStore();
  const routingTable = new Map<number, Socket>();

  logger.debug(`Vhosts: %o`, vhostsConfig);

  vhostsConfig.forEach((vhost) => {
    vhostStore.addVhost(
      Vhost.fromAddress(vhost.subdomain, {
        address: '127.0.0.1',
        port: vhost.port,
      })
    );
  });

  const subdomains = vhostsConfig.map((vhost) => vhost.subdomain).join();
  const handshake = ProxygramFramesFactory.createHandshake(
    Buffer.from(proxygramToken, 'hex'),
    Buffer.from(subdomains)
  );

  const wsConn = new WebSocket(`ws://${proxygramHost}:${proxygramPort}`);
  wsConn.binaryType = 'nodebuffer';
  wsConn.once('open', () => {
    wsConn.send(handshake);
  });

  wsConn.on('message', (data) => {
    const decoded = decodeFrame(data as Buffer);
    if (decoded?.signal === ProxygramSignals.KEEPALIVE) {
      logger.debug('Server is alive!');
      logger.info(`Successfully connected to proxygram server.
      Now proxying: ${vhostsConfig
        .map(
          ({ subdomain, port }) =>
            `https://${subdomain}.proxygr.am  -->  127.0.0.1:${port}`
        )
        .join(', ')}`);
    } else if (decoded?.signal === ProxygramSignals.INVALID_HANDSHAKE) {
      logger.error(
        'Invalid handshake, make sure you are using the correct token'
      );
      wsConn.close();
    } else if (decoded?.signal === ProxygramSignals.SOCKET_DATA) {
      const { socketId, destination, data } = decoded.data;

      logger.debug(`Received from ${socketId.readUInt32BE()}`);

      processProxyStart({
        logger,
        ws: wsConn,
        data,
        destination,
        vhostStore,
        socketId,
        routingTable,
      });
    }
  });
}
