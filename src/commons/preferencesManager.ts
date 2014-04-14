import TypeScriptProjectConfig = require('./config');
import signal = require('./signal')

interface TypescriptPreferenceManager {
    getProjectsConfig(): { [projectId: string]: TypeScriptProjectConfig; };
    
    configChanged: signal.ISignal<void>;
}

export = TypescriptPreferenceManager;
