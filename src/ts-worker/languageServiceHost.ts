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
import path = require('path');
import utils = require('../commons/utils');

class LanguageServiceHost extends logger.LogingClass implements TypeScript.Services.ILanguageServiceHost {
    private compilationSettings: TypeScript.CompilationSettings;
  
    private fileNameToScript = new collections.StringMap<ScriptInfo>();
    
    addScript(fileName: string, content:string) {
        var script = new ScriptInfo(fileName, content);
        this.fileNameToScript.set(fileName, script);
    }

    removeScript(fileName: string) {
        this.fileNameToScript.delete(fileName);
    }
    
    removeAll(): void {
        this.fileNameToScript.clear();
    }

    updateScript(fileName: string, content: string) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.updateContent(content); 
            return;
        }
        throw new Error("No script with name '" + fileName + "'");
    }

    editScript(fileName: string, minChar: number, limChar: number, newText: string) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.editContent(minChar, limChar, newText);
            return;
        }

        throw new Error("No script with name '" + fileName + "'");
    }
    
    setScriptIsOpen(fileName: string, isOpen: boolean) {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            script.isOpen = isOpen
            return;
        }

        throw new Error("No script with name '" + fileName + "'");
    }
    
    setCompilationSettings(settings: TypeScript.CompilationSettings ): void{
        this.compilationSettings = utils.clone(settings);
    }
    
    getScriptContent(fileName: string): string {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.content;
        }
        return null;
    }
    
    
   

    //////////////////////////////////////////////////////////////////////
    // ILanguageServiceShimHost implementation
    //

    getCompilationSettings(): TypeScript.CompilationSettings {
        return this.compilationSettings; 
    }

    getScriptFileNames() {
        return this.fileNameToScript.keys;
    }

    getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return new ScriptSnapshot(script);
        }
        return null;
    }

    getScriptVersion(fileName: string): number {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.version;
        }
        return 0;
    }

    getScriptIsOpen(fileName: string): boolean {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.isOpen;
        }
        return false;
    }

    getScriptByteOrderMark(fileName: string): TypeScript.ByteOrderMark {
        var script = this.fileNameToScript.get(fileName);
        if (script) {
            return script.byteOrderMark;
        }
        return TypeScript.ByteOrderMark.None;
    }

    getDiagnosticsObject(): TypeScript.Services.ILanguageServicesDiagnostics {
        return new LanguageServicesDiagnostics("");
    }

    getLocalizedDiagnosticMessages(): string {
        return "";
    }

    fileExists(s: string) {
        return this.fileNameToScript.has(s);
    }

    directoryExists(s: string) {
        return true;
    }

    resolveRelativePath(fileName: string, directory: string): string {
        return path.resolve(directory, fileName);
    }

    getParentDirectory(fileName: string): string {
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
            return script.getPositionFromLine(position.line, position.ch)
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



class ScriptInfo {
    version: number = 1;
    editRanges: { length: number; textChangeRange: TypeScript.TextChangeRange; }[] = [];
    lineMap: TypeScript.LineMap = null;
    fileName: string;
    content: string;
    isOpen: boolean;
    byteOrderMark: TypeScript.ByteOrderMark;
    

    constructor(fileName: string, content: string, isOpen = false, byteOrderMark: TypeScript.ByteOrderMark = TypeScript.ByteOrderMark.None) {
        this.fileName = fileName;
        this.content = content;
        this.isOpen = isOpen;
        this.byteOrderMark = byteOrderMark;
        this.setContent(content);
    }

    private setContent(content: string): void {
        this.content = content;
        this.lineMap = TypeScript.LineMap1.fromString(content);
    }

    updateContent(content: string): void {
        if (content !== this.content) {
            this.editRanges = [];
            this.setContent(content);
            this.version++;
        }
    }

    editContent(minChar: number, limChar: number, newText: string): void {
        // Apply edits
        var prefix = this.content.substring(0, minChar);
        var middle = newText;
        var suffix = this.content.substring(limChar);
        this.setContent(prefix + middle + suffix);

        // Store edit range + new length of script
        this.editRanges.push({
            length: this.content.length,
            textChangeRange: new TypeScript.TextChangeRange(
                TypeScript.TextSpan.fromBounds(minChar, limChar), newText.length)
        });

        // Update version #
        this.version++;
    }

    getTextChangeRangeBetweenVersions(startVersion: number, endVersion: number): TypeScript.TextChangeRange {
        if (startVersion === endVersion) {
            // No edits!
            return TypeScript.TextChangeRange.unchanged;
        } else if (this.editRanges.length === 0) {
            return null;
        }

        var initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
        var lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);

        var entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
        return TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(entries.map(e => e.textChangeRange));
    }
     
     
    getPositionFromLine(line :number, col:number) {
        return this.lineMap.getPosition(line, col);
    }
     
    getLineAndColForPositon(position: number) {
        var lineAndChar = { line: -1, character: -1};
        this.lineMap.fillLineAndCharacterFromPosition(position, lineAndChar)
        return lineAndChar;
    }
}

 

class ScriptSnapshot implements TypeScript.IScriptSnapshot {
    private lineMap: TypeScript.LineMap = null;
    private textSnapshot: string;
    private version: number;
    private scriptInfo: ScriptInfo;

    constructor(scriptInfo: ScriptInfo) {
        this.scriptInfo = scriptInfo;
        this.textSnapshot = scriptInfo.content;
        this.version = scriptInfo.version;
    }

    getText(start: number, end: number): string {
        return this.textSnapshot.substring(start, end);
    }

    getLength(): number {
        return this.textSnapshot.length;
    }

    getLineStartPositions(): number[] {
        if (this.lineMap === null) {
            this.lineMap = TypeScript.LineMap1.fromString(this.textSnapshot);
        }
        return this.lineMap.lineStarts();
    }

    getTextChangeRangeSinceVersion(scriptVersion: number): TypeScript.TextChangeRange {
        return this.scriptInfo.getTextChangeRangeBetweenVersions(scriptVersion, this.version);
    }
}


class LanguageServicesDiagnostics implements TypeScript.Services.ILanguageServicesDiagnostics {

    constructor(private destination: string) { }

    log(content: string): void {
        //Imitates the LanguageServicesDiagnostics object when not in Visual Studio
    }
}


export = LanguageServiceHost;