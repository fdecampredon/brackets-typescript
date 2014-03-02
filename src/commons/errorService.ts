import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;;


interface ErrorService {
    getErrorsForFile(fileName: string): Promise<{ errors: brackets.LintingError[];  aborted: boolean }>
}

export = ErrorService;