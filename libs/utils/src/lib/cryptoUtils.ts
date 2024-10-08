import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class Cypher {
  private algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(key: string) {
    this.key = Buffer.from(key, 'hex');
    this.iv = randomBytes(16);
  }

  encrypt(data: string): string {
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${this.iv.toString('hex')}:${encrypted}`;
  }

  decrypt(data: string): string {
    const [iv, encryptedData] = data.split(':');
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
