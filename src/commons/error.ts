export enum ErrorKind {
    WARNING,
    ERROR
}

export interface ErrorDescriptor {
    kind: ErrorKind;
    message: string;
    position: CodeMirror.Position
}

export interface FileErrors {
    fullPath: string;
    errors: ErrorDescriptor[];
}