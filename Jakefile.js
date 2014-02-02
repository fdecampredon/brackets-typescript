//    Copyright 2013 François de Campredon (http://francois.de-campredon.fr)
//
//    Licensed under the Apache License, Version 2.0 (the 'License');
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an 'AS IS' BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.
//    Author : François de Campredon (http://francois.de-campredon.fr/),
//

/*jshint node:true*/
/*global jake, file, complete, directory, task*/

'use strict';

var fs = require('fs'),
    path = require('path');

var mainSources = new jake.FileList(),
    workerSources = new jake.FileList(),
    testSources = new jake.FileList();

mainSources.include(['src/declarations/*.d.ts', 'src/commons/**/*.ts', 'src/main/**/*.ts']);
workerSources.include(['src/declarations/*.d.ts', 'src/commons/**/*.ts', 'src/main/**/*.ts']);
testSources.include(['src/declarations/*.d.ts', 'src/test-declarations/*.d.ts',  'src/test/**/*.ts']);


var tmpFolder =  'tmp',
    localBinFolder=  'built/',
    releaseBinFolder = 'bin/';

    
/* Compiles a file from a list of sources`
 * @pram name name of the compilation target
 * @param sources: an array of the names of the source files
 */
function tsc(name, sources) {
    var cmd = "node ./node_modules/typescript/bin/tsc.js " +
        " -noImplicitAny " +
        " -module commonjs " + 
        " -target es5" +
        " -outDir " + tmpFolder + 
        " " + sources.join(" ");
    
    console.log(cmd + "\n");
    var ex = jake.createExec([cmd]);
    // Add listeners for output and error
    ex.addListener("stdout", function(output) {
        process.stdout.write(output);
    });
    ex.addListener("stderr", function(error) {
        process.stderr.write(error);
    });
    ex.addListener("cmdEnd", function() {
        complete();
    });
    ex.addListener("error", function() {
        console.log("Compilation of " + name + " unsuccessful");
    });
    ex.run();    
}

function browserify(outFile, source, options) {
    var optionsString = Object.keys(options || {}).map(function (option) { 
        return '--' + option + " " + options[option]; 
    }).join(' ');
    
    var cmd = "node ./node_modules/browserify/bin/cmd.js "+ optionsString + " " + source + " -o " + outFile; 
    console.log(cmd + "\n");
    var ex = jake.createExec([cmd]);
    // Add listeners for output and error
    ex.addListener("stdout", function(output) {
        process.stdout.write(output);
    });
    ex.addListener("stderr", function(error) {
        process.stderr.write(error);
    });
    ex.addListener("cmdEnd", function() {
        complete();
    });
    ex.addListener("error", function() {
        console.log("Compilation of " + outFile + " unsuccessful");
    });
    ex.run(); 
}

task('clean-tmp', function () {
    jake.rmRf(tmpFolder);
});

task('typescript-main', {async: true},  function () {
    directory(tmpFolder);
    tsc('main', mainSources); 
});

task('build-main',  ['clean-tmp', 'typescript-main'], {async: true},function () {
    console.log("hey");
    browserify('built/main.js', 'tmp/main/index.js');
});

task('typescript-worker', {async: true},  function () {
    directory(tmpFolder);
    tsc('worker', workerSources); 
});

task('build-worker',  ['clean-tmp', 'typescript-worker'], {async: true},function () {
    browserify('built/main.js', 'tmp/ts-worker/index.js');
});

task('typescript-test', {async: true},  function () {
    directory(tmpFolder);
    tsc('test', testSources); 
});

task('build-test',  ['clean-tmp', 'typescript-test'], {async: true},function () {
    browserify('built/test.js', 'tmp/test/index.js', { 
        transform: 'coverify'
    });
});

task('test', ['build-test'], {async: true}, function () {
    var cmd = "node built/test | ./node_modules/coverify/bin/cmd.js --stdout --json -o coverage.json";
    console.log(cmd + "\n");
    var ex = jake.createExec([cmd]);
    // Add listeners for output and error
    ex.addListener("stdout", function(output) {
        process.stdout.write(output);
    });
    ex.addListener("stderr", function(error) {
        process.stderr.write(error);
    });
    ex.addListener("cmdEnd", function() {
        complete();
    });
    ex.addListener("error", function() {
        console.log(arguments);
    });
    ex.run(); 
});


task('build',['build-main', 'build-worker']);
task('default',['test', 'build-main', 'build-worker']);


  /*grunt.registerTask('test', ['clean:tmp', 'typescript:test', 'browserify:test', 'clean:tmp']);
    grunt.registerTask('build',['clean:local', 'build-main']);
    grunt.registerTask('default', ['build', 'test']);*/




