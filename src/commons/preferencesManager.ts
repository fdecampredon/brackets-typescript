import TypeScriptProjectConfig = require('./config');
import signal = require('./signal')
import es6Promise = require('es6-promise');
import Promise = es6Promise.Promise;


interface TypescriptPreferenceManager {
    getProjectsConfig(): Promise<{ [projectId: string]: TypeScriptProjectConfig; }>;
    
    configChanged: signal.ISignal<void>;
}

export = TypescriptPreferenceManager;
