import { connect, Socket } from 'node:net';
import { parse } from 'tldts';
import type { Logger } from 'winston';
import assert = require('node:assert');
import { Cypher } from './cryptoUtils';

export function extractHostFromHttpRequest(request: string): string | null {
  const lines = request.split('\r\n');
  for (const line of lines) {
    if (line.startsWith('Host:')) {
      return line.split(' ')[1];
    }
  }
  return null;
}

export function proxyRequest({
  request,
  vhostStore,
  socket,
  logger,
}: {
  request: Buffer;
  vhostStore: VhostStore;
  socket: Socket;
  logger: Logger;
}) {
  logger.debug(`Received request with length: ${request.length}`);
  const data = request.toString();
  const host = extractHostFromHttpRequest(data);
  logger.debug(`Host: ${host}`);
  if (!host) {
    socket.end();
    return;
  }

  const parsed = parse(host);
  if (!parsed.subdomain) {
    socket.end();
    return;
  }

  const vhost = vhostStore.getVhost(parsed.subdomain);
  logger.debug(`Vhost: ${vhost}`);

  if (!vhost) {
    socket.end();
    return;
  }

  logger.debug(`Writing request to vhost`);
  logger.debug(`Socket state: ${socket.readyState}`);

  let vhostSocket: Socket;

  if (vhost.socket) {
    vhostSocket = vhost.socket;
  } else {
    vhostSocket = connect(vhost.address!).setMaxListeners(2);
  }

  logger.debug(
    `Piping data to vhost, max listeners: ${vhostSocket.getMaxListeners()} \n active listeners: ${vhostSocket.listenerCount(
      'data'
    )}`
  );

  vhost.lock(() => {
    return new Promise<void>((resolve) => {
      vhostSocket.write(request);
      vhostSocket.on('data', (data) => {
        logger.debug(`Received data from vhost with length: ${data.length}`);

        socket.write(data);

        if (data.toString('hex').endsWith('300d0a0d0a')) {
          logger.debug(`Ending connection`);

          // close the connection only on server side
          if (vhost.socket) {
            socket.end();
          } else {
            vhostSocket.end();
          }
          vhostSocket.removeAllListeners('data');
          resolve();
        }
      });
      vhostSocket.on('end', () => {
        logger.debug(`Ending connection`);
        socket.end();
        vhostSocket.removeAllListeners('data');
        resolve();
      });

      vhostSocket.on('error', (error) => {
        logger.error(`Error in vhost socket: ${error}`);
        socket.end();
        resolve();
      });
    });
  });
}

export class VhostStore {
  private vhosts: Map<string, Vhost> = new Map();

  public addVhost(vhost: Vhost) {
    this.vhosts.set(vhost.subdomain, vhost);
  }

  public getVhost(subdomain: string) {
    return this.vhosts.get(subdomain);
  }
}

export class Vhost {
  private lockPromise: Promise<void> = Promise.resolve();

  private constructor(
    public subdomain: string,
    public address?: { address: string; port: number },
    public socket?: Socket
  ) {}

  static fromSocket(subdomain: string, socket: Socket) {
    return new Vhost(subdomain, undefined, socket);
  }

  static fromAddress(
    subdomain: string,
    address: { address: string; port: number }
  ) {
    return new Vhost(subdomain, address);
  }

  lock(fn: () => Promise<void>) {
    this.lockPromise = this.lockPromise.then(fn);
  }
}

export function createHandshake(token: string, subdomains: string[]) {
  return `${TtunnelProtocol.HANDSHAKE}/${token}/${subdomains.join(',')}`;
}

export function parseHandshake(handshake: string, cypher: Cypher) {
  const [_, token, subdomainsStr] = handshake.split('/');
  assert(token, 'Token is required');

  const subdomains = subdomainsStr.split(',');
  assert(subdomains.length > 0, 'Subdomains are required');

  let username: string;
  try {
    username = cypher.decrypt(token);
  } catch (error: unknown) {
    throw new Error('Failed to decrypt token');
  }

  if (subdomains.some((s) => !s.endsWith(`.${username}`))) {
    throw new Error('Invalid subdomains');
  }

  return { token, subdomains, username };
}

export enum TtunnelProtocol {
  HANDSHAKE = 'TTUNNEL_HANDSHAKE',
  KEEPALIVE = 'TTUNNEL_KEEPALIVE',
  INVALID_HANDSHAKE = 'TTUNNEL_INVALID_HANDSHAKE',
}
