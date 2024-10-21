import { get } from 'env-var';

export const config = {
  proxygramToken: get('PROXYGRAM_TOKEN').asString(),
  proxygramHost: get('PROXYGRAM_HOST').default('proxygr.am').asString(),
  proxygramPort: get('PROXYGRAM_PORT').default(80).asPortNumber(),
  proxygramVhosts: get('PROXYGRAM_VHOSTS').asArray(','),
};

export type VhostsConfig = {
  subdomain: string;
  port: number;
}[];
