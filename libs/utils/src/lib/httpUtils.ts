import type { Logger } from 'winston';
import assert = require('node:assert');
import { Cypher } from './cypher';
import { WebSocket } from 'ws';

export function extractHostFromHttpRequest(request: string): string | null {
  const lines = request.split('\r\n');
  for (const line of lines) {
    if (line.startsWith('Host:')) {
      return line.split(' ')[1];
    }
  }
  return null;
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
  private constructor(
    public subdomain: string,
    public address?: { address: string; port: number },
    public ws?: WebSocket
  ) {}

  static fromWebSocket(subdomain: string, ws: WebSocket) {
    return new Vhost(subdomain, undefined, ws);
  }

  static fromAddress(
    subdomain: string,
    address: { address: string; port: number }
  ) {
    return new Vhost(subdomain, address);
  }
}

export function parseHandshakeData(
  {
    token,
    subdomains: subdomainsBuffer,
  }: {
    token: Buffer;
    subdomains: Buffer;
  },
  cypher: Cypher,
  logger: Logger
) {
  assert(token, 'Token is required');

  const subdomains = subdomainsBuffer.toString().split(',');
  assert(
    subdomains.length > 0 && subdomains.every((s) => s.length),
    'Subdomains are required'
  );

  let username: string;
  try {
    const decrypted = cypher.decryptBuffer(token);
    username = decrypted.toString();
  } catch (error: unknown) {
    logger.error(`Error decrypting token: ${error}`);
    throw new Error('Failed to decrypt token');
  }

  subdomains.forEach((subdomain) => {
    if (!subdomain.endsWith(`-${username}`)) {
      throw new Error('Invalid subdomains');
    }
    if (subdomains.indexOf(subdomain) !== subdomains.lastIndexOf(subdomain)) {
      throw new Error('Invalid subdomains');
    }
  });

  return { token, subdomains: subdomains, username };
}
