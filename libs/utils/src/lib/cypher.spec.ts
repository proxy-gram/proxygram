import { Cypher } from './cypher';

describe('Cypher', () => {
  const key =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const data = Buffer.from('Hello, World!');
  let cypher: Cypher;

  beforeEach(() => {
    cypher = new Cypher(key);
  });

  test('encryptBuffer', () => {
    const encrypted = cypher.encryptBuffer(data);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe('');
  });

  test('encryptBuffer+decryptBuffer', () => {
    const encrypted = cypher.encryptBuffer(data);
    const decrypted = cypher.decryptBuffer(encrypted);
    expect(decrypted).toEqual(data);
  });

  it.each(Array.from(Array(10).keys()))('consistency %i', () => {
    const encrypted = cypher.encryptBuffer(data);
    const decrypted = cypher.decryptBuffer(encrypted);
    expect(decrypted).toEqual(data);
  });
});
