/* jshint camelcase: false */
/* globals jasmine, phantom, console, window */
/**
 * Reports the coverage results after the test have run.
 *
 * @module grunt-template-jasmine-istanbul
 * @class reporter
 */
(function () {
    var reporter = {
		/**
		 * Reports the coverage variable by dispatching a message from phantom.
		 *
		 * @method jasmineDone
		 */
		reportRunnerResults: function () {
			if (window.__coverage__) {
				phantom.sendMessage('jasmine.coverify', window.__coverage__);
			}
		}
	};
	jasmine.getEnv().addReporter(reporter);
})();