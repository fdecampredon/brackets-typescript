/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

define(function (require, exports, module) {
 	"use strict";
 	var debug = true;
	require(["third_party/typescriptServices"],  function (){
		require(["bin/main/index"],  function (init){
			init(debug);
		})
	})
});