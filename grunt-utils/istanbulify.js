/*jshint node:true*/

var istanbul = require('istanbul');
var through = require('through');
var minimatch = require('minimatch');
var path = require('path');
var esprima = require('esprima');


var instrumenter = new istanbul.Instrumenter();
function instrument(file, data) {
     return instrumenter.instrumentSync(data, file);
}

module.exports = function (file) {
    var data = '';
    return through(write, end);

    function write (buf) { 
        data += buf; 
    }
    function end () {
        var src;
        try {
            var syntax = esprima.parse(data, {comment: true});
            src = 
                (syntax.comments && syntax.comments.some(function (comment) {
                    return comment.type === 'Block' && /^\s*istanbulify +ignore +file\s*$/.test(comment.value);
                })) ?
                    data:
                    instrument(file, data)
                ;
        } catch (error) {
            this.emit('error', error);
        }
        this.queue(src);
        this.queue(null);
    }
};