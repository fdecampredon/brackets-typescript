
export var FILE_NOT_FOUND = 'not found';

export class FileSystem {
    constructor(private root: Directory) {
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
        if (! listeners) {
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
    
    dispatch(event: string, ...rest: any[]) {
        var listeners = this.listeners[event];
        if (!listeners) {
            return
        }
        listeners.forEach(listerner => listerner.apply(null, rest));
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
        if (this.content) {
            callback(null, this.content, null);
        } else {
            callback(FILE_NOT_FOUND, null, null)
        }
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

