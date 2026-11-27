// Port (interface) for file storage. Routes depend on this, not on S3,
// so tests can pass a fake and we could swap S3 for something else later.
export interface FileStorage {
  // Returns a short-lived URL the CLIENT uses to upload the file itself (HTTP PUT),
  // so the file bytes never pass through our server.
  createUploadUrl(key: string, contentType: string, expiresInSeconds: number): Promise<string>;

  // True if a file with this key is stored. Used to check that the client
  // really uploaded before we save the key on a product.
  exists(key: string): Promise<boolean>;

  // Returns a short-lived URL that lets anyone holding it download (GET) this file.
  // The bucket itself stays private.
  createDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
}
