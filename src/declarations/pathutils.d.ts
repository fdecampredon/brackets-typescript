declare var PathUtils : {
    directory(path:string): string;
    makePathRelative(path: string, basePath: string): string;
    makePathAbsolute(path: string, basePath: string): string;
}