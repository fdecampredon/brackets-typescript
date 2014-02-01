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


/*global module, require*/

module.exports = function (grunt) {
    
    'use strict';
    var excludeGruntDeps = ['grunt-template-jasmine-requirejs'];
    require('matchdep').filterDev('grunt-*').forEach(function (dep) {
        if (excludeGruntDeps.indexOf(dep) === -1) {
            grunt.loadNpmTasks(dep);
        }
    });
    
    grunt.initConfig({
        source: ['src/declarations/*.d.ts', 'src/commons/**/*.ts', 'src/main/**/*.ts'],
        workerSource: ['src/declarations/*.d.ts', 'src/commons/**/*.ts', 'src/ts-worker/**/*.ts'],
        testSource: ['src/declarations/*.d.ts', 'src/test-declarations/*.d.ts',  'src/test/**/*.ts'],
        tmpFolder: 'tmp/',
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
                base_path : 'src/main/',
                options: {
                    base_path : 'src',
                    module : 'commonjs',
                    target: 'es5',
                    sourcemap: false,
                    comments : true,
                    noImplicitAny: true,
                    ignoreTypeCheck: false
                }
            },
            
            
            worker: {
                src: '<%= workerSource %>',
                dest: '<%= tmpFolder %>',
                base_path : 'src/ts-worker/',
                options: {
                    base_path : 'src',
                    module : 'commonjs',
                    target: 'es5',
                    sourcemap: false,
                    comments : true,
                    noImplicitAny: true,
                    ignoreTypeCheck: false
                }
            },
            
            test: {
                src: '<%= testSource %>',
                dest: '<%= tmpFolder %>',
                
                options: {
                    base_path : 'src',
                    module: 'commonjs',
                    target: 'es5',
                    sourcemap: false,
                    noImplicitAny: true,
                    ignoreTypeCheck: false
                }
            }
		},
        
        browserify: {
            pkg: grunt.file.readJSON('package.json'),
            main: {
                files: {
                    'built/app.js': ['tmp/main/index.js']
                }
            },
            worker: {
                files: {
                    'built/worker.js': ['tmp/ts-worker/index.js']
                }
            },
            
            test: {
                files: {
                    'built/test.js': ['./tmp/test/index.js']
                },
                options: {
                    debug: true
                }
            }
        },
        
        
        jasmine: {
            test: {
                src: 'undefined.js',
                options: {
                    specs: 'built/test.js',
                    vendor : [
                        'third_party/jquery.js',
                        'third_party/path-utils.js',
                        'third_party/typescriptServices.js'
                    ],
                    keepRunner: true,
                    outfile: 'SpecRunner.html'
                }
            }
        },
    });
    
    
    grunt.registerTask('build-main',['clean:tmp', 'typescript:main', 'browserify:main','clean:tmp']);
    grunt.registerTask('build-worker',['clean:tmp', 'typescript:worker', 'browserify:worker', 'clean:tmp']);
    grunt.registerTask('build-test',['clean:tmp', 'typescript:test', 'browserify:test']);
    grunt.registerTask('test', ['build-test', 'jasmine']);
    grunt.registerTask('build',['clean:local', 'build-main', 'build-worker']);
    grunt.registerTask('default', ['test', 'build']);
    
    
    //grunt.registerTask('release', ['test', 'build', 'clean:release', 'copy:release']);
    
    
    var bla = {
    
        
        copy: {
            release: {
                expand: true,
                cwd: '<%= localBinFolder %>',
                src: '**/*.js',
                dest: '<%= releaseBinFolder %>'
            }
        },
        // later when the editor support tslint himself
        tslint: {
            options: {
                configuration: grunt.file.readJSON("tslint.json")
            },
            main: {
                src: ['src/main/**/*.ts']
            },
            test: {
                src: ['src/test/**/*.ts']
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
                        src: ['main.js', 'bin/**/*', 'third_party/**/*'],
                        dest : '/'
                    }
                ]
            }
        }
};    
};


