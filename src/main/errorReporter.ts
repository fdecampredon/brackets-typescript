

/*
 * some part of this code has been borrowed from https://github.com/peterflynn/lint-all-the-things/
 * here is the Copyright :
 * 
 * Copyright (c) 2013 Peter Flynn.
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */


import Rx           = require('rx');
import error        = require('../commons/error');
import collections  = require('../commons/collections');
import immeditate   = require('../commons/immediate');


var CommandManager      = brackets.getModule("command/CommandManager"),
    Commands            = brackets.getModule("command/Commands"),
    PanelManager        = brackets.getModule("view/PanelManager"),
    EditorManager       = brackets.getModule("editor/EditorManager"),
    //TODO add StatusBar in brackets.d.ts
    StatusBar           = brackets.getModule("widgets/StatusBar");

var INDICATOR_ID = "status-typescript-inspection";

var panelHtml = "<div id='allproblems-panel' class='bottom-panel vert-resizable top-resizer'>\
                        <div class='toolbar simple-toolbar-layout'>\
                            <div class='title'></div>\
                            <a href='#' class='close'>&times;</a>\
                        </div>\
                        <div class='table-container resizable-content'></div>\
                    </div>"
var template = "<table class='bottom-panel-table table table-striped table-condensed row-highlight'>\
                    <tbody>\
                        {{#fileList}}\
                        <tr class='file-section'>\
                            <td colspan='3'><span class='disclosure-triangle expanded'></span><span class='dialog-filename'>{{displayPath}}</span></td>\
                        </tr>\
                        {{#errors}}\
                        <tr data-fullpath='{{fullPath}}'>\
                            <td class='line-number' data-character='{{pos.ch}}'>{{friendlyLine}}</td>\
                            <td>{{message}}</td>\
                            <td>{{codeSnippet}}</td>\
                        </tr>\
                        {{/errors}}\
                        {{/fileList}}\
                    </tbody>\
                </table>";

class ErrorReporter {
    
    private fileToErrors = new collections.StringMap<error.ErrorDescriptor[]>();
    private disposable: Rx.Disposable;
    private immediateUid: number;
    private panel: brackets.Panel;
    private _enabled: boolean;
    
    constructor(
        private fileErrorsObservable: Rx.Observable<error.FileErrors>
    ) {
        this.disposable = fileErrorsObservable.subscribe(this.displayErrors)
        this.initHTML();
    }
    
    dispose() {
        this.disposable.dispose();
        this.fileToErrors.clear();
        this.panel.hide();
        this.panel.$panel.remove();
        this.panel = null;
    }
    
     
    private initHTML() {
        var statusIconHtml = Mustache.render("<div id=\"status-inspection-typescript\">&nbsp;</div>", {}); //Strings);
        StatusBar.addIndicator(INDICATOR_ID, $(statusIconHtml), true, "", "", "status-indent");

        $("#status-inspection").click(() =>{
            // Clicking indicator toggles error panel, if any errors in current file
            if (this.fileToErrors.keys.length) {
                this.togglePanel();
            }
        });
         
       
        
        this.panel = PanelManager.createBottomPanel('typescript-errors', $(panelHtml), 100);
        
        var $selectedRow: JQuery;
        var $tableContainer = this.panel.$panel.find(".table-container")
            .on("click", "tr", function (e) {
                var $row = $(e.currentTarget);
                if ($selectedRow) {
                    $selectedRow.removeClass("selected");
                }
                $selectedRow = $row;
                $selectedRow.addClass("selected");
                
                if ($row.hasClass("file-section")) {
                    // Clicking the file section header collapses/expands result rows for that file
                    $row.nextUntil(".file-section").toggle();
                    
                    var $triangle = $(".disclosure-triangle", $row);
                    $triangle.toggleClass("expanded").toggleClass("collapsed");
                    
                } else {
                    // Clicking individual error jumps to that line of code
                    var $lineTd   = $selectedRow.find(".line-number"),
                        line      = parseInt($lineTd.text(), 10) - 1,  // convert friendlyLine back to pos.line
                        character = $lineTd.data("character"),
                        fullPath  = $selectedRow.data("fullpath");
    
                    CommandManager.execute(Commands.FILE_OPEN, {fullPath: fullPath})
                        .done(() => {
                            // Opened document is now the current main editor
                            EditorManager.getCurrentFullEditor().setCursorPos(line, character, true, true);
                        });
                }
            });

    }
    
    private displayErrors = (fileErrors: error.FileErrors) => {
        if (fileErrors.errors.length) {
            this.fileToErrors.set(fileErrors.fullPath, fileErrors.errors);
        } else {
            this.fileToErrors.delete(fileErrors.fullPath);
        }
        immeditate.clearImmediate(this.immediateUid);
        this.immediateUid = immeditate.setImmediate(() => this.render());
    }
    
    private togglePanel(enabled?: boolean) {
        if (typeof enabled === 'undefined') {
            enabled = !this._enabled;
        }
        if (enabled === this._enabled) {
            return;
        }
        
        this.panel.setVisible(this._enabled);
    }
    
    
    //Code borrowed from pflynt lint-all-the-things extensions (https://github.com/peterflynn/lint-all-the-things/)
    render() {
        
        
        
        
    }
}

export = ErrorReporter;