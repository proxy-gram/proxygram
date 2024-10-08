import { get } from 'env-var';

export const config = {
  telegramToken: get('TELEGRAM_TOKEN').required().asString(),
  signingKey: get('SIGNING_KEY').required().asString(),
};
