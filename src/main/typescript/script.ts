 export class ScriptInfo {
    public version: number = 1;
    public editRanges: { length: number; textChangeRange: TypeScript.TextChangeRange; }[] = [];
    public lineMap: TypeScript.LineMap = null;
    public fileName: string;
    public content: string;
    public isOpen: boolean;
    public byteOrderMark: ByteOrderMark;
    

    constructor(fileName: string, content: string, isOpen = true, byteOrderMark: ByteOrderMark = ByteOrderMark.None) {
        this.fileName = fileName;
        this.content = content;
        this.isOpen = isOpen;
        this.byteOrderMark = byteOrderMark;
        this.setContent(content);
    }

    private setContent(content: string): void {
        this.content = content;
        this.lineMap = TypeScript.LineMap.fromString(content);
    }

    public updateContent(content: string): void {
        if (content !== this.content) {
            this.editRanges = [];
            this.setContent(content);
            this.version++;
        }
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

 

export class ScriptSnapshot implements TypeScript.IScriptSnapshot {
    private lineMap: TypeScript.LineMap = null;
    private textSnapshot: string;
    private version: number;
    private scriptInfo: ScriptInfo;

    constructor(scriptInfo: ScriptInfo) {
        this.scriptInfo = scriptInfo;
        this.textSnapshot = scriptInfo.content;
        this.version = scriptInfo.version;
    }

    public getText(start: number, end: number): string {
        return this.textSnapshot.substring(start, end);
    }

    public getLength(): number {
        return this.textSnapshot.length;
    }

    public getLineStartPositions(): number[] {
        if (this.lineMap === null) {
            this.lineMap = TypeScript.LineMap.fromString(this.textSnapshot);
        }

        return this.lineMap.lineStarts();
    }

    public getTextChangeRangeSinceVersion(scriptVersion: number): TypeScript.TextChangeRange {
        return this.scriptInfo.getTextChangeRangeBetweenVersions(scriptVersion, this.version);
    }
}
 
 
export function getScriptSnapShot(path: string, content: string): TypeScript.IScriptSnapshot {
    return new ScriptSnapshot(new ScriptInfo(path, content));
}