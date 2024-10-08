import { get } from 'env-var';

export const config = {
  signingKey: get('SIGNING_KEY').required().asString(),
};
