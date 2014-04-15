import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;

/**
 * A service allowing to retrieve typescript errors
 */
interface ErrorService {
    /**
     * Retrieve a list of errors for a given file
     * @param fileName the absolute path of the file 
     * 
     * @return a promise resolving to a list of errors
     */
    getErrorsForFile(fileName: string): Promise<{ errors: brackets.LintingError[];  aborted: boolean }>
}

export = ErrorService;