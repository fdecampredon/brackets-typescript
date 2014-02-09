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

'use strict';

import logger = require('../commons/logger');
import collections = require('../commons/collections');
import scripts = require('./scripts');
import path = require('path');

class LanguageServiceHost extends logger.LogingClass implements TypeScript.Services.ILanguageServiceHost {
    public fileNameToScript = new collections.StringMap<scripts.ScriptInfo>();
    
    constructor (
        public compilationSettings: TypeScript.CompilationSettings
    ) {
        super();
    }
    
    public addScript(fileName: string, content:string) {
        var script = new scripts.ScriptInfo(fileName, content);
        this.fileNameToScript.set(fileName, script);
    }

    public removeScript(fileName: string) {
        this.fileNameToScript.delete(fileName);
    }

    public updateScript(fileName: string, content: string) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.updateContent(content); 
            return;
        }

        this.addScript(fileName, content);
    }

    public editScript(fileName: string, minChar: number, limChar: number, newText: string) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.editContent(minChar, limChar, newText);
            return;
        }

        throw new Error("No script with name '" + fileName + "'");
    }
    
    public setScriptIsOpen(fileName: string, isOpen: boolean) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.isOpen = isOpen
            return;
        }

        throw new Error("No script with name '" + fileName + "'");
    }
    
   

    //////////////////////////////////////////////////////////////////////
    // ILanguageServiceShimHost implementation
    //

    public getCompilationSettings(): TypeScript.CompilationSettings {
        return this.compilationSettings; // i.e. default settings
    }

    public getScriptFileNames() {
        return this.fileNameToScript.keys;
    }

    public getScriptSnapshot(fileName: string) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return new scripts.ScriptSnapshot(script);
        }
        return null;
    }

    public getScriptVersion(fileName: string): number {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.version;
        }
        return 0;
    }

    public getScriptIsOpen(fileName: string): boolean {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.isOpen;
        }
        return false;
    }

    public getScriptByteOrderMark(fileName: string): TypeScript.ByteOrderMark {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.byteOrderMark;
        }
        return TypeScript.ByteOrderMark.None;
    }

    public getDiagnosticsObject(): TypeScript.Services.ILanguageServicesDiagnostics {
        return new LanguageServicesDiagnostics("");
    }

    public getLocalizedDiagnosticMessages(): string {
        return "";
    }

    public fileExists(s: string) {
        return this.fileNameToScript.has(s);
    }

    public directoryExists(s: string) {
        return true;
    }

    public resolveRelativePath(fileName: string, directory: string): string {
        return path.resolve(directory, fileName);
    }

    public getParentDirectory(fileName: string): string {
        return path.dirname(fileName);
    }

    /**
     * return an index from a positon in line/char
     * @param path the path of the file
     * @param position the position
     */
    getIndexFromPos(fileName: string, position: CodeMirror.Position): number {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.lineMap.getPosition(position.line, position.ch)
        }
        return -1;
    }
    
    
    /**
     * return a positon in line/char from an index
     * @param path the path of the file
     * @param index the index
     */
    indexToPosition(fileName: string, index: number): CodeMirror.Position {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            var tsPosition = script.getLineAndColForPositon(index);
            return {
                ch: tsPosition.character,
                line: tsPosition.line
            }
        }
        return null;
    }
}

class LanguageServicesDiagnostics implements TypeScript.Services.ILanguageServicesDiagnostics {

    constructor(private destination: string) { }

    public log(content: string): void {
        //Imitates the LanguageServicesDiagnostics object when not in Visual Studio
    }
}

export = LanguageServiceHost;