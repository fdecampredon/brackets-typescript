'use strict';


import ServiceConsumer = require('./serviceConsumer');
import ps = require('typescript-project-services');
import NavigationBarItem = ps.NavigationBarItem;
import Promise = require('bluebird');
import utils = require('./utils');
import path = require('path');


var EditorManager = brackets.getModule('editor/EditorManager');
var QuickOpen    = brackets.getModule('search/QuickOpen');
var StringMatch  = brackets.getModule('utils/StringMatch');


type Session = {
    items: QuickOpenItem[];
} 

interface QuickOpenItem {
    parents: string[];
    text: string;
    index: number;
    position: CodeMirror.Position;
    
    stringRanges?: { text: string; matched: boolean; includesLastSegment: boolean}[];
    matchGoodness?: number; 
    scoreDebug?: any;
}


var session: Session;

    
    
export var name = 'TypeScriptQuickFindDefitionProvider';
export var languageIds = ['typescript'];    
export var label = 'TypeScript';
    
export function match(query: string) {
    return query.indexOf('@') === 0;
}
    
export function search(request: string, stringMatcher: brackets.StringMatcher): JQueryPromise<QuickOpenItem[]>  {
    request = request.slice(request.indexOf('@') + 1, request.length);
    return $.Deferred(deferred => {
        getSession().then(function () {
            var items = session.items
                .slice()
                .map(item => {
                    var result = stringMatcher.match(item.text, request);
                    if (result) {
                        return utils.assign({}, item, result);
                    } else {
                        return null;
                    }
                })
                .filter(item => !!item)
            
            if(request.length) {
                StringMatch.basicMatchSort(items);
            }
            
            deferred.resolve(items);
        }, (e) => deferred.reject(e));
    }).promise();
};

function getSession(): Promise<Session> {
    if (session) {
        return Promise.resolve(session);
    } else {
        return ServiceConsumer.getService().then(function (service: any) {
            var editor = EditorManager.getActiveEditor();
            var currentFile = editor.document.file.fullPath;
            var ext = path.extname(currentFile);
            var isLibFile = ext === '.d.ts';
            var baseName = path.basename(currentFile, ext);
            
            return service.getNavigationBarItems(currentFile).then(function (items: any) {
                session = { 
                    items: extractQuickOpenItems(items.filter(function (item: NavigationBarItem) { 
                        return (
                            item.kind !== 'module' || isLibFile || 
                            !(new RegExp('^"+' + baseName + '+"$', 'g')).test(item.text)
                        );
                    }), editor), 
                    editor 
                };
                return session;
            });
        });
    }
}


function extractQuickOpenItems(navigationBarItems: NavigationBarItem[], editor: brackets.Editor): QuickOpenItem[]  {
    var items: QuickOpenItem[] = [];
    var current: string[] = [];
    function extracItem(item: NavigationBarItem) {
        var start = item.spans[0].start;
        var pos = editor._codeMirror.getDoc().posFromIndex(item.spans[0].start);
        items.push({
            text: item.text,
            index: start,
            position: pos,
            parents : current.slice()
        });
        if (item.childItems && item.childItems.length) {
            current.push(item.text);
            item.childItems.forEach(extracItem);
            current.pop();
        }
    }
    navigationBarItems.forEach(extracItem);
    
    return items.sort((a, b) => a.index - b.index);
}

export function done() {
    session = null;
};

function selecteItem(item: QuickOpenItem) {
    var pos = item.position;
    EditorManager.getActiveEditor().setCursorPos(pos.line, pos.ch, true, true);
};

    
    
export var itemSelect = selecteItem;
export var itemFocus = selecteItem;
    
export function resultsFormatter(item: QuickOpenItem) {
    var displayName = item.parents.concat(QuickOpen.highlightMatch(item)).join('.');
    return '<li>' + displayName + '</li>'
}
    



