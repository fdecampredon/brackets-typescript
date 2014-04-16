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

/*istanbulify ignore file*/

'use strict';

import LanguageServiceHost = require('../ts-worker/languageServiceHost');

describe('LanguageServiceHost', function () {
    var languageServiceHost: LanguageServiceHost
    beforeEach(function () {
        languageServiceHost = new LanguageServiceHost();
    });
    describe('CompilationSettings', function () {
        it('should copy the given compilation settings', function () {
            var compilationSettings: any = {
                foo: 'bar',
                hello : 'world'
            };
            
            languageServiceHost.setCompilationSettings(compilationSettings);
            expect(languageServiceHost.getCompilationSettings()).toNotBe(compilationSettings);
            expect(languageServiceHost.getCompilationSettings()).toEqual(compilationSettings);
        });
    })
    
    describe('Script Management', function () {
        it('should allows to add and remove script', function () {
            languageServiceHost.addScript('file1.ts', 'hello world');
            languageServiceHost.addScript('file2.ts', 'hello world');
            languageServiceHost.addScript('file3.ts', 'hello world');
            languageServiceHost.removeScript('file2.ts');
            expect(languageServiceHost.getScriptFileNames()).toEqual(['file1.ts', 'file3.ts']);
            languageServiceHost.removeAll();
            expect(languageServiceHost.getScriptFileNames()).toEqual([]);
        });
        
        
        it('should allows to update script content', function () {
            languageServiceHost.addScript('file1.ts', 'hello world');
            languageServiceHost.updateScript('file1.ts', 'foo bar');
            var snapshot = languageServiceHost.getScriptSnapshot('file1.ts')
            expect(snapshot.getText(0, snapshot.getLength())).toBe('foo bar');
            expect(languageServiceHost.getScriptVersion('file1.ts')).toBe(2);
        });
        
        it('should throws an error if the updated script does not exists', function () {
            expect(function () {
                languageServiceHost.updateScript('file1.ts', 'hello world');
            }).toThrow();
        });
        
        
        it('should allows to mark a script as \'open\'', function () {
            languageServiceHost.addScript('file1.ts', 'hello world');
            languageServiceHost.addScript('file2.ts', 'hello world');
            
            languageServiceHost.setScriptIsOpen('file1.ts', true);
            languageServiceHost.setScriptIsOpen('file2.ts', true);
            expect(languageServiceHost.getScriptIsOpen('file1.ts')).toBe(true);
            expect(languageServiceHost.getScriptIsOpen('file2.ts')).toBe(true);
            
            languageServiceHost.setScriptIsOpen('file1.ts', false);
            expect(languageServiceHost.getScriptIsOpen('file1.ts')).toBe(false);
            expect(languageServiceHost.getScriptIsOpen('file2.ts')).toBe(true);
            
            expect(function () {
                languageServiceHost.setScriptIsOpen('file3.ts', true);
            }).toThrow();
        });
        
        it('should allows to edit script', function () {
            languageServiceHost.addScript('file1.ts', 'hello world');
            languageServiceHost.editScript('file1.ts', 6, 11, 'bar');
            languageServiceHost.editScript('file1.ts', 0, 5, 'foo');
            var snapshot = languageServiceHost.getScriptSnapshot('file1.ts')
            expect(snapshot.getText(0, snapshot.getLength())).toBe('foo bar');
            expect(languageServiceHost.getScriptVersion('file1.ts')).toBe(3);
            expect(snapshot.getTextChangeRangeSinceVersion(1).newLength()).toBe(7);
            expect(snapshot.getTextChangeRangeSinceVersion(3).isUnchanged()).toBe(true);
            
            
            expect(function () {
                languageServiceHost.editScript('file3.ts', 6, 11, 'bar');
            }).toThrow();
            
            
            languageServiceHost.updateScript('file1.ts', 'hello world');
            expect(languageServiceHost.getScriptSnapshot('file1.ts').getTextChangeRangeSinceVersion(1)).toBe(null);
        });
        
        
        it('should provide a way to covert line/char to index position and index position to line/char', function () {
            languageServiceHost.addScript('file1.ts',
                'import fs = require("fs");\n' +
                '\n' +
                'function readFile(fileName: string): string {\n' +
                '    return fs.readFileSync(fileName, "UTF-8")\n' +
                '}\n' 
            );
            
            expect(languageServiceHost.getIndexFromPos('file1.ts', { ch: 10, line: 3 })).toBe(84);
            expect(languageServiceHost.indexToPosition('file1.ts', 37)).toEqual({ch: 9, line: 2});
            
            
            expect(languageServiceHost.getIndexFromPos('file2.ts', { ch: 10, line: 3 })).toBe(-1);
            expect(languageServiceHost.indexToPosition('file2.ts', 37)).toBeNull();
            
            var snapShot = languageServiceHost.getScriptSnapshot('file1.ts');
            expect(snapShot.getLineStartPositions()).toEqual([0, 27, 28, 74, 120, 122]);
        });
        
        
        it('should provide basic file system functions', function () {
            
            languageServiceHost.addScript('dir1/file1.ts', 'hello world');
            expect(languageServiceHost.fileExists('dir1/file1.ts')).toBe(true);
            expect(languageServiceHost.fileExists('file1.ts')).toBe(false);
            
            expect(languageServiceHost.directoryExists('anyDirectory')).toBe(true);
            expect(languageServiceHost.resolveRelativePath('../file1.ts', '/dir1/dir2/')).toBe('/dir1/file1.ts')
            expect(languageServiceHost.getParentDirectory('/dir1/file1.ts')).toBe('/dir1')
        
        });
        
         it('byteordermark should be None', function () {
            languageServiceHost.addScript('file1.ts', 'hello world');
            expect(languageServiceHost.getScriptByteOrderMark('file1.ts')).toBe(TypeScript.ByteOrderMark.None);
        });
        
        
        it('should provide default value when there is no script', function () {
            expect(languageServiceHost.getScriptSnapshot('file1.ts')).toBeNull();
            expect(languageServiceHost.getScriptVersion('file1.ts')).toBe(0);
            expect(languageServiceHost.getScriptIsOpen('file1.ts')).toBe(false);
            expect(languageServiceHost.getScriptByteOrderMark('file1.ts')).toBe(TypeScript.ByteOrderMark.None);
        });
        
        it('should returns diagnostic object', function () {
            //TODO I don't really know what are the spec here
            expect(languageServiceHost.getDiagnosticsObject()).toNotBe(null);
            expect(languageServiceHost.getLocalizedDiagnosticMessages()).toBe("");
        
        });
        
    })
});
