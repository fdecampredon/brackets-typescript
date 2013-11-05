///<reference path="./codemirror.d.ts" />

declare var PathUtils : {
    directory(path:string): string;
    makePathRelative(path: string, basePath: string): string;
    makePathAbsolute(path: string, basePath: string): string;
}

declare module brackets {
    interface ProjectManager {
        getProjectRoot():DirectoryEntry;
    }
    
    export interface DocumentManager {
        getCurrentDocument?(): Document
        getWorkingSet?(): brackets.FileEntry[];
        getDocumentForPath?(path: string): JQueryPromise<Document>
    }
    
    interface Document {
        file: FileEntry;
        replaceRange?(text:string, start:CodeMirror.Position, end:CodeMirror.Position, origin? :string):void;
        getLine?(index: number): string;
    }
    
    interface Editor {
        _codeMirror: CodeMirror.Editor
        document:Document;
        getCursorPos():CodeMirror.Position;
        getModeForSelection(): string;
        getSelection(boolean: boolean): {
            start: CodeMirror.Position;
            end: CodeMirror.Position
        }
        setCursorPos(line: number, ch: number, center: boolean, expandTabs: boolean) ;
    }
    
    interface FileInfo {
        fullPath: string;
        name: string;
    }
    
    interface FileIndexManager {
        getFileInfoList(indexName: string): JQueryPromise<FileInfo[]>;
    }
    
    interface FileUtils {
        readAsText(entry:FileEntry):JQueryPromise<any>;
        writeText(entry:FileEntry, text:string):JQueryPromise<any>;
    }
    
    interface Entry {
        isDirectory:boolean;
        isFile:boolean;
        fullPath:string;
        name:string;
    }
    
    interface DirectoryReader {
        readEntries(callback: (entries:Entry[]) => void, errorCallback?:(...rest: any[]) => void);
    }
    
    interface DirectoryEntry extends Entry {
        createReader():DirectoryReader
        getFile(file:string,  options: { create?: boolean; exclusive?: boolean;}, 
            success: (file:FileEntry) => void, error?: (error:any) => void):void;
        
        getDirectory(directory:string, options: { create?: boolean; exclusive?: boolean;}, 
            success: (file:FileEntry) => void, error?: (error:any) => void):void;
    }
    
    
    interface FileEntry extends Entry {
    }
    
    
    interface CodeHintManager {
        registerHintProvider(hintProvider: CodeHintProvider, languageIds: string[], priority?: number): void;
    }
    interface HintResult {
        hints?: any [];
        match?: string;
        selectInitial?: boolean
    }
    
    interface CodeHintProvider {
        hasHints(editor:Editor, implicitChar:string): boolean;
        getHints(implicitChar:string): JQueryDeferred<HintResult>;
        insertHint(hint: any):void;
    }
    
    enum ErrorType {
        ERROR,
        WARNING,
        META
    }
    
    interface CodeInspection {
        register(languageId: string, provider: InspectionProvider);
        Type:typeof ErrorType;
    }
    
    
    interface LintingError {
        pos: CodeMirror.Position; 
        endPos?: CodeMirror.Position;
        message: string; 
        type?: ErrorType; 
    }
    
    interface InspectionProvider {
        name: string;
        scanFile(content: string, path: string):{ errors: LintingError[];  aborted: boolean }; 
    }
    
    interface EditorManager {
        registerInlineEditProvider(provider: InlineEditProvider, priority?: number); 
        registerInlineDocsProvider(provider: InlineDocsProvider, priority?: number);
        registerJumpToDefProvider(provider:JumpDoDefProvider);
        getFocusedEditor(): Editor;
    }
    
    interface InlineEditProvider {
        (hostEditor: Editor, pos: CodeMirror.Position): JQueryPromise<InlineWidget>
    }
    
    interface InlineDocsProvider {
        (hostEditor: Editor, pos: CodeMirror.Position): JQueryPromise<InlineWidget>
    }
    
    interface JumpDoDefProvider {
        (hostEditor: Editor, pos: CodeMirror.Position): JQueryPromise<InlineWidget>
    }
    
    
    
    interface InlineWidget {
        load(editor: Editor)
    }
    
   
    
    module MultiRangeInlineEditor {
        class MultiRangeInlineEditor implements InlineWidget {
            constructor(ranges: MultiRangeInlineEditorRange[]);
            load(editor: Editor)
        }
    }
    
    interface MultiRangeInlineEditorRange {
        name: string;
        document : brackets.Document;
        lineStart:number;
        lineEnd:number;
    }
    
    function getModule(module: 'project/FileIndexManager'): brackets.FileIndexManager;
    function getModule(module: 'document/DocumentManager'): brackets.DocumentManager;
    function getModule(module: 'project/ProjectManager'): brackets.ProjectManager;
    function getModule(module: 'editor/CodeHintManager'):CodeHintManager;
    function getModule(module: 'editor/EditorManager'): EditorManager;
    function getModule(module: 'editor/MultiRangeInlineEditor'): typeof MultiRangeInlineEditor;
    function getModule(module: 'file/FileUtils'): FileUtils;
    function getModule(module: 'language/CodeInspection'): CodeInspection;
    
    function getModule(module: string): any;
    
}



/**/


/*interface IPathUtils {
  href(file:string):string;
  hrefNoHash(file:string):string;
  hrefNoSearch(file:string):string;
  domain(file:string):string;
  protocol(file:string):string;
  doubleSlash(file:string):string;
  authority(file:string):string;
  userinfo(file:string):string;
  username(file:string):string;
  password(file:string):string;
  host(file:string):string;
  hostname(file:string):string;
  port(file:string):string;
  pathname(file:string):string;
  directory(file:string):string;
  filename(file:string):string;
  filenameExtension(file:string):string;
  search(file:string):string;
  hash(file:string):string;
}

declare var PathUtils:IPathUtils;*/

/*
declare module 'PathUtils' {
   function getParentPath(path:string);
   function convertRelativePathToFullPath(relativePath:string, parentPath:string);
}



declare module brackets {
    interface DocumentManager {
        getCurrentDocument():Document
    }
    
    
    interface Document {
        file:FileEntry;    
        getText():string;
        replaceRange(text:string, start:CodeMirror.Position, end:CodeMirror.Position, origin? :string):void;
        getLine(line:number):string;
    }
    
    interface Editor {
        document:Document;
        getCursorPos():CodeMirror.Position;
    }
    
    interface EditorManager {
        getActiveEditor():Editor
    }
    
    interface LanguageDefinition {
        name:string;
        mode:string;
        fileExtensions:string[];
        blockComment:string[];
        lineComment:string[];
    }
    
    interface  LanguageManager {
        defineLanguage(languageId:string, languageDefinition:LanguageDefinition);
    }
    
    
    interface Entry {
        isDirectory:boolean;
        isFile:boolean;
        fullPath:string;
        name:string;
    }
    
    interface DirectoryReader {
        readEntries(callback:(entries:Entry[]) => void, errorCallback?:(...rest:any[])  => void);
    }
    
    interface DirectoryEntry extends Entry {
        createReader():DirectoryReader
        getFile(file:string,  options:{create?:boolean; exclusive?:boolean;}, 
            success:(file:FileEntry)=>void, error?:(error:any)=>void):void;
        
        getDirectory(directory:string, options:{create?:boolean; exclusive?:boolean;},
            success:(dir:DirectoryEntry)=>void, error?:(error:any)=>void):void;
    }
    
    interface FileEntry extends Entry {
    }
    
    interface ProjectManager {
        getProjectRoot():DirectoryEntry;
    }
    
    
    interface FileUtils {
        readAsText(entry:FileEntry):JQueryPromise;
        writeText(entry:FileEntry, text:string):JQueryPromise
    }
    
    
    interface AppInit {
        appReady(callback:() => any):void;
    }
    
    
    
    interface CodeHintProvider {
        hasHints(editor:Editor, implicitChar:string):JQueryPromise;
        getHints(implicitChar:string):JQueryPromise;
        insertHint(hint:string):void;
    }
    
    interface CodeHintManager {
        registerHintProvider(hintProvider:CodeHintProvider,languageIds:string[], priority?:number):void;
    }
    
    interface FileInfo {
        fullPath:string;
        name:string;
    }
    
    interface FileIndexManager {
        getFileInfoList(index:string):JQueryPromise;
    }
    
    function getModule(module:"language/LanguageManager"):LanguageManager;
    function getModule(module:"project/ProjectManager"):ProjectManager;
    function getModule(module:"project/FileIndexManager"):FileIndexManager;
    function getModule(module:"file/FileUtils"):FileUtils;
    function getModule(module:"document/DocumentManager"):DocumentManager;
    function getModule(module:"utils/AppInit"):AppInit;
    function getModule(module:"editor/CodeHintManager"):CodeHintManager;
    function getModule(module:string):any;
}*/