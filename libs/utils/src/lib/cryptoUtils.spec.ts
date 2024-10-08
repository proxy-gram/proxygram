import { Cypher } from './cryptoUtils';
import * as crypto from 'node:crypto';

describe('Cypher', () => {
  const key =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const data = 'Hello, World!';
  let cypher: Cypher;

  beforeEach(() => {
    cypher = new Cypher(key);
  });

  it('should encrypt data', () => {
    const encrypted = cypher.encrypt(data);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe('');
  });

  it('should decrypt data', () => {
    const encrypted = cypher.encrypt(data);
    const decrypted = cypher.decrypt(encrypted);
    expect(decrypted).toBe(data);
  });

  it('should encrypt and decrypt data consistently', () => {
    const encrypted = cypher.encrypt(data);
    const decrypted = cypher.decrypt(encrypted);
    expect(decrypted).toBe(data);
  });
});
