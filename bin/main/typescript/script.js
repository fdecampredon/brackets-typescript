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
define(["require", "exports"], function(require, exports) {
    var ScriptInfo = (function () {
        function ScriptInfo(fileName, content, isOpen, byteOrderMark) {
            if (typeof isOpen === "undefined") { isOpen = false; }
            if (typeof byteOrderMark === "undefined") { byteOrderMark = 0 /* None */; }
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
            this.lineMap = TypeScript.LineMap1.fromString(content);
        };

        ScriptInfo.prototype.updateContent = function (content) {
            if (content !== this.content) {
                this.editRanges = [];
                this.setContent(content);
                this.version++;
            }
        };

        ScriptInfo.prototype.editContent = function (minChar, limChar, newText) {
            // Apply edits
            var prefix = this.content.substring(0, minChar);
            var middle = newText;
            var suffix = this.content.substring(limChar);
            this.setContent(prefix + middle + suffix);

            // Store edit range + new length of script
            this.editRanges.push({
                length: this.content.length,
                textChangeRange: new TypeScript.TextChangeRange(TypeScript.TextSpan.fromBounds(minChar, limChar), newText.length)
            });

            // Update version #
            this.version++;
        };

        ScriptInfo.prototype.getTextChangeRangeBetweenVersions = function (startVersion, endVersion) {
            if (startVersion === endVersion) {
                // No edits!
                return TypeScript.TextChangeRange.unchanged;
            } else if (this.editRanges.length === 0) {
                return null;
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

        ScriptInfo.prototype.getLineAndColForPositon = function (position) {
            var lineAndChar = { line: -1, character: -1 };
            this.lineMap.fillLineAndCharacterFromPosition(position, lineAndChar);
            return lineAndChar;
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
                this.lineMap = TypeScript.LineMap1.fromString(this.textSnapshot);
            }

            return this.lineMap.lineStarts();
        };

        ScriptSnapshot.prototype.getTextChangeRangeSinceVersion = function (scriptVersion) {
            return this.scriptInfo.getTextChangeRangeBetweenVersions(scriptVersion, this.version);
        };
        return ScriptSnapshot;
    })();
    exports.ScriptSnapshot = ScriptSnapshot;
});
