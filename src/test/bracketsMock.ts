//   Copyright 2013 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

/*istanbulify ignore file*/

export var FILE_NOT_FOUND = 'not found';

export class FileSystem {
    constructor(public root: Directory) {
        root.setParent(null);
    }
    
    private listeners:  { [event : string]: {(...rest: any[]): any }[] } = {};
    
    getFileForPath(path: string): File {
        var result = this.getEntryForFile(path, 'file')
        if (!result) {
            result = new File({
                name: path.substr(path.lastIndexOf('/') +1), 
                content : null
            });
            result.fullPath = path;
            result.parentPath = path.substr(0, path.lastIndexOf('/'))
            result.id = path;
        }
        
        return result;
    }
    
    
    
    on(event: string, handler: (...rest: any[]) => any): void {
        var listeners = this.listeners[event];
        if (listeners && listeners.indexOf(handler) !== -1) {
            return
        }
        if (!listeners) {
            listeners = this.listeners[event]= []
        }
        listeners.push(handler);
    }
    
    off(event: string, handler: (...rest: any[]) => any): void {
         var listeners = this.listeners[event],
             index = listeners && listeners.indexOf(handler);
        if (!listeners || index === -1) {
            return;
        }
        listeners.splice(index, 1);
        if (listeners.length = 0) {
            this.listeners[event] = null;
        }
    }
    
    dispatch(event: string, ...args: any[]) {
        var listeners = this.listeners[event];
        if (!listeners) {
            return
        }
        listeners.forEach(listerner => listerner.apply(null, [{}].concat(args)));
    }
    
    refresh(dir: Directory) {
        this.root = dir;
        this.root.setParent(null);
        this.dispatch('change', null);
    }
    
    updateFile(path: string, content: string) {
        var file = this.getFileForPath(path);
        file.content = content;
        this.dispatch('change', file);
    }
    
    renameFile(path: string, newPath: string) {
        var entry: FileSystemEntry = this.getEntryForFile(path, null),
            dir = this.getEntryForFile(entry.parentPath, 'directory');
        if (!entry || !dir) {
            throw new Error('unknown dir : \'' + path + '\'');
        }
        
        var newEntry: FileSystemEntry;
        if (entry.isFile) {
            newEntry = new File({
                name: newPath.substr(newPath.lastIndexOf("/") + 1),
                content: (<File>entry).content
            });
        } else {
            newEntry = new Directory({
                name: newPath.substr(newPath.lastIndexOf("/", newPath.length - 2) + 1),
                children: (<Directory>entry).children
            });
        }
        dir.remove(entry);
        dir.add(newEntry);
        newEntry.setParent(dir);
        this.dispatch('rename',path, newPath);
    }
    

    
    deleteEntry(path: string) {
        var entry = this.getEntryForFile(path, null),
            dir = this.getEntryForFile(entry.parentPath, 'directory');
        if (!dir) {
            throw new Error('unknown dir : \'' + path + '\'');
        }
        dir.remove(entry);
        this.dispatch('change', dir)
    }
    
    addEntry(entry:FileSystemEntry) {
        var dir = this.getEntryForFile(entry.parentPath, 'directory');
        if (!dir) {
            throw new Error('unknown dir : \'' + entry.parentPath + '\'');
        }
        dir.add(entry);
        this.dispatch('change', dir)
    }
    
    getEntryForFile(path: string, type: 'directory'): Directory
    getEntryForFile(path: string, type: 'file'): File
    getEntryForFile(path: string, type: string): FileSystemEntry
    getEntryForFile(path: string, type: string): FileSystemEntry
    {
        var result: FileSystemEntry;
        this.root.visit(entry => {
            if(entry.fullPath === path ) {
                if (type === 'file' && !entry.isFile) {
                    return false
                } else if (type === 'directory' && !entry.isDirectory) {
                    return false;
                }
                result = <FileSystemEntry> entry;
                return false;
            }
            return true;
        }, null, () => 0)
        return result;
    }
    
}

export function d(options: DirectoryOptions) {
    return new Directory(options);
}

export function f(options: FileOptions, fullPath?: string, parentPath? : string) {
    var file = new File(options);
    if (typeof fullPath !== 'undefined') {
        file.id = file.fullPath = fullPath;
    }
    if (typeof parentPath !== 'undefined') {
        file.parentPath = parentPath
    }
    return file;
}

export class FileSystemEntry implements brackets.FileSystemEntry {
    fullPath: string;
    name: string;
    parentPath: string;
    id: string;
    isFile: boolean;
    isDirectory: boolean;
    
    setParent(directory: Directory) {
        if (directory) {
            this.parentPath = directory.fullPath;
            this.fullPath = directory.fullPath + this.name;
            this.id = this.fullPath;
        }
        if (this.isDirectory) {
            var dir = <Directory> this;
            dir.children.forEach(entry => entry.setParent(dir));
        }
    }
    
    
    exists(callback: (err: string, exist: boolean) => any): void {
        callback(null, true)
    }
    
    

