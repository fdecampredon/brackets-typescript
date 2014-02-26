


//--------------------------------------------------------------------------
//
//  IWorkingSet
//
//--------------------------------------------------------------------------


export interface WorkingSet {
    /**
     * list of files in the working set
     */
    getFiles(): JQueryPromise<string[]>;
    
    /**
     * a signal dispatching events when change occured in the working set
     */
    workingSetChanged: Rx.Observable<WorkingSetChangeRecord>;
    
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
export interface WorkingSetChangeRecord {
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
    from?: CodeMirror.Position;
    
    /**
     * end positon of the change
     */
    to?: CodeMirror.Position;
    
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