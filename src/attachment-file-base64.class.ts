import path from 'path';
import fs from 'fs/promises';
import * as fileType from 'file-type';
import sharp from 'sharp';
import { IUnitTestResult } from './interfaces/unit-test-result.type.js';
import { IAttachmentBase64 } from './interfaces/attachment-base64.type.js';
import Jimp from 'jimp';

export class AttachmentFilesBase64 {

    public static async addAttachmentFilesAsync(tests: IUnitTestResult[], filePaths: string[]): Promise<IUnitTestResult[]> {
        const dirToStart = "TestData";

        for (const test of tests) {
            const gherkinAttachments = test.gherkinLogs?.filter(a => a.attachments && a.attachments.length > 0).flatMap(m => m.attachments);
            if (gherkinAttachments) {
                let files: IAttachmentBase64[] = [];

                for (const gherkinFilePath of gherkinAttachments) {
                    const testDataIndex = gherkinFilePath!.indexOf(dirToStart);
                    const truncatedPath = gherkinFilePath!.substring(testDataIndex).replace(/\//g, "\\");
                    const filePath = filePaths.find(f => f.endsWith(truncatedPath))!;

                    let fileBase64;
                    try {
                        fileBase64 = await this.convertFileToBase64Async(filePath);
                    } catch (error) {
                        console.error(`Attachment not found! File system error for test '${test.testName}' due to file path '${gherkinFilePath}' not found\n`, error);
                    }

                    if (fileBase64) {
                        files.push(fileBase64);
                    }
                }
                test.attachmentFiles = files;
            }
        }

        return tests;
    }

    private static async convertFileToBase64Async(filePath: string): Promise<IAttachmentBase64> {
        const imgWidth = 1200;
        const imgHeight = 675;

        const data = await fs.readFile(filePath);
        const fileName = path.basename(filePath);
        const type = await this.getFileTypeAsync(data);
        if (type.startsWith('image')) {
            const base64Data = await this.resizeImageAsync2(data, imgWidth, imgHeight);
            return { filePath, fileName, base64Data, fileType: type };
        } else {
            const base64Data = Buffer.from(data).toString('base64');
            return { filePath, fileName, base64Data, fileType: type };
        }
    }

    private static async getFileTypeAsync(data: Buffer): Promise<string> {
        const type = await fileType.fileTypeFromBuffer(data);
        return type ? type.mime : 'unknown';
    }

    private static async resizeImageAsync(data: Buffer, width: number, height: number): Promise<string> {
        const resizedData = await sharp(data)
            .resize({ width: width, height: height, fit: 'inside' })
            .toBuffer();
         return Buffer.from(resizedData).toString('base64');
    }

    private static async resizeImageAsync2(
        data: Buffer,
        w: number,
        h: number
      ): Promise<string> {
        try {
          const image = await Jimp.read(data)
          const { width, height } = image.bitmap
          let resizedImage
          if (width > height) {
            w = width > w ? w : width
            resizedImage = image.resize(w, Jimp.AUTO)
          } else {
            h = height > h ? h : height
            resizedImage = image.resize(Jimp.AUTO, h)
          }
          return await resizedImage.getBase64Async(Jimp.AUTO)
        } catch (err) {
          console.error('Error while resizing:', err)
          throw err
        }
      }
}