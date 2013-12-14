//   Copyright 2013 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

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