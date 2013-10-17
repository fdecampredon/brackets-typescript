 export class FileIndexManagerMock implements brackets.FileIndexManager {
    fileInfos: brackets.FileInfo[];
    getFileInfoList(indexName: string): JQueryPromise<brackets.FileInfo[]> {
        var result = $.Deferred();
        result.resolve(this.fileInfos);
        return result.promise();
    }
 }
 
 export class ProjectManagerMock {
     getProjectRoot(): brackets.DirectoryEntry {
        return {
            createReader(): brackets.DirectoryReader {
                return null;
            },
            getFile(file:string,  options: { create?: boolean; exclusive?: boolean;}, success: (file: brackets.FileEntry) => void, error?: (error:any) => void):void {
                success({
                    isDirectory: false,
                    isFile: true,
                    fullPath: file,
                    name: file.substr(file.lastIndexOf('/'), file.length)
                });
            },
            getDirectory(directory:string, options: { create?: boolean; exclusive?: boolean;}, success: (file: brackets.FileEntry) => void, error?: (error:any) => void):void {
                success(null)
            },
            isDirectory: true,
            isFile: false,
            fullPath: '',
            name: '',
        };
    }
}
 
export class DocumentManagerMock implements brackets.DocumentManager {
    getCurrentDocument(): brackets.Document {
        return null;
    }
}