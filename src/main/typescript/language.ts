import Logger = require('../logger');
import script = require('./script');
import collections = require('../utils/collections');
import Services = TypeScript.Services;






export class LanguageServiceHost extends Logger implements Services.ILanguageServiceHost {



    constructor(
        public settings: TypeScript.CompilationSettings, 
        public files?: collections.StringMap<script.ScriptInfo>
    ) {
        super();
        this.settings = settings;
    }
    
    // TypeScript.IReferenceResolverHost
    getScriptSnapshot(path: string): TypeScript.IScriptSnapshot {
        var scriptInfo = this.files.get(path);
        if (scriptInfo) {
            return new script.ScriptSnapshot(scriptInfo) 
        }
        return null;
    }
    
    resolveRelativePath(path: string, directory: string): string {
        return PathUtils.makePathAbsolute(path, directory);
    }
    
    fileExists(path: string): boolean {
        return this.files.has(path)
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
        return this.files.keys;
    }

    getScriptVersion(path: string): number {
        var scriptInfo = this.files.get(path);
        if (scriptInfo) {
            return scriptInfo.version;
        }
        return 1;
    }

    getScriptIsOpen(path: string): boolean {
        var scriptInfo =  this.files.get(path);
        if (scriptInfo) {
            return scriptInfo.isOpen;
        }
        return false;
    }
    
    getScriptByteOrderMark(path: string): TypeScript.ByteOrderMark {
        var scriptInfo =  this.files.get(path);
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