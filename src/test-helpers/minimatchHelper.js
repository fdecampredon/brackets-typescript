
/*global require */

(function () {
    'use strict';
    require(
        [
            'third_party/minimatch',
            'built/test/main/typeScriptUtils'
        ],
        function (minimatch, typeScriptUtils) {
            typeScriptUtils.DEFAULT_LIB_LOCATION = require.toUrl('../../third_party/lib.d.ts');
            typeScriptUtils.minimatch = minimatch;
        }
    );
}());


