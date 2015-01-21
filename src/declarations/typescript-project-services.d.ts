declare module 'typescript-project-services' {
    
     class Promise<R> implements Promise.Thenable<R> {
        /**
         * If you call resolve in the body of the callback passed to the constructor, 
         * your promise is fulfilled with result object passed to resolve.
         * If you call reject your promise is rejected with the object passed to resolve. 
         * For consistency and debugging (eg stack traces), obj should be an instanceof Error. 
         * Any errors thrown in the constructor callback will be implicitly passed to reject().
         */
        constructor(callback: (resolve: (result: R) => void, reject: (error: any) => void) => void);
        /**
         * If you call resolve in the body of the callback passed to the constructor, 
         * your promise will be fulfilled/rejected with the outcome of thenable passed to resolve.
         * If you call reject your promise is rejected with the object passed to resolve. 
         * For consistency and debugging (eg stack traces), obj should be an instanceof Error. 
         * Any errors thrown in the constructor callback will be implicitly passed to reject().
         */
        constructor(callback: (resolve: (thenable: Promise.Thenable<R>) => void, reject: (error: any) => void) => void);


        /**
         * onFulFill is called when/if "promise" resolves. onRejected is called when/if "promise" rejects. 
         * Both are optional, if either/both are omitted the next onFulfilled/onRejected in the chain is called. 
         * Both callbacks have a single parameter , the fulfillment value or rejection reason. 
         * "then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after 
         * being passed through Promise.resolve. 
         * If an error is thrown in the callback, the returned promise rejects with that error.
         * 
         * @param onFulFill called when/if "promise" resolves
         * @param onReject called when/if "promise" rejects
         */
        then<U>(onFulfill: (value: R) => Promise.Thenable<U>,  onReject: (error: any) => Promise.Thenable<U>): Promise<U>;
        /**
         * onFulFill is called when/if "promise" resolves. onRejected is called when/if "promise" rejects. 
         * Both are optional, if either/both are omitted the next onFulfilled/onRejected in the chain is called. 
         * Both callbacks have a single parameter , the fulfillment value or rejection reason. 
         * "then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after 
         * being passed through Promise.resolve. 
         * If an error is thrown in the callback, the returned promise rejects with that error.
         * 
         * @param onFulFill called when/if "promise" resolves
         * @param onReject called when/if "promise" rejects
         */
        then<U>(onFulfill: (value: R) => Promise.Thenable<U>, onReject?: (error: any) => U): Promise<U>;
        /**
         * onFulFill is called when/if "promise" resolves. onRejected is called when/if "promise" rejects. 
         * Both are optional, if either/both are omitted the next onFulfilled/onRejected in the chain is called. 
         * Both callbacks have a single parameter , the fulfillment value or rejection reason. 
         * "then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after 
         * being passed through Promise.resolve. 
         * If an error is thrown in the callback, the returned promise rejects with that error.
         * 
         * @param onFulFill called when/if "promise" resolves
         * @param onReject called when/if "promise" rejects
         */
        then<U>(onFulfill: (value: R) => U, onReject: (error: any) => Promise.Thenable<U>): Promise<U>;
        /**
         * onFulFill is called when/if "promise" resolves. onRejected is called when/if "promise" rejects. 
         * Both are optional, if either/both are omitted the next onFulfilled/onRejected in the chain is called. 
         * Both callbacks have a single parameter , the fulfillment value or rejection reason. 
         * "then" returns a new promise equivalent to the value you return from onFulfilled/onRejected after 
         * being passed through Promise.resolve. 
         * If an error is thrown in the callback, the returned promise rejects with that error.
         * 
         * @param onFulFill called when/if "promise" resolves
         * @param onReject called when/if "promise" rejects
         */
        then<U>(onFulfill?: (value: R) => U, onReject?: (error: any) => U): Promise<U>;


        /**
         * Sugar for promise.then(undefined, onRejected)
         * 
         * @param onReject called when/if "promise" rejects
         */
        catch<U>(onReject?: (error: any) => Promise.Thenable<U>): Promise<U>;
        /**
         * Sugar for promise.then(undefined, onRejected)
         * 
         * @param onReject called when/if "promise" rejects
         */
        catch<U>(onReject?: (error: any) => U): Promise<U>;
    }

    module Promise {
        
        export interface Thenable<R> {
            then<U>(onFulfilled: (value: R) => Thenable<U>,  onRejected: (error: any) => Thenable<U>): Thenable<U>;
            then<U>(onFulfilled: (value: R) => Thenable<U>, onRejected?: (error: any) => U): Thenable<U>;
            then<U>(onFulfilled: (value: R) => U, onRejected: (error: any) => Thenable<U>): Thenable<U>;
            then<U>(onFulfilled?: (value: R) => U, onRejected?: (error: any) => U): Thenable<U>;
        }

        /**
         * Returns promise (only if promise.constructor == Promise)
         */
        function cast<R>(promise: Promise<R>): Promise<R>;
        /**
         * Make a promise that fulfills to obj.
         */
        function cast<R>(object?: R): Promise<R>;


        /**
         * Make a new promise from the thenable. 
         * A thenable is promise-like in as far as it has a "then" method. 
         * This also creates a new promise if you pass it a genuine JavaScript promise, 
         * making it less efficient for casting than Promise.cast.
         */
        function resolve<R>(thenable: Promise.Thenable<R>): Promise<R>;
        /**
         * Make a promise that fulfills to obj. Same as Promise.cast(obj) in this situation.
         */
        function resolve<R>(object?: R): Promise<R>;

        /**
         * Make a promise that rejects to obj. For consistency and debugging (eg stack traces), obj should be an instanceof Error
         */
        function reject(error?: any): Promise<any>;

        /**
         * Make a promise that fulfills when every item in the array fulfills, and rejects if (and when) any item rejects. 
         * the array passed to all can be a mixture of promise-like objects and other objects. 
         * The fulfillment value is an array (in order) of fulfillment values. The rejection value is the first rejection value.
         */
        function all<R>(promises: Promise<R>[]): Promise<R[]>;

        /**
         * Make a Promise that fulfills when any item fulfills, and rejects if any item rejects.
         */
        function race<R>(promises: Promise<R>[]): Promise<R>;
    }
    
    
    export interface ProjectManagerConfig {
        /**
         *  location of the default typescript compiler lib.d.ts file
         */
        defaultTypeScriptLocation: string;

        /**
         * editor filesystem manager
         */
        fileSystem: IFileSystem;

        /**
         * ditor workingset manager 
         */
        workingSet: IWorkingSet;

        /**
         * projects configurations
         */
        projectConfigs: { [projectId: string]: TypeScriptProjectConfig; };
    }
    

    /**
     * Project Configuration
     */
    export interface TypeScriptProjectConfig {

        //---------------------------------------------
        //  Brackets-Typescript Specific settings
        //---------------------------------------------

        /**
         * Array of minimatch pattern string representing 
         * sources of a project
         */
        sources?: string[];

        /**
         * Path to an alternative typescriptCompiler
         */
        typescriptPath?: string;


        //---------------------------------------------
        //  Compiler Settings
        //---------------------------------------------

        /**
         * should the project include the default typescript library file
         */
        noLib?: boolean;
        /**
         * 
         */
        target?: string;

        /**
         * Specify ECMAScript target version: 'ES3' (default), or 'ES5'
         */
        module?: string;

        /**
         * Specifies the location where debugger should locate TypeScript files instead of source locations.
         */
        sourceRoot?: string;

        /**
         *  Warn on expressions and declarations with an implied 'any' type.
         */
        noImplicitAny?: boolean;
    }
    

    /**
     * C# like events and delegates for typed events
     * dispatching
     */
    export interface ISignal<T> {
        /**
         * Subscribes a listener for the signal.
         * 
         * @params listener the callback to call when events are dispatched
         * @params priority an optional priority for this signal
         */
        add(listener: (parameter: T) => any, priority?: number): void;

        /**
         * unsubscribe a listener for the signal
         * 
         * @params listener the previously subscribed listener
         */
        remove(listener: (parameter: T) => any): void;

        /**
         * dispatch an event
         * 
         * @params parameter the parameter attached to the event dispatching
         */
        dispatch(parameter?: T): boolean;

        /**
         * Remove all listener from the signal
         */
        clear(): void;

        /**
         * @return true if the listener has been subsribed to this signal
         */
        hasListeners(): boolean;
    }


    /**
     * A simple wrapper over brackets filesystem that provide simple function and 
     * typed watcher
     */
    export interface IFileSystem {

        /**
         * return a promise resolving to the project root folder path
         */
        getProjectRoot(): Promise<string>;

        /**
         * a signal dispatching fine grained change reflecting the change that happens in the working set
         */
        projectFilesChanged: ISignal<FileChangeRecord[]>;

        /**
         * return a promise that resolve with an array of string containing all the files of the projects
         */
        getProjectFiles(): Promise<string[]>;

        /**
         * read a file, return a promise with that resolve to the file content
         * 
         * @param path the file to read
         */
        readFile(path: string): Promise<string>;
    }


    /**
     * FileSystem change descriptor
     */
    export interface FileChangeRecord {
        /**
         * kind of change
         */
        kind: number;

        /**
         * name of the file that have changed
         */
        fileName: string;
    }
    
    

    //--------------------------------------------------------------------------
    //
    //  IWorkingSet
    //
    //--------------------------------------------------------------------------

    /**
     * A service that will reflect files in the working set 
     */
    export interface IWorkingSet {
        /**
         * list of files in the working set
         */
        getFiles(): Promise<string[]>;

        /**
         * a signal dispatching events when change occured in the working set
         */
        workingSetChanged: ISignal<WorkingSetChangeRecord>;

        /**
         * a signal that provide fine grained change over edited document
         */
        documentEdited: ISignal<DocumentChangeRecord>;
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
        kind: number;

        /**
         * list of paths that has been added or removed from the working set
         */
        paths: string[];
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
        from?: {ch: number; line: number};

        /**
         * end positon of the change
         */
        to?: {ch: number; line: number};

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

    
    
    export function init(config: ProjectManagerConfig): Promise<void>;
    
    export function dispose():void;
    
    export function updateProjectConfigs(configs:  { [projectId: string]: TypeScriptProjectConfig; }): Promise<void>;
    /**
     * Represent definition info of a symbol
     */
    export interface DefinitionInfo {
        /**
         * full name of the symbol
         */
        name: string;

        /**
         * line at which the symbol definition start
         */
        lineStart: number;

        /**
         * charachter at which the symbol definition start
         */
        charStart: number;

        /**
         * line at which the symbol definition end
         */
        lineEnd: number;

        /**
         * charachter at which the symbol definition end
         */
        charEnd: number;

        /**
         * path of the file where the symbol is defined
         */
        fileName: string;
    }

    interface Position {line: number; ch: number}

    /**
     * retrieve definition info of a symbol at a given position in a given file
     * @param fileName the absolute path of the file 
     * @param position in the file where you want to retrieve definition info
     * 
     * @return a promise resolving to a list of definition info
     */

    export function getDefinitionAtPosition(fileName: string, position: Position ): Promise<DefinitionInfo[]>
    


    //--------------------------------------------------------------------------
    //
    //  Error service
    //
    //--------------------------------------------------------------------------

    export interface TSError {
        pos: Position;
        endPos: Position;
        message: string;
        type: number;
    }


    /**
     * Retrieve a list of errors for a given file
     * @param fileName the absolute path of the file 
     * 
     * @return a promise resolving to a list of errors
     */
    export function getErrorsForFile(fileName: string): Promise<TSError[]>
    



    export interface TextEdit {
        start: number;
        end: number;
        newText: string;
    }

    /**
     * Retrieve formating information for a givent file
     * @param fileName the absolute path of the file 
     * @param options formation options
     * @param startPos an option start position for the formating range
     * @param endPos an optional end position for the formating range
     * 
     * @return a promise resolving to a formating range info
     */
    export function getFormatingForFile(fileName: string, options: any, startPos?: Position, endPos?: Position): Promise<TextEdit[]>
    
    
    interface SymbolDisplayPart {
        text: string;
        kind: string;
    }

    /**
     * Represent a completion result
     */
    export interface CompletionResult {
        /**
         * the matched string portion
         */
        match: string;

        /**
         * list of proposed entries for code completion
         */
        entries: {
            name: string;
            kind: string;
            kindModifiers: string;
            displayParts: SymbolDisplayPart[];
            documentation: SymbolDisplayPart[];
        }[]
    }




    /**
     * Retrieve completion proposal at a given point in a given file
     * @param fileName the absolute path of the file 
     * @param position in the file where you want to retrieve completion proposal
     * 
     * @return a promise resolving to a list of proposals
     */
    export function getCompletionAtPosition(fileName: string, position: Position, limit?: number, skip?: number): Promise<CompletionResult>
}