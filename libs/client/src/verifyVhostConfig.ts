import { VhostsConfig } from './config';

export function verifyVhostConfig(vhosts: string[]): VhostsConfig {
  let username: string | undefined;
  const usedSubdomains = new Set<string>();
  const vhostConfig = vhosts.map((vhost) => {
    const [subdomain, port] = vhost.split(':');
    if (!subdomain || !port) {
      throw new Error(`Invalid vhost configuration: ${vhost}`);
    }
    const maybeUsername = subdomain.split('-')[1];
    if (!maybeUsername) {
      throw new Error(
        `Invalid vhost configuration: ${vhost}, subdomain must be suffixed with a username`
      );
    }
    if (username && username !== maybeUsername) {
      throw new Error(
        `Invalid vhost configuration: ${vhost}, all vhosts must have the same username`
      );
    }
    username = maybeUsername;

    if (usedSubdomains.has(subdomain)) {
      throw new Error(
        `Invalid vhost configuration: ${vhost}, duplicate subdomain`
      );
    }
    usedSubdomains.add(subdomain);

    return { subdomain, port: parseInt(port, 10) };
  });

  return vhostConfig;
}
