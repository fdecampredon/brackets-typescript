//   Copyright 2013-2014 François de Campredon
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.


/*jshint node: true*/

//var coverageTemplate = require('./grunt-utils/grunt-contrib-jasmine-coverify');

module.exports = function (grunt) {
    
    'use strict';
    var excludeGruntDeps = ['grunt-template-jasmine-istanbul'];
    require('matchdep').filterDev('grunt-*').forEach(function (task) { 
        if (excludeGruntDeps.indexOf(task) === -1) {
            grunt.loadNpmTasks(task);
        }
    });
    
    var istanbulify = require('istanbulify');
    
    grunt.initConfig({
        source: ['src/declarations/*.d.ts', 'src/commons/**/*.ts', 'src/main/**/*.ts'],
        workerSource: ['src/declarations/*.d.ts', 'src/commons/**/*.ts', 'src/ts-worker/**/*.ts'],
        testSource: ['src/declarations/*.d.ts', 'src/test-declarations/*.d.ts',  'src/test/**/*.ts'],
        tmpFolder: 'tmp',
        localBinFolder : 'built/',
        releaseBinFolder : 'bin/',
        
        clean : {
            local : '<%= localBinFolder %>',
            tmp : '<%= tmpFolder %>',
            release : '<%= releaseBinFolder %>'
        },
        
        typescript: {
            main: {
                src: '<%= source %>',
                dest: '<%= tmpFolder %>',
                options: {
                    basePath : 'src',
                    module : 'commonjs',
                    target: 'es5',
                    sourcemap: false,
                    comments : true,
                    noImplicitAny: true
                }
            },
            
            
            worker: {
                src: '<%= workerSource %>',
                dest: '<%= tmpFolder %>',
                options: {
                    basePath : 'src',
                    module : 'commonjs',
                    target: 'es5',
                    sourcemap: false,
                    comments : true,
                    noImplicitAny: true
                }
            },
            
            test: {
                src: '<%= testSource %>',
                dest: '<%= tmpFolder %>',
                
                options: {
                    basePath : 'src',
                    module: 'commonjs',
                    target: 'es5',
                    sourcemap: false,
                    comments : true,
                    noImplicitAny: true
                }
            }
		},
        
        browserify: {
            pkg: grunt.file.readJSON('package.json'),
            main: {
                files: {
                    'built/main.js': ['tmp/main/index.js']
                },
                options : {
                    shim: {
                        typescriptServices: {
                            path: 'third_party/typescript/typescriptServices.js',
                            exports: 'TypeScript'
                        }
                    },
                    noParse: ['third_party/typescript/typescriptServices.js'],
                    standalone: 'bracketsTypescript'
                }
            },
            worker: {
                files: {
                    'built/worker.js': ['tmp/ts-worker/index.js']
                },
                options: {
                    shim: {
                        typescriptServices: {
                            path: 'third_party/typescript/typescriptServices.js',
                            exports: 'TypeScript'
                        }
                    },
                    noParse: ['third_party/typescript/typescriptServices.js'] 
                }
            },
            
            test: {
                files: {
                    'built/test.js': ['./tmp/test/index.js']
                },
                options: {
                    debug: true,
                    transform : [istanbulify]
                }
            }
        },
        
        tslint: {
            options: {
                configuration: grunt.file.readJSON('tslint.json')
            },
            all: {
                src: [
                    'src/**/*.ts',
                    '!src/declarations/typescriptServices.d.ts'
                ]
            }
        },
        
        
        jasmine: {
            test: {
                src: 'undefined.js',
                options: {
                    specs: 'built/test.js',
                    vendor : [
                        'third_party/jquery.js',
                        'third_party/mustache.js',
                        'third_party/typescript/typescriptServices.js'
                    ],
                    keepRunner: true,
                    template: require('grunt-template-jasmine-istanbul'),
                    outfile: 'SpecRunner.html',
                    templateOptions: {
                        coverage: 'coverage/coverage.json',
                        report: 'coverage',
                        files: ['!**/test/**/*']
                    }
                }
            }
        },
        
                
        copy: {
            release: {
                expand: true,
                cwd: '<%= localBinFolder %>',
                src: '**/*.js',
                dest: '<%= releaseBinFolder %>'
            }
        },
        
        compress: {
            main: {
                options: {
                    archive: 'brackets-typescript.zip',
                    mode: 'zip'
                },
                files: [
                    {
                        expand: true,
                        cwd: 'release-templates',
                        src: '*',
                        dest: '/',
                        filter: 'isFile'
                    }, {
                        expand : true,
                        src: ['main.js', 'bin/**/*', 'third_party/typescript/**/*'],
                        dest : '/'
                    }
                ]
            }
        }
    });
    
    
    grunt.registerTask('build-main',['clean:tmp', 'typescript:main', 'browserify:main','clean:tmp']);
    grunt.registerTask('build-worker',['clean:tmp', 'typescript:worker', 'browserify:worker', 'clean:tmp']);
    grunt.registerTask('build-test', ['clean:tmp', 'typescript:test', 'browserify:test']);
    grunt.registerTask('test', ['tslint', 'build-test', 'jasmine', 'clean:tmp']);
    grunt.registerTask('build',['clean:local', 'build-main', 'build-worker']);
    grunt.registerTask('default', ['test', 'build']);
    grunt.registerTask('release', ['test', 'build', 'clean:release', 'copy:release','compress']);

};


