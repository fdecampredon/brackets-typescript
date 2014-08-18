/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window, Worker */

define(['require', 'text!config.json', './third_party/typescript/typescriptServices'], function (require, configText) {
    'use strict';
    
    var AppInit = brackets.getModule('utils/AppInit'),
        config = JSON.parse(configText),
        baseUrl = config.isDebug ? './built/' : './bin/';


    require([baseUrl + 'main'], function (init) {
        var initConfig = {
            logLevel: config.logLevel,
            typeScriptLocation: require.toUrl('./third_party/typescript/'),
            workerLocation: require.toUrl(baseUrl + 'worker.js')
        };

        AppInit.appReady(function () {
            try {
                init(initConfig);
            } catch(e) {
                console.error(e.stack);
            }
        });

    });
});
