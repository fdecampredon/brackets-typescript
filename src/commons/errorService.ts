interface ErrorService {
    getErrorsForFile(fileName: string): JQueryPromise<{ errors: brackets.LintingError[];  aborted: boolean }>
}

export = ErrorService;