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


import Rx = require('rx');
import collections = require('../commons/collections');



//--------------------------------------------------------------------------
//
//  IWorkingSet
//
//--------------------------------------------------------------------------

/**
 * A simple wrapper over brackets Document and DocumentManager that
 * provide information of change in the working set and
 * in the edited document.
 */
export interface IWorkingSet {
    /**
     * list of files in the working set
     */
    files: string [];
    
    /**
     * a signal dispatching events when change occured in the working set
     */
    workingSetChanged: Rx.Observable<ChangeRecord>;
    
    /**
     * a signal that provide fine grained change over edited document
     */
    documentEdited: Rx.Observable<DocumentChangeDescriptor[]>;

    /**
     * dispose the working set 
     */
    dispose(): void;
}



//--------------------------------------------------------------------------
//
//  ChangeRecord
//
//--------------------------------------------------------------------------


/**
 * describe change in the working set
 */
export interface ChangeRecord {
    /**
     * kind of change that occured in the working set
     */
    kind: WorkingSetChangeKind;
    
    /**
     * list of paths that has been added or removed from the working set
     */
    paths : string[];
}


/**
 * enum listing the change kind that occur in a working set
 */
export enum WorkingSetChangeKind {
    ADD,
    REMOVE
}


//--------------------------------------------------------------------------
//
//  DocumentChangeDescriptor
//
//--------------------------------------------------------------------------

/**
 * describe a change in a document
 */
export interface DocumentChangeDescriptor {
    /**
     * path of the files that has changed
     */
    path: string;
    
    /**
     * start position of the change
     */
    from?: Position;
    
    /**
     * end positon of the change
     */
    to?: Position;
    
    /**
     * text that has been inserted (if any)
     */
    text?: string;
    
    /**
     * text that has been removed (if any)
     */
    removed?: string;
    
    documentText?: string
    
}

/**
 * describe a positon in a document by line/character
 */
export interface Position {
    line: number;
    ch: number;
}


//--------------------------------------------------------------------------
//
//  IWorkingSet implementation
//
//--------------------------------------------------------------------------

/**
 * extracted interface of the brackets DocumentManager 
 */
export interface BracketesDocumentManager {
    getWorkingSet(): { fullPath: string }[];
}

/**
 * extracted interface of the brackets Document
 */
export interface BracketsDocument {
    file: { fullPath: string };
    getText(): string;
}

/**
 * extracted interface of the brackets EditorManager
 */
export interface BracketsEditorManager {
    getActiveEditor(): BracketsEditor;
}

/**
 * extracted interface of the brackets Editor
 */
export interface BracketsEditor {
    document: BracketsDocument;
}

/**
 * implementation of the IWorkingSet
 */
export class WorkingSet implements IWorkingSet {
    
    //-------------------------------
    //  constructor
    //-------------------------------


    constructor(
            private documentManager: BracketesDocumentManager,
            private editorManager: BracketsEditorManager
    ) {
        $(documentManager).on('workingSetAdd', <any>this.workingSetAddHandler);
        $(documentManager).on('workingSetAddList', <any>this.workingSetAddListHandler);
        $(documentManager).on('workingSetRemove', <any>this.workingSetRemoveHandler);
        $(documentManager).on('workingSetRemoveList', <any>this.workingSetRemoveListHandler);
        
        $(editorManager).on('activeEditorChange', <any>this.activeEditorChangeHandler); 
        
        this.setFiles(documentManager.getWorkingSet().map(file => file.fullPath));
        this.setActiveEditor(editorManager.getActiveEditor());
    }
    
    //-------------------------------
    //  Variables
    //-------------------------------
    
    /**
     * internal signal for workingSetChanged
     */
    private _workingSetChanged = new Rx.Subject<ChangeRecord>();
    
    /**
     * internal signal for documentEdited
     */
    private _documentEdited = new Rx.Subject<DocumentChangeDescriptor[]>();
    
        
    /**
     * Set of file path in the working set
     */
    private filesSet = new collections.StringSet();
    
    /**
     * Set of file path in the working set
     */
    private currentDocument: BracketsDocument;

    
    //-------------------------------
    //  IWorkingSet implementations
    //-------------------------------
    
    
    /**
     * @see IWorkingSet#files
     */
    get files(): string[] {
        return this.filesSet.values;
    }
    
    /**
     * @see IWorkingSet#workingSetChanged
     */
    get workingSetChanged() {
        return this._workingSetChanged;
    }
    
    
    /**
     * @see IWorkingSet#documentEdited
     */
    get documentEdited() {
        return this._documentEdited;
    }

    /**
     * @see IWorkingSet#dispose
     */    
    dispose(): void {
        $(this.documentManager).off('workingSetAdd', <any>this.workingSetAddHandler);
        $(this.documentManager).off('workingSetAddList', <any>this.workingSetAddListHandler);
        $(this.documentManager).off('workingSetRemove', <any>this.workingSetRemoveHandler);
        $(this.documentManager).off('workingSetRemoveList', <any>this.workingSetRemoveListHandler);
        $(this.editorManager).off('activeEditorChange', <any>this.activeEditorChangeHandler); 
        this.setFiles(null);
        this.setActiveEditor(null);
    }
    
    //-------------------------------
    //  Privates methods
    //-------------------------------
    
    /**
     * set working set files
     */
    private setFiles(files: string[]) {
        this.files.forEach(path => this.filesSet.remove(path))
        if (files) {
            files.forEach(path => this.filesSet.add(path));
        }
    }
    
    //-------------------------------
    //  Events Handler
    //-------------------------------
    
    /**
     * handle 'workingSetAdd' event
     */
    private workingSetAddHandler = (event: any, file: brackets.File) => {
        this.filesSet.add(file.fullPath);
        this.workingSetChanged.onNext({
            kind: WorkingSetChangeKind.ADD,
            paths: [file.fullPath]
        });
    }

    /**
     * handle 'workingSetAddList' event
     */
    private workingSetAddListHandler = (event: any, ...files: brackets.File[]) => {
        var paths = files.map(file => {
            this.filesSet.add(file.fullPath); 
            return file.fullPath;
        });
        if (paths.length > 0) {
            this.workingSetChanged.onNext({
                kind: WorkingSetChangeKind.ADD,
                paths: paths
            });
        }
    }
    
    /**
     * handle 'workingSetRemove' event
     */      
    private workingSetRemoveHandler = (event: any, file: brackets.File) => {
        this.filesSet.remove(file.fullPath);
        this.workingSetChanged.onNext({
            kind: WorkingSetChangeKind.REMOVE,
            paths: [file.fullPath]
        });
    }
    
    /**
     * handle 'workingSetRemoveList' event
     */      
    private workingSetRemoveListHandler = (event: any, ...files: brackets.File[]) => {
        var paths = files.map( file => {
            this.filesSet.remove(file.fullPath); 
            return file.fullPath
        });
        if (paths.length > 0) {
            this.workingSetChanged.onNext({
                kind: WorkingSetChangeKind.REMOVE,
                paths: paths
            });
        }
    }
 
    private setActiveEditor(editor: BracketsEditor) {
        if (this.currentDocument) {
            $(this.currentDocument).off('change', <any>this.documentChangesHandler);
        }
        this.currentDocument = editor && editor.document;
        if (this.currentDocument) {
            $(this.currentDocument).on('change', <any>this.documentChangesHandler);
        }
    }
            
    
    /**
     * handle 'change' on document
     */
    private documentChangesHandler = (event: any, document: BracketsDocument, change: CodeMirror.EditorChangeLinkedList) => {
        var changesDescriptor: DocumentChangeDescriptor[] = [];
        while (change) {
            var changeDescriptor: DocumentChangeDescriptor ={
                path: document.file.fullPath,
                from: change.from,
                to: change.to,
                text: change.text && change.text.join('\n'),
                removed: change.removed ? change.removed.join("\n") : ""
            }
            if (!changeDescriptor.from || !changeDescriptor.to) {
                changeDescriptor.documentText = document.getText()
            }
            changesDescriptor.push(changeDescriptor);
            change = change.next; 
        }
        if (changesDescriptor.length > 0) {
            this.documentEdited.onNext(changesDescriptor);
        }   
    }
    
    private activeEditorChangeHandler = (event: any, current: BracketsEditor, previous: BracketsEditor) => {
        this.setActiveEditor(current);
    }

}



    