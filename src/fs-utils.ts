import * as path from 'path';
import * as fs from 'fs';

export function createDirectories(filePath: string): void {
    const directoryPath = path.dirname(filePath);
  
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, {recursive: true});
    }
  }

  const readdirAsync = fs.promises.readdir;
  const statAsync = fs.promises.stat;
  
  export async function findTrxFiles(folderPath: string): Promise<string[]> {
      let trxFiles: string[] = [];
  
      async function findFilesRecursively(currentPath: string) {
          const files = await readdirAsync(currentPath);
  
          for (const file of files) {
              const filePath = path.join(currentPath, file);
              const fileStat = await statAsync(filePath);
  
              if (fileStat.isDirectory()) {
                  await findFilesRecursively(filePath);
              } else {
                  if (file.endsWith('.trx')) {
                      trxFiles.push(filePath);
                  }
              }
          }
      }
  
      try {
          await findFilesRecursively(folderPath);
          return trxFiles;
      } catch (error) {
          console.error('Error while reading folder:', error);
          return [];
      }
    }
  
  
    export async function findImageFiles(folderPath: string): Promise<string[]> {
        let trxFiles: string[] = [];
    
        async function findFilesRecursively(currentPath: string) {
            const files = await readdirAsync(currentPath);
    
            for (const file of files) {
                const filePath = path.join(currentPath, file);
                const fileStat = await statAsync(filePath);
    
                if (fileStat.isDirectory()) {
                    await findFilesRecursively(filePath);
                } else {
                    if (file.endsWith('.png')) {
                        trxFiles.push(filePath);
                    }
                }
            }
        }
    
        try {
            await findFilesRecursively(folderPath);
            return trxFiles;
        } catch (error) {
            console.error('Error while reading folder:', error);
            return [];
        }
      }    