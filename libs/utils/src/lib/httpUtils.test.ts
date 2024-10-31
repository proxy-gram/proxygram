import { Cypher } from './cypher';
import { Logger } from 'winston';
import Mocked = jest.Mocked;
import { parseHandshakeData } from './httpUtils';

describe('parseHandshakeData', () => {
  const key =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  let cypher: Cypher;
  const logger: Partial<Mocked<Logger>> = {
    error: jest.fn(),
  };
  beforeEach(() => {
    cypher = new Cypher(key);
  });

  test('valid token + valid + subdomains', () => {
    const token = cypher.encryptBuffer(Buffer.from('username'));
    const subdomains = Buffer.from('subdomain1-username,subdomain2-username');

    const result = parseHandshakeData(
      { token, subdomains },
      cypher,
      logger as Logger
    );
    expect(result).toBeDefined();
  });

  test('invalid token', () => {
    const token = Buffer.from('username');
    const subdomains = Buffer.from('subdomain1-username,subdomain2-username');

    expect(() =>
      parseHandshakeData({ token, subdomains }, cypher, logger as Logger)
    ).toThrow('Failed to decrypt token');
  });

  test('valid token + invalid subdomains', () => {
    const token = cypher.encryptBuffer(Buffer.from('username'));
    const subdomains = Buffer.from('subdomain1-username,subdomain2');

    expect(() =>
      parseHandshakeData({ token, subdomains }, cypher, logger as Logger)
    ).toThrow('Invalid subdomains');
  });
  test('valid token + duplicate subdomains', () => {
    const token = cypher.encryptBuffer(Buffer.from('username'));
    const subdomains = Buffer.from('subdomain1-username,subdomain1-username');

    expect(() =>
      parseHandshakeData({ token, subdomains }, cypher, logger as Logger)
    ).toThrow('Invalid subdomains');
  });

  test('no subdomains', () => {
    const token = cypher.encryptBuffer(Buffer.from('username'));

    expect(() =>
      parseHandshakeData(
        { token, subdomains: Buffer.from('') },
        cypher,
        logger as Logger
      )
    ).toThrow('Subdomains are required');
  });
});
