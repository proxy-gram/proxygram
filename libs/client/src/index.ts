#!/usr/bin/env node
import 'dotenv/config';
import { Command, InvalidOptionArgumentError } from 'commander';
import { createLogger } from '@proxygram/utils';
import { connectToServer } from './connectToServer';
import { config, VhostsConfig } from './config';

const logger = createLogger('client');
const program = new Command();

program
  .command('proxygram', { isDefault: true, hidden: true })
  .version('0.0.1')
  .description('Cli tool for tunneling local services to the internet')
  .option('-t, --token <token>', 'Proxygram token')
  .option(
    '-H, --vhost <vhost...>',
    'Proxygram virtual host in the format {subdomain-username:port}',
    (value, previous) => {
      if (!/^\w+-\w+:\d{0,5}$/.test(value)) {
        throw new InvalidOptionArgumentError(
          'Vhost must be in the format {subdomain-username:port}, e.g. example-omics42:3000. No nested subdomains are allowed.'
        );
      }
      logger.debug('Host value: %o', value);

      return [...previous, value];
    },
    <string[]>[]
  )
  .action((args: { token?: string; vhost?: string[] }) => {
    const proxygramToken = args.token ?? config.proxygramToken;
    if (!proxygramToken) {
      logger.error(
        'Token is required, please provide it with the -t flag or the PROXYGRAM_TOKEN environment variable'
      );
      process.exit(1);
    }
    const vhosts = args.vhost?.length ? args.vhost : config.proxygramVhosts;

    if (!vhosts?.length) {
      logger.error(
        'VHosts are required, please provide them with the -H flag or the PROXYGRAM_VHOSTS environment variable'
      );
      process.exit(1);
    }
    const vhostsConfig: VhostsConfig = vhosts.map((vhost) => {
      const [subdomain, port] = vhost.split(':');
      return { subdomain, port: parseInt(port) };
    });

    const proxygramHost = config.proxygramHost;
    const proxygramPort = config.proxygramPort;

    connectToServer({
      vhostsConfig,
      logger,
      proxygramToken,
      proxygramHost,
      proxygramPort,
    });
  })
  .parse();
