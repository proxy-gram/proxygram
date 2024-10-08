import { get } from 'env-var';

export const config = {
  proxygramToken: get('TTUNNEL_TOKEN').asString(),
  proxygramHost: get('TTUNNEL_HOST').default('proxygram.com').asString(),
  proxygramPort: get('TTUNNEL_PORT').default(80).asPortNumber(),
  proxygramVhosts: get('TTUNNEL_VHOSTS').asArray(','),
};

export type VhostsConfig = {
  subdomain: string;
  port: number;
}[];
