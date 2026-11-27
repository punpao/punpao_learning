// Fake FileStorage for tests: no AWS. It records every call, and "uploaded"
// says which keys exist (a test adds a key there to act like the browser's PUT).
import type { FileStorage } from "../src/shared/storage/file.storage.js";

export class FakeFileStorage implements FileStorage {
  uploadCalls: { key: string; contentType: string; expiresInSeconds: number }[] = [];
  downloadCalls: { key: string; expiresInSeconds: number }[] = [];
  existsCalls: string[] = [];
  uploaded = new Set<string>();

  async createUploadUrl(key: string, contentType: string, expiresInSeconds: number) {
    this.uploadCalls.push({ key, contentType, expiresInSeconds });
    return `https://fake-storage.test/${key}?signature=fake`;
  }

  async exists(key: string) {
    this.existsCalls.push(key);
    return this.uploaded.has(key);
  }

  async createDownloadUrl(key: string, expiresInSeconds: number) {
    this.downloadCalls.push({ key, expiresInSeconds });
    return `https://fake-storage.test/${key}?download=fake`;
  }
}
