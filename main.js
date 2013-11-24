/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
    "use strict";
    require(
        [
            "third_party/typescriptServices",
            "third_party/minimatch",
            "bin/main/typeScriptUtils"
        ],
        function (typescript, minimatch, typeScriptUtils, init) {
            var AppInit = brackets.getModule('utils/AppInit');
            typeScriptUtils.DEFAULT_LIB_LOCATION = require.toUrl('third_party/lib.d.ts');
            typeScriptUtils.minimatch = minimatch;
            
            require(["bin/main/index"], function (init) {
                init();
                //AppInit.appReady(init);
            });
        }
    );
});