    stat(callback: (err: string, stat: brackets.FileSystemStats) => any): void {
        callback(null, null);
    }
    

    rename(newFullPath:string, callback?: (err: string) => any):void {
        callback(null);
    }
    unlink(callback?: (err: string) => any): void {
        callback(null);
    }
    
    moveToTrash(callback?: (err: string) => any): void {
        callback(null);
    }
    
    visit(visitor: (entry: brackets.FileSystemEntry) => boolean, options: {failFast?: boolean; maxDepth?: number; maxEntries?: number},
        callbak: (err: string) => any): void {
            this.internalVisit(visitor);
            callbak(null)
    }
    
    private internalVisit(visitor: (entry: brackets.FileSystemEntry) => boolean): boolean {
        if (!visitor(this)) {
            return false
        }
        if (this.isDirectory) {
            var result: boolean
            (<Directory>this).getContents((err: string, files: FileSystemEntry[]) => {
                result = files.every(file => file.internalVisit(visitor))
            });
            return result;
        } else {
            return true;
        }
    }
}

export interface FileOptions {
    name: string;
    content : string;
}


export class File extends FileSystemEntry implements brackets.File {
    
    public content: string;
    
    constructor(options: FileOptions) {
        super();
        this.isDirectory = false;
        this.isFile = true;
        if (!options) {
            throw new  Error('options manadatory')
        }
        this.name = options.name;
        this.content = options.content;
    }
    

    
    /**
     * Read a file.
     *
     * @param options Currently unused.
     * @param callback Callback that is passed the FileSystemError string or the file's contents and its stats.
     */
    read(options: {}, callback: (err: string, data: string, stat: brackets.FileSystemStats) => any): void {
        setTimeout(() => {
            if (this.content) {
                callback(null, this.content, null);
            } else {
                callback(FILE_NOT_FOUND, null, null)
            }
        }, 0);
    }
       
    
    /**
     * Write a file.
     *
     * @param data Data to write.
     * @param options Currently unused.
     * @param callback Callback that is passed the FileSystemError string or the file's new stats.
     */
    write(data: string, options? : {}, callback?: (err: string, stat: brackets.FileSystemStats) => any ) : void {
        
    }
    
    
}

export interface DirectoryOptions {
    name: string;
    children : FileSystemEntry[];
}

export class Directory extends FileSystemEntry implements brackets.Directory {
    children : FileSystemEntry[];
    constructor(options: DirectoryOptions) {
        super();
        this.isDirectory = true;
        this.isFile = false;
        if (!options) {
            throw new  Error('options manadatory')
        }
        this.name = options.name;
        this.fullPath = this.name;
        this.id = this.fullPath;
        this.children = options.children || [];
    }
  
    create(callback:  (err: string, stat: brackets.FileSystemStats) => any): void {
        callback(null, null);
    }
    
    getContents(callback: (err: string, files: FileSystemEntry[], stats: brackets.FileSystemStats, errors: { [path: string]: string; }) => any) {
        callback(null, this.children , null, null)
    }
    
    remove(entry: FileSystemEntry) {
        var index = this.children.indexOf(entry);
        if (index !== -1) {
            this.children.splice(index, 1)
        }
    }
    
    add(entry: FileSystemEntry) {
        this.children.push(entry);
    }
}


export class ProjectManager {
    
    constructor(
        private fs:FileSystem
    ){}
    
    async: boolean = false;
    
    getAllFiles(filter? : (file: brackets.File) => boolean, includeWorkingSet? : boolean)  {
        var deferred = $.Deferred<brackets.File[]>(),
            files: brackets.File[] = [];
        var resolve = () => {
            this.fs.root.visit(entry => {
                if (entry.isFile) {
                    files.push(<brackets.File> entry)
                }
                return true;
            }, null, () => {
                deferred.resolve(files);    
            });
        };
        if (this.async) {
            setTimeout(resolve, 0);
        } else {
            resolve();
        }
        return deferred.promise();
    }
};


export class Document {
    file: brackets.File;
    isDirty: boolean;
    
    lines: string[];
    getText(useOriginalLineEndings?: boolean): string {
        return this.lines.join('/n');
    }
    replaceRange(text: string, start: CodeMirror.Position, end?: CodeMirror.Position, origin? :string):void {
    
    }

    getLine(index: number): string {
        return this.lines[index]
    }

}
    

export class Editor {
    _codeMirror: CodeMirror.Editor = null;
    document = new Document();
    
    pos: CodeMirror.Position;
    
    getCursorPos(): CodeMirror.Position {
        return this.pos;
    }
    
    getModeForSelection(): string {
        return 'typescript';
    }
    
    getSelection(boolean: boolean): {
        start: CodeMirror.Position;
        end: CodeMirror.Position
    } {
        return null;
    }
    setCursorPos(line: number, ch: number): void  {
        this.pos = {line: line, ch: ch};
    }
    
    setFile(file: String, content: String): void {
        this.document.file = <any>{ fullPath: file};
        this.document.lines = content.split('\n');
    }
}
    

