/*'use strict';

import Logger = require('./logger');

getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot
    
    
    resolveRelativePath(path: string, directory: string): string;
    fileExists(path: string): boolean;
    directoryExists(path: string): boolean;
    getParentDirectory(path: string): string;
        

export interface ILanguageServiceHost extends TypeScript.ILogger, TypeScript.IReferenceResolverHost {
    getCompilationSettings(): TypeScript.CompilationSettings;

    getScriptFileNames(): string[];
    getScriptVersion(fileName: string): number;
    getScriptIsOpen(fileName: string): boolean;
    getScriptByteOrderMark(fileName: string): ByteOrderMark;
    getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot;
    getDiagnosticsObject(): Services.ILanguageServicesDiagnostics;
    getLocalizedDiagnosticMessages(): any;
}

class LanguageServiceHost extends Logger {
    private files: { [fileName:string]:ScriptInfo; } = {};

    constructor(files?: { [fileName: string]: string; }) {
        super();
        if(typeof files !== 'undefined') {
            for(var fileName in files) {
                if(files.hasOwnProperty(fileName)) {
                    this.addScript(fileName, files[fileName]);
                }
            }
        }
    }
    
    
  
}    */

/*
class LanguageServiceHost extends Logger implements  Services.ILanguageServiceHost {


    private files: { [fileName:string]:ScriptInfo; } = {};

    constructor(files?: { [fileName:string]:string; }) {
        super();
        if(typeof files !== 'undefined') {
            for(var fileName in files) {
                if(files.hasOwnProperty(fileName)) {
                    this.addScript(fileName, files[fileName]);
                }
            }
        }
    }



    addScript(fileName: string, content: string) {
        var scriptInfo = new ScriptInfo(fileName, content);
        this.files[fileName] = scriptInfo;
    }

    updateScript(fileName: string, content: string) {
        var script = this.files[fileName];
        if (script) {
            script.updateContent(content);
            return;
        }
        this.addScript(fileName, content);
    }

    editScript(fileName: string, minChar: number, limChar: number, newText: string) {
        var script = this.files[fileName];
        if (script) {
            script.editContent(minChar, limChar, newText);
            return;
        }
        throw new Error("No script with name '" + name + "'");
    }

    removeScript(fileName:string) {
        delete this.files[fileName];
    }

    lineColToPosition(fileName: string, line :number, col:number):number {
        var script = this.files[fileName];
        if(script.getPositionFromLine(line, col)) {
            return script.getPositionFromLine(line, col);
        }
        return -1;
    }

    setScriptIsOpen(fileName, isOpen:boolean) {
        var script = this.files[fileName];
        if (script) {
            script.isOpen =true
        }
    }

    //ILanguageServiceHost implementations

    getCompilationSettings(): TypeScript.CompilationSettings {
      var settings = new TypeScript.CompilationSettings();
      return settings;
    }

    getScriptFileNames(): string[] {
      return Object.keys(this.files);
    }

    getScriptVersion(fileName: string): number {
      var scriptInfo =  this.files[fileName];
      if(scriptInfo) {
        return scriptInfo.version;
      }
      return 1;
    }

    getScriptIsOpen(fileName: string): boolean {
      var scriptInfo =  this.files[fileName];
      if(scriptInfo) {
        return scriptInfo.isOpen;
      }
      return false;
    }

    getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
      var scriptInfo =  this.files[fileName];
      if(scriptInfo) {
        return new ScriptSnapshot(scriptInfo) 
      }
      return null
    }

    getDiagnosticsObject(): Services.ILanguageServicesDiagnostics {
      return new LanguageServicesDiagnostics("");
    }
    
    /* For later usage

    getScriptByteOrderMark(fileName: string): ByteOrderMark {
        var scriptInfo =  this.files[fileName];
        if(scriptInfo) {
            return scriptInfo.byteOrderMark;
        }
        return ByteOrderMark.None;
    }
    
    resolveRelativePath(path: string, directory: string): string {
        return pathUtils.getAbsolutePathh(path, directory);
    }
    
    fileExists(path: string): boolean {
        return true;
    }
    
    directoryExists(path: string): boolean {
        return true;
    }
    
    getParentDirectory(path: string): string {
        return pathUtils.getDirectory(path);
    }
}

class ScriptSnapshot implements TypeScript.IScriptSnapshot {
    private lineMap: TypeScript.LineMap = null;
    private textSnapshot: string;
    private version: number;

    constructor(private scriptInfo: ScriptInfo) {
        this.textSnapshot = scriptInfo.content;
        this.version = scriptInfo.version;
    }


    public getText(start: number, end: number): string {
        return this.textSnapshot.substring(start, end);
    }

    public getLength(): number {
        return this.textSnapshot.length;
    }

    public getLineStartPositions():  number[] {
        if (this.lineMap === null) {
            this.lineMap = TypeScript.LineMap.fromString(this.textSnapshot);
        }
        return this.lineMap.lineStarts();
    }

    public getTextChangeRangeSinceVersion(scriptVersion: number): TypeScript.TextChangeRange {
        return this.scriptInfo.getTextChangeRangeBetweenVersions(scriptVersion, this.version);
    }

    
}


class ScriptInfo {
    public version: number = 1;
    public editRanges: { length: number; textChangeRange: TypeScript.TextChangeRange; }[] = [];
    public lineMap: TypeScript.LineMap = null;
    public fileName: string;
    public content: string;
    public isOpen:boolean;
    // for later usage
    //public byteOrderMark = ByteOrderMark.None;

    constructor(fileName:string, content:string,isOpen = false ) {
        this.fileName = fileName;
        this.isOpen = isOpen;
        this.setContent(content);
    }

    private setContent(content: string): void {
        this.content = content;
        this.lineMap = TypeScript.LineMap.fromString(content);
    }

    public updateContent(content: string): void {
        this.editRanges = [];
        this.setContent(content);
        this.version++;
    }

    public editContent(minChar: number, limChar: number, newText: string): void {
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

    public getTextChangeRangeBetweenVersions(startVersion: number, endVersion: number): TypeScript.TextChangeRange {
        if (startVersion === endVersion) {
            // No edits!
            return TypeScript.TextChangeRange.unchanged;
        }

        var initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
        var lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);

        var entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
        return TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(entries.map(e => e.textChangeRange));
    }

    public getPositionFromLine(line :number, col:number) {
        return this.lineMap.getPosition(line, col);
    }
}

class LanguageServicesDiagnostics implements Services.ILanguageServicesDiagnostics {
    constructor(private destination: string) { }

    public log(content: string): void {
        //Imitates the LanguageServicesDiagnostics object when not in Visual Studio
    }
}

export = LanguageServiceHost;*/

