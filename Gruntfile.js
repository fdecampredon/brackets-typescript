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

module.exports = function (grunt) {
    
    'use strict';
    var excludedGruntDeps = ['grunt-template-jasmine-requirejs'];
    require('matchdep').filterDev('grunt-*').forEach(function (dep) {
        if (excludedGruntDeps.indexOf(dep) === -1) {
            grunt.loadNpmTasks(dep);
        }
    });
    
    grunt.initConfig({
        clean : {
            folder : ['bin', 'test-bin']
        },
        copy : {
            main: {
                expand: true,
                cwd: 'src/templates',
                src: '**',
                dest: 'bin/templates',
                flatten: true,
                filter: 'isFile',
            },
        },
        typescript: {
            main: {
	    		src: ['src/declarations/*.d.ts', 'src/main/**/*.ts'],
	        	dest: 'bin',
               
	        	options: {
                    base_path : 'src',
                    module : 'amd',
	         		target: 'es5',
                    sourcemap: false
                    //wait for 0.9.5
                    /*noImplicitAny: true*/
	          	}
        	},
            test: {
                src: ['src/declarations/*.d.ts', 'src/test-declarations/*.d.ts', 'src/test/**/*.ts'],
                dest: 'bin',
                
                options: {
                    base_path : 'src',
                    module: 'amd',
                    target: 'es5',
                    sourcemap: false,
                    //wait for 0.9.5
                    /*noImplicitAny: true*/
                }
            }   
		},
        jasmine: {
            test: {
                src: ['third_party/**/*.js'],
                options: {
                    specs: 'bin/test/**/*Test.js',
                    template: require('grunt-template-jasmine-requirejs'),
                    keepRunner: true,
                    outfile: 'SpecRunner.html'
                }
            }
        }
    });
     
    grunt.registerTask('test', ['typescript:test', 'jasmine']);
    grunt.registerTask('build', ['clean','typescript:main', 'copy']);
    grunt.registerTask('default', ['clean', 'test', 'build']);
};