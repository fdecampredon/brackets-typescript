'use strict';

var currentLogLevel: Logger.Level = 3;

class Logger {
    information(): boolean { 
    	return currentLogLevel >= Logger.Level.INFORMATION; 
    }
    
    debug(): boolean { 
    	return currentLogLevel >= Logger.Level.DEBUG; 
    }
    
    warning(): boolean { 
    	return currentLogLevel >= Logger.Level.WARNING; 
    }
    
    error(): boolean { 
    	return currentLogLevel >= Logger.Level.ERROR; 
    }
    
    fatal(): boolean { 
    	return currentLogLevel >= Logger.Level.FATAL; 
    }

    log(s: string): void {
       //console.log(s);
    }
}

module Logger {
	export function setLogLevel(value: string) {
		switch(value) {
            case "information":
                currentLogLevel = Level.INFORMATION;
                break;
            case "debug":
               currentLogLevel = Level.DEBUG;
                break;
            case "warning":
                currentLogLevel = Level.WARNING;
                break;
            case "error":
                currentLogLevel = Level.ERROR;
                break;
            case "fatal":
                currentLogLevel = Level.FATAL;
                break;
        }
	}
    
    export enum Level {
        INFORMATION,
        DEBUG, 
        WARNING,
        ERROR,
        FATAL
    }
}

export = Logger;