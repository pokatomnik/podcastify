declare interface Uploader {
  /**
   * Uploads a file with specified `filePath` to some web storage
   * @param filePath path of file to upload
   * @returns link for file or `null` if upload failed
   */
  upload(filePath: string): Promise<string | null>;
}
