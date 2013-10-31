define(["require", "exports"], function(require, exports) {
    var ScriptInfo = (function () {
        function ScriptInfo(fileName, content, isOpen, byteOrderMark) {
            if (typeof isOpen === "undefined") { isOpen = true; }
            if (typeof byteOrderMark === "undefined") { byteOrderMark = ByteOrderMark.None; }
            this.version = 1;
            this.editRanges = [];
            this.lineMap = null;
            this.fileName = fileName;
            this.content = content;
            this.isOpen = isOpen;
            this.byteOrderMark = byteOrderMark;
            this.setContent(content);
        }
        ScriptInfo.prototype.setContent = function (content) {
            this.content = content;
            this.lineMap = TypeScript.LineMap.fromString(content);
        };

        ScriptInfo.prototype.updateContent = function (content) {
            if (content !== this.content) {
                this.editRanges = [];
                this.setContent(content);
                this.version++;
            }
        };

        ScriptInfo.prototype.editContent = function (minChar, limChar, newText) {
            var prefix = this.content.substring(0, minChar);
            var middle = newText;
            var suffix = this.content.substring(limChar);
            this.setContent(prefix + middle + suffix);

            this.editRanges.push({
                length: this.content.length,
                textChangeRange: new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(minChar, limChar), newText.length)
            });

            this.version++;
        };

        ScriptInfo.prototype.getTextChangeRangeBetweenVersions = function (startVersion, endVersion) {
            if (startVersion === endVersion) {
                return TypeScript.TextChangeRange.unchanged;
            }

            var initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
            var lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);

            var entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
            return TypeScript.TextChangeRange.collapseChangesAcrossMultipleVersions(entries.map(function (e) {
                return e.textChangeRange;
            }));
        };

        ScriptInfo.prototype.getPositionFromLine = function (line, col) {
            return this.lineMap.getPosition(line, col);
        };
        return ScriptInfo;
    })();
    exports.ScriptInfo = ScriptInfo;

    var ScriptSnapshot = (function () {
        function ScriptSnapshot(scriptInfo) {
            this.lineMap = null;
            this.scriptInfo = scriptInfo;
            this.textSnapshot = scriptInfo.content;
            this.version = scriptInfo.version;
        }
        ScriptSnapshot.prototype.getText = function (start, end) {
            return this.textSnapshot.substring(start, end);
        };

        ScriptSnapshot.prototype.getLength = function () {
            return this.textSnapshot.length;
        };

        ScriptSnapshot.prototype.getLineStartPositions = function () {
            if (this.lineMap === null) {
                this.lineMap = TypeScript.LineMap.fromString(this.textSnapshot);
            }

            return this.lineMap.lineStarts();
        };

        ScriptSnapshot.prototype.getTextChangeRangeSinceVersion = function (scriptVersion) {
            return this.scriptInfo.getTextChangeRangeBetweenVersions(scriptVersion, this.version);
        };
        return ScriptSnapshot;
    })();
    exports.ScriptSnapshot = ScriptSnapshot;

    function getScriptSnapShot(path, content) {
        return new ScriptSnapshot(new ScriptInfo(path, content));
    }
    exports.getScriptSnapShot = getScriptSnapShot;
});
