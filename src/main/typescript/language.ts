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