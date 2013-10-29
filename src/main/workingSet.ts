import signal = require('./utils/signal');

export interface IWorkingSet {
    
    workingSetChanged: signal.ISignal<ChangeRecord>;
    documentEdited: signal.ISignal<DocumentChangeDescriptor[]>;

    files:string [];
    dispose(): void;
}


export interface ChangeRecord {
    kind: WorkingSetChangeKind;
    paths : string[];
}
export enum WorkingSetChangeKind {
    ADD,
    REMOVE
}


export interface Position {
    line: number;
    ch: number;
}

export interface DocumentChangeDescriptor {
    path: string;
    from: Position;
    to: Position;
    text: string;
    removed: string;
}


export class WorkingSet implements IWorkingSet {
    
    private documentManager: brackets.DocumentManager;
    
    constructor(documentManager: brackets.DocumentManager) {
        this.documentManager = documentManager
        $(documentManager).on('workingSetAdd', this.workingSetAddHandler);
        $(documentManager).on('workingSetAddList', this.workingSetAddListHandler);
        $(documentManager).on('workingSetRemove', this.workingSetRemoveHandler);
        $(documentManager).on('workingSetRemoveList', this.workingSetRemoveListHandler);
        $(documentManager).on('currentDocumentChange', this.currentDocumentChangeHandler);
        this._files = documentManager.getWorkingSet().map(file => file.fullPath);
        this.setCurrentDocument(this.documentManager.getCurrentDocument());
    }
    
    workingSetChanged = new signal.Signal<ChangeRecord>();
    documentEdited = new signal.Signal<DocumentChangeDescriptor[]>();
    
    private _files: string[] = [];

    get files(): string[] {
        return this._files.slice(0, this._files.length);
    }
    
   
    
        
    dispose(): void {
        $(this.documentManager).off('workingSetAdd', this.workingSetAddHandler);
        $(this.documentManager).off('workingSetAddList', this.workingSetAddListHandler);
        $(this.documentManager).off('workingSetRemove', this.workingSetRemoveHandler);
        $(this.documentManager).off('workingSetRemoveList', this.workingSetRemoveListHandler);
        $(this.documentManager).off('currentDocumentChange', this.currentDocumentChangeHandler);
        this.setCurrentDocument(null);
    }
    
    private workingSetAddHandler = (event: any, file: brackets.FileEntry) => {
        this._files.push(file.fullPath);
        this.workingSetChanged.dispatch({
            kind: WorkingSetChangeKind.ADD,
            paths: [file.fullPath]
        });
    }

    
    private workingSetAddListHandler = (event: any, ...files: brackets.FileEntry[]) => {
        var paths = files.map( file => file.fullPath);
        this._files = this._files.concat(paths);
        this.workingSetChanged.dispatch({
            kind: WorkingSetChangeKind.ADD,
            paths: paths
        });
    }
    
            
    private workingSetRemoveHandler = (event: any, file: brackets.FileEntry) => {
        var index = this._files.indexOf(file.fullPath);
        if (index !== -1) {
            this._files.splice(index, 1);
            this.workingSetChanged.dispatch({
                kind: WorkingSetChangeKind.REMOVE,
                paths: [file.fullPath]
            });
        }
    }
    
    private workingSetRemoveListHandler = (event: any, ...files: brackets.FileEntry[]) => {
        var pathsRemoved: string[] = [];
        files.forEach(file => {
            var index = this._files.indexOf(file.fullPath);
            if (index !== -1) {
                this._files.splice(index, 1);
                pathsRemoved.push(file.fullPath)
            }
        });
        if (pathsRemoved.length > 0) {
            this.workingSetChanged.dispatch({
                kind: WorkingSetChangeKind.REMOVE,
                paths: pathsRemoved
            });
        }
    }
    
    private currentDocumentChangeHandler = (event: any, document: brackets.Document) => {
        this.setCurrentDocument(this.documentManager.getCurrentDocument());
    }
    
    private _currentDocument: brackets.Document;
    private setCurrentDocument(document: brackets.Document) {
        if (this._currentDocument) {
            $(this._currentDocument).off('change', this.documentChangesHandler);
        }
        this._currentDocument = document;
        if (this._currentDocument) {
            $(this._currentDocument).on('change', this.documentChangesHandler);
        }
    }
    
    private documentChangesHandler = (event: any, document: brackets.Document, change: CodeMirror.EditorChangeLinkedList) => {
        var changesDescriptor: DocumentChangeDescriptor[] = []
        while (change) {
            changesDescriptor.push({
                path: this._currentDocument.file.fullPath,
                from: change.from,
                to: change.to,
                text: change.text && change.text.join('\n'),
                removed: change.removed
            });
            change = change.next;
        }
        if (changesDescriptor.length > 0) {
            this.documentEdited.dispatch(changesDescriptor);
        }   
    }

}



    