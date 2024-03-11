import path from 'path';
import fs from 'fs/promises';
import * as fileType from 'file-type';
import sharp from 'sharp';
import { IUnitTestResult } from './interfaces/unit-test-result.type.js';

export interface AttachmentBase64 {
    filePath: string,
    fileName: string, 
    base64Data: string, 
    fileType: string
}


export async function addAttachmentFiles(tests: IUnitTestResult[], filePaths: string[]): Promise<IUnitTestResult[]> {
    const dirToStart = "TestData";
    
    for (const test of tests) {
        const gherkinAttachments = test.gherkinLogs?.filter(a => a.attachments && a.attachments.length > 0).flatMap(m => m.attachments);
        if (gherkinAttachments) {
            let files: AttachmentBase64[] = [];

            for (const gherkinFilePath of gherkinAttachments) {
                const testDataIndex = gherkinFilePath!.indexOf(dirToStart);
                const truncatedPath = gherkinFilePath!.substring(testDataIndex).replace(/\//g, "\\");
                const filePath = filePaths.find(f => f.endsWith(truncatedPath))!;
                
                const fileBase64 = await convertFileToBase64(filePath);
                if (fileBase64) {
                    files.push(fileBase64);
                }
            }
            test.attachmentFiles = files;
        }
    }

    return tests;
}

async function convertFileToBase64(filePath: string): Promise<AttachmentBase64 | undefined>  {
    const imgWidth = 1200;
    const imgHeight = 675;

    try {
        const data = await fs.readFile(filePath);
        const fileName = path.basename(filePath);
        const type = await getFileType(data);
        if (type.startsWith('image')) {
            const resizedData = await resizeImage(data, imgWidth, imgHeight);
            const base64Data = Buffer.from(resizedData).toString('base64');
            return { filePath, fileName, base64Data, fileType: type };
        } else {
            const base64Data = Buffer.from(data).toString('base64');
            return { filePath, fileName, base64Data, fileType: type };
        }
    } catch (error) {
        console.error('file system error', error);
        return undefined; 
    }
}

async function getFileType(data: Buffer): Promise<string> {
    const type = await fileType.fileTypeFromBuffer(data);
    return type ? type.mime : 'unknown';
}

async function resizeImage(data: Buffer, width: number, height: number): Promise<Buffer> {
    return await sharp(data)
        .resize({ width: width, height: height, fit: 'inside' })
        .toBuffer();
}