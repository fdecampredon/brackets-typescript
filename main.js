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
                worker = new Worker(require.toUrl('./ts-worker.js')),
                typeScriptUtils,
                initializeFunction,
                requireReady,
                workerReady;
            
            function initializeApplication() {
                if (requireReady && workerReady) {
                    
                    worker.onmessage = null;
                    
                    typeScriptUtils.DEFAULT_LIB_LOCATION = require.toUrl('third_party/lib.d.ts');
                    typeScriptUtils.worker = worker;
                    typeScriptUtils.minimatch = minimatch;
                    
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
            
            worker.onmessage = function () {
                workerReady = true;
                initializeApplication();
            };
            
            worker.postMessage(require.toUrl(baseUrl));
            
            require([ baseUrl + 'main/typeScriptUtils', baseUrl + 'main/index'], function (tsUtils, init) {
                typeScriptUtils = tsUtils;
                initializeFunction = init;
                requireReady = true;
                initializeApplication();
            });
        }
    );
});
