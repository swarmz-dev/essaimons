import File from '#models/file';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import axios from 'axios';
import { fileTypeFromBuffer, FileTypeResult } from 'file-type';
import { cuid } from '@adonisjs/core/helpers';
import { fileURLToPath } from 'node:url';

export default class FileService {
    /**
     * Deletes a file from the 'public' directory based on the given File object.
     *
     * @param {File} file - The File object containing the path to delete.
     * @returns {void}
     */
    public delete(file: File): void {
        fs.unlink(file.path, (error: any): void => {
            if (error) {
                console.error(error.message);
            }
        });
    }

    /**
     * Retrieves information about a file, such as size, MIME type, extension, and name.
     *
     * @param {string} filePath - The path to the file.
     * @returns {Promise<{ size: number; mimeType: string; extension: string; name: string }>}
     *          An object containing file size, MIME type, extension, and filename.
     */
    public async getFileInfo(filePath: string): Promise<{ size: number; mimeType: string; extension: string; name: string }> {
        const stats = await fsPromises.stat(filePath);

        const size: number = stats.size;
        const extension: string = path.extname(filePath);
        const name: string = path.basename(filePath);
        const mimeType: string = mime.lookup(filePath) || 'unknown';

        return { size, mimeType, extension, name };
    }

    /**
     * Downloads an OAuth profile picture from a given URL, detects its file type,
     * saves it locally with a unique filename, and returns the relative path.
     *
     * @param {string} url - The URL of the profile picture to download.
     * @returns {Promise<string>} The relative path to the saved profile picture.
     * @throws Will throw an error if the file type cannot be detected or saving fails.
     */
    public async saveOauthProfilePictureFromUrl(url: string): Promise<string> {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer: Buffer = Buffer.from(response.data);

        const fileTypeResult: FileTypeResult | undefined = await fileTypeFromBuffer(buffer);
        if (!fileTypeResult) {
            throw new Error('Unable to detect file type');
        }

        const filename = `${cuid()}-${Date.now()}.${fileTypeResult.ext}`;
        const __filename: string = fileURLToPath(import.meta.url);
        const __dirname: string = path.dirname(__filename);
        const folderPath: string = path.join(__dirname, '../../static/profile-picture');

        await fsPromises.mkdir(folderPath, { recursive: true });

        const filePath: string = path.join(folderPath, filename);

        try {
            await fsPromises.writeFile(filePath, buffer);
        } catch {
            throw new Error('Failed to save the avatar from URL');
        }

        return `static/profile-picture/${filename}`;
    }
}
