
import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;
import signal = require('./signal');



//--------------------------------------------------------------------------
//
//  IWorkingSet
//
//--------------------------------------------------------------------------


export interface WorkingSet {
    /**
     * list of files in the working set
     */
    getFiles(): Promise<string[]>;
    
    /**
     * a signal dispatching events when change occured in the working set
     */
    workingSetChanged: signal.Signal<WorkingSetChangeRecord>;
    
    /**
     * a signal that provide fine grained change over edited document
     */
    documentEdited: signal.Signal<DocumentChangeRecord>;

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
    
}
/**
 * describe a list of change in a document
 */
export interface DocumentChangeRecord {
    /**
     * path of the files that has changed
     */
    path: string;
    /**
     * list of changes
     */
    changeList: DocumentChangeDescriptor[];
    
    /**
     * documentText
     */
    documentText: string
}