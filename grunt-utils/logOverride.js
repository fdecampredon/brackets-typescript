/* jshint camelcase: false */
/* globals jasmine, phantom, console, window */
/**
 * Reports the coverage results after the test have run.
 *
 * @module grunt-template-jasmine-istanbul
 * @class reporter
 */
(function () {
    var log = console.log;
    window.__coverage__ = "";
	console.log = function (msg) {
        if (/^COVERAGE|COVERED/.test(msg)) {
            window.__coverage__ += msg + '\n';
        } else {
            log.apply(console, arguments);
        }
    };
})();