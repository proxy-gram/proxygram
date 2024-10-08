import 'dotenv/config';
import { connect } from 'node:net';
import {
  createHandshake,
  proxyRequest,
  TtunnelProtocol,
  Vhost,
  VhostStore,
} from '@proxygram/utils';
import type { VhostsConfig } from './config';
import { Logger } from 'winston';

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

  vhostsConfig.forEach((vhost) => {
    vhostStore.addVhost(
      Vhost.fromAddress(vhost.subdomain, {
        address: '127.0.0.1',
        port: vhost.port,
      })
    );
  });
  const subdomains = vhostsConfig.map((vhost) => vhost.subdomain);
  const handshake = createHandshake(proxygramToken, subdomains);

  const connection = connect(
    {
      host: proxygramHost,
      port: proxygramPort,
      keepAlive: true,
      keepAliveInitialDelay: 1000,
    },
    () => {
      connection.write(handshake);
      connection.on('data', (data) => {
        if (data.toString().startsWith(TtunnelProtocol.KEEPALIVE)) {
          logger.debug('Server is alive!');
        } else if (
          data.toString().startsWith(TtunnelProtocol.INVALID_HANDSHAKE)
        ) {
          logger.error('Handshake error:', data.toString());
          connection.destroy();
        } else {
          proxyRequest({
            request: data,
            vhostStore: vhostStore,
            socket: connection,
            logger,
          });
        }
      });
      connection.on('end', () => {
        logger.debug('Disconnected from server');
      });
    }
  );
  connection.on('error', (error) => {
    logger.error('Failed to connect to server: %j', error);
  });
}
