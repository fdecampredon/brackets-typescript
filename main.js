/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Worker */

define(function (require, exports, module) {
    'use strict';
    require(
        [
            'third_party/typescriptServices',
            'third_party/minimatch',
            'text!config.json'
        ],
        function (typescript, minimatch, configText) {
            var AppInit = brackets.getModule('utils/AppInit'),
                config = JSON.parse(configText),
                baseUrl = config.isDebug ? './built/local/' : './bin/',
                worker,
                typeScriptUtils,
                initializeFunction,
                requireReady,
                workerReady;
            
            function initializeApplication() {
                if (requireReady && workerReady) {
                    typeScriptUtils.DEFAULT_LIB_LOCATION = require.toUrl('third_party/lib.d.ts');
                    typeScriptUtils.minimatch = minimatch;
                    
					if (config.isDebug) {
                        worker.onmessage = null;
                        typeScriptUtils.worker = worker;
					}
                    
                  
                    
                    //in debug mode avoid using AppInit that catch errors ...
                    if (config.isDebug) {
                        initializeFunction(config);
                    } else {
                        AppInit.appReady(function () {
                            initializeFunction(config);
                        });
                    }
                }
            }
            
			if (config.isDebug) {
				worker = new Worker(require.toUrl('./ts-worker.js'));
                worker.onmessage = function () {
                    workerReady = true;
                    initializeApplication();
                };
                worker.postMessage(require.toUrl(baseUrl));
			} else {
				workerReady = true;
			}
          
          
            require([ baseUrl + 'main/typeScriptUtils', baseUrl + 'main/index'], function (tsUtils, init) {
                typeScriptUtils = tsUtils;
                initializeFunction = init;
                requireReady = true;
                initializeApplication();
            });
        }
    );
});
