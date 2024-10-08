import { config } from './config';
import { Bot, Context } from 'grammy';
import { createLogger, Cypher } from '@proxygram/utils';
import * as process from 'node:process';

const logger = createLogger('bot');

const bot = new Bot(config.telegramToken);

bot.command('key', async (ctx: Context) => {
  const username = ctx.from?.username;
  const cipher = new Cypher(config.signingKey);

  if (!username) {
    logger.error('Username is not found');
    await ctx.reply('Not Supported');
    return;
  }
  const encrypted = cipher.encrypt(username);

  await ctx
    .reply(`Your key is \`${encrypted}\``, {
      parse_mode: 'MarkdownV2',
    })
    .catch((err) => {
      logger.error('Error: %j', err);
    });
});

if (process.env.NODE_ENV !== 'production') {
  bot.command('decode', async (ctx: Context) => {
    const cipher = new Cypher(config.signingKey);

    const text = ctx.match;
    if (!text || typeof text !== 'string') {
      await ctx.reply('No text found');
      return;
    }

    logger.debug('Text: %s', text);
    const decrypted = cipher.decrypt(text);

    logger.debug('Decrypted: %s', decrypted);
    await ctx.reply(`Your username is ${decrypted}`);
  });
}

bot
  .start({
    drop_pending_updates: true,
  })
  .then(() => {
    logger.info('Starting the bot...');
  });

bot.catch((err) => {
  logger.error('Error: %j', err);
});
