'use strict';

var debug: boolean;

class Logger {
    information(): boolean { 
    	return debug; 
    }
    debug(): boolean { 
    	return debug; 
    }
    warning(): boolean { 
    	return debug; 
    }
    error(): boolean { 
    	return debug; 
    }
    fatal(): boolean { 
    	return debug; 
    }

    log(s: string): void {
       console.log(s);
    }
}

module Logger {
	export function setDebugMode(value:boolean) {
		debug = value;
	}
}

export = Logger;