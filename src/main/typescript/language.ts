import Logger = require('../logger');
import script = require('./script');
import Services = TypeScript.Services;


export interface ILanguageServiceHost extends Services.ILanguageServiceHost {
    addScript(path: string, content: string): void;
    updateScript(path: string, content: string): void;
    editScript(path: string, minChar: number, limChar: number, newText: string): void;
    removeScript(path: string): void;
    lineColToPosition(path: string, line :number, col:number): number;
    setScriptIsOpen(path: string, isOpen: boolean): void
}
    


export class LanguageServiceHost extends Logger implements ILanguageServiceHost {


    private files: { [fileName: string]: script.ScriptInfo; } = {};
    private settings: TypeScript.CompilationSettings;

    constructor(settings: TypeScript.CompilationSettings, files?: { [path: string]: string; }) {
        super();
        this.settings = settings;
        if (typeof files !== 'undefined') {
            for (var path in files) {
                if(files.hasOwnProperty(path)) {
                    this.addScript(path, files[path]);
                }
            }
        }
    }
    
    //LanguageServiceHost implementations

    addScript(path: string, content: string) {
        var scriptInfo = new script.ScriptInfo(path, content);
        this.files[path] = scriptInfo;
    }

    updateScript(path: string, content: string) {
        var script = this.files[path];
        if (script) {
            script.updateContent(content);
            return;
        }
        this.addScript(path, content);
    }

    editScript(path: string, minChar: number, limChar: number, newText: string) {
        var script = this.files[path];
        if (script) {
            script.editContent(minChar, limChar, newText);
            return;
        }
        throw new Error("No script with name '" + path + "'");
    }

    removeScript(path: string) {
        delete this.files[path];
    }

    lineColToPosition(path: string, line : number, col: number): number {
        var script = this.files[path];
        if (script) {
            var position = script.getPositionFromLine(line, col);
            if (!isNaN(position)) {
                return position;
            }
        }
        return -1;
    }

    setScriptIsOpen(path: string, isOpen:boolean) {
        var script = this.files[path];
        if (script) {
            script.isOpen =true
        }
    }
    
    
    // TypeScript.IReferenceResolverHost
    
    
    getScriptSnapshot(path: string): TypeScript.IScriptSnapshot {
        var scriptInfo = this.files[path];
        if (scriptInfo) {
            return new script.ScriptSnapshot(scriptInfo) 
        }
        return null;
    }
    
    resolveRelativePath(path: string, directory: string): string {
        return PathUtils.makePathAbsolute(path, directory);
    }
    
    fileExists(path: string): boolean {
        return !!this.files[path];
    }
        
    directoryExists(path: string): boolean {
        return true//TODO
    }
    
    getParentDirectory(path: string): string {
        return PathUtils.directory(path);
    }

    //ILanguageServiceHost implementations
    

    getCompilationSettings(): TypeScript.CompilationSettings {
        return this.settings;
    }

    getScriptFileNames(): string[] {
        return Object.keys(this.files);
    }

    getScriptVersion(path: string): number {
        var scriptInfo =  this.files[path];
        if (scriptInfo) {
            return scriptInfo.version;
        }
        return 1;
    }

    getScriptIsOpen(path: string): boolean {
        var scriptInfo =  this.files[path];
        if (scriptInfo) {
            return scriptInfo.isOpen;
        }
        return false;
    }
    
    getScriptByteOrderMark(path: string): TypeScript.ByteOrderMark {
        var scriptInfo =  this.files[path];
        if (scriptInfo) {
            return scriptInfo.byteOrderMark;
        }
        return TypeScript.ByteOrderMark.None;
    }

    

    getDiagnosticsObject(): Services.ILanguageServicesDiagnostics {
        return new LanguageServicesDiagnostics("");
    }
    
    
    getLocalizedDiagnosticMessages(): any {
        return null;
    }
    
   
}


class LanguageServicesDiagnostics implements Services.ILanguageServicesDiagnostics {

    constructor(private destination: string) { }

    public log(content: string): void { }

}