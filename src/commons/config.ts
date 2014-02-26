/**
 * the TypeScript project config file interface
 */
interface TypeScriptProjectConfig {
    sources?: string[];
    buildAutomaticly?: boolean;
    typescriptPath?: string;
    
    
    ///Compiler Settings
    propagateEnumConstants?: boolean;
    removeComments?: boolean;
    noLib?: boolean;
    target?: string;
    module?: string;
    outFile?: string;
    outDir?: string;
    mapSource?: boolean;
    mapRoot?: string;
    sourceRoot?: string;
    declaration?: boolean;
    useCaseSensitiveFileResolution?: boolean;
    allowImportModule?: boolean;
    noImplicitAny?: boolean;
}

export = TypeScriptProjectConfig