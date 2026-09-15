import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

/**
 * File storage behind one small interface, switchable via STORAGE_PROVIDER:
 *  - "local" (default, dev) — writes to UPLOAD_DIR on disk. Does not survive a
 *    redeploy on most hosts (e.g. Render), so it's dev-only.
 *  - "s3" (production) — any S3-compatible bucket: AWS S3, Cloudflare R2,
 *    Backblaze B2. Files are never served from a public bucket URL; downloads
 *    always go through the authenticated /documents/:id/download route, which
 *    streams the object through our own API after checking tenant access.
 */
@Injectable()
export class StorageService {
  private readonly provider: 'local' | 's3';
  private readonly localRoot: string;
  private readonly s3Client?: S3Client;
  private readonly s3Bucket?: string;

  constructor(private readonly config: ConfigService) {
    this.provider = (config.get<string>('STORAGE_PROVIDER') ?? 'local') as 'local' | 's3';
    this.localRoot = path.resolve(config.get<string>('UPLOAD_DIR') ?? './uploads');

    if (this.provider === 's3') {
      const endpoint = config.get<string>('S3_ENDPOINT');
      const region = config.get<string>('S3_REGION') ?? 'auto';
      const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
      const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
      this.s3Bucket = config.get<string>('S3_BUCKET');
      if (!endpoint || !accessKeyId || !secretAccessKey || !this.s3Bucket) {
        throw new Error(
          'STORAGE_PROVIDER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY',
        );
      }
      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials: { accessKeyId, secretAccessKey },
        // R2/B2 expect path-style addressing rather than AWS's virtual-hosted-style.
        forcePathStyle: true,
      });
    }
  }

  private safeName(originalName: string): string {
    const ext = path.extname(originalName).slice(0, 10).replace(/[^a-zA-Z0-9.]/g, '');
    return `${randomUUID()}${ext}`;
  }

  async save(subDir: string, originalName: string, buffer: Buffer): Promise<string> {
    const key = `${subDir}/${this.safeName(originalName)}`;

    if (this.provider === 's3') {
      await this.s3Client!.send(
        new PutObjectCommand({ Bucket: this.s3Bucket, Key: key, Body: buffer, ContentLength: buffer.length }),
      );
      return key;
    }

    const dir = path.join(this.localRoot, subDir);
    await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(path.join(this.localRoot, key.split('/').join(path.sep)), buffer);
    return key;
  }

  async getStream(key: string): Promise<Readable> {
    if (this.provider === 's3') {
      const result = await this.s3Client!.send(new GetObjectCommand({ Bucket: this.s3Bucket, Key: key }));
      return result.Body as Readable;
    }

    const resolved = path.resolve(this.localRoot, key.split('/').join(path.sep));
    if (!resolved.startsWith(this.localRoot)) throw new Error('Invalid storage path');
    return fs.createReadStream(resolved);
  }
}
