import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class Cypher {
  private algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly iv: Buffer;

  constructor(key: string) {
    this.key = Buffer.from(key, 'hex');
    this.iv = randomBytes(16);
  }

  encryptBuffer(data: Buffer): Buffer {
    const cipher = createCipheriv(this.algorithm, this.key, this.iv);
    let encrypted = cipher.update(data);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return Buffer.concat([this.iv, encrypted]);
  }

  decryptBuffer(data: Buffer): Buffer {
    const iv = data.subarray(0, 16);
    const encryptedData = data.subarray(16);
    console.log(iv.toString(), encryptedData.toString());
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    const decrypted = decipher.update(encryptedData);
    return Buffer.concat([decrypted, decipher.final()]);
  }
}
