import CodeHintProvider = require('../main/codeHintProvider');
import completion = require('../commons/completion');
import bracketsMock = require('./bracketsMock');
import Rx = require('rx');
/* istanbulify ignore file */

describe('TypeScriptCodeHintProvider', function () {
    
    var hintProvider: CodeHintProvider,
        editor = new bracketsMock.Editor();
        
    beforeEach(function () {
        hintProvider = new CodeHintProvider();
    });
    
    describe('hastHint', function () {
        it('should always return true if no implicit chars are given' , function () {
            expect(hintProvider.hasHints(editor, undefined)).toBe(true);
        });
        
        it('should returns true if the last inserted character are \'.\' or \'(\' ', function () {
            expect(hintProvider.hasHints(editor, '.')).toBe(true);
            expect(hintProvider.hasHints(editor, '(')).toBe(true);
        });
        
        
        it('should returns false for other punctuation token', function () {
            expect(hintProvider.hasHints(editor, ';')).toBe(false);
            expect(hintProvider.hasHints(editor, '>')).toBe(false);
        });
        
        
        it('should returns true if implicit charcan be part of an javascript identifier', function () {
            expect(hintProvider.hasHints(editor, 'c')).toBe(true);
            expect(hintProvider.hasHints(editor, '$')).toBe(true);
            expect(hintProvider.hasHints(editor, '0')).toBe(true);
            expect(hintProvider.hasHints(editor, '_')).toBe(true);
        });
        
        
        it('should returns false if the implicitchar cannot be part of a javascript identifier', function () {
            expect(hintProvider.hasHints(editor, ' ')).toBe(false);
            expect(hintProvider.hasHints(editor, '\t')).toBe(false);
            expect(hintProvider.hasHints(editor, '\n')).toBe(false);
        });
    });
    
    describe('getHints', function () {
        var spy = jasmine.createSpy('changeSpy'),
            disposable: Rx.IDisposable;
        beforeEach(function () {
            disposable = hintProvider.geHintRequest().subscribe(spy);
            hintProvider.hasHints(editor, undefined);
        });
        
        afterEach(function () {
            spy.reset();
            disposable.dispose();
        });
        
        it('should provide an observable that contains the last hint request', function () {
            editor.setFile('file1.ts', 'hello world');
            editor.setCursorPos(0, 4);
            hintProvider.getHints(null);
            expect(spy).toHaveBeenCalledWith({ file: 'file1.ts', pos: { line: 0, ch: 4 } });
        });
        
        
        it('should return a deferred that resolve to jquery object ', function () {
            var hintResult: brackets.HintResult = null;
            editor.setFile('file1.ts', 'hello world');
            editor.setCursorPos(0, 4);
            hintProvider.getHints(null).then(result => hintResult = result)
            hintProvider.getHintsList().onNext({ 
                match: null, 
                entries:  [{
                    name: 'entry',
                    type: 'type',
                    kind: completion.CompletionKind.CLASS,
                    doc: null
                }]
            });
            waitsFor(() => !!hintResult, 'deffered should have resolved', 10);
            runs(function () {
                expect(hintResult.match).toBeFalsy();
                expect(hintResult.hints.length).toBe(1);
                expect(hintResult.hints[0][0].outerHTML).toBe([
                    '<span class="cm-s-default">',
                    '   <span style="display: inline-block" class="">',
                    '       <span style="font-weight: bold"></span>entry - type',
                    '   </span>',
                    '</span>'
                ].join('\n'));
            });
        });
    
    });
});