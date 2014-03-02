//   Copyright 2013 François de Campredon
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
define(["require", "exports", './utils/signal', './utils/collections'], function(require, exports, signal, collections) {
    

    

    /**
    * enum listing the change kind that occur in a working set
    */
    (function (WorkingSetChangeKind) {
        WorkingSetChangeKind[WorkingSetChangeKind["ADD"] = 0] = "ADD";
        WorkingSetChangeKind[WorkingSetChangeKind["REMOVE"] = 1] = "REMOVE";
    })(exports.WorkingSetChangeKind || (exports.WorkingSetChangeKind = {}));
    var WorkingSetChangeKind = exports.WorkingSetChangeKind;

    

    

    

    

    

    

    /**
    * implementation of the IWorkingSet
    */
    var WorkingSet = (function () {
        //-------------------------------
        //  constructor
        //-------------------------------
        function WorkingSet(documentManager, editorManager) {
            var _this = this;
            this.documentManager = documentManager;
            this.editorManager = editorManager;
            //-------------------------------
            //  Variables
            //-------------------------------
            /**
            * internal signal for workingSetChanged
            */
            this._workingSetChanged = new signal.Signal();
            /**
            * internal signal for documentEdited
            */
            this._documentEdited = new signal.Signal();
            /**
            * Set of file path in the working set
            */
            this.filesSet = new collections.StringSet();
            //-------------------------------
            //  Events Handler
            //-------------------------------
            /**
            * handle 'workingSetAdd' event
            */
            this.workingSetAddHandler = function (event, file) {
                _this.filesSet.add(file.fullPath);
                _this.workingSetChanged.dispatch({
                    kind: 0 /* ADD */,
                    paths: [file.fullPath]
                });
            };
            /**
            * handle 'workingSetAddList' event
            */
            this.workingSetAddListHandler = function (event) {
                var files = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    files[_i] = arguments[_i + 1];
                }
                var paths = files.map(function (file) {
                    _this.filesSet.add(file.fullPath);
                    return file.fullPath;
                });
                if (paths.length > 0) {
                    _this.workingSetChanged.dispatch({
                        kind: 0 /* ADD */,
                        paths: paths
                    });
                }
            };
            /**
            * handle 'workingSetRemove' event
            */
            this.workingSetRemoveHandler = function (event, file) {
                _this.filesSet.remove(file.fullPath);
                _this.workingSetChanged.dispatch({
                    kind: 1 /* REMOVE */,
                    paths: [file.fullPath]
                });
            };
            /**
            * handle 'workingSetRemoveList' event
            */
            this.workingSetRemoveListHandler = function (event) {
                var files = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    files[_i] = arguments[_i + 1];
                }
                var paths = files.map(function (file) {
                    _this.filesSet.remove(file.fullPath);
                    return file.fullPath;
                });
                if (paths.length > 0) {
                    _this.workingSetChanged.dispatch({
                        kind: 1 /* REMOVE */,
                        paths: paths
                    });
                }
            };
            /**
            * handle 'change' on document
            */
            this.documentChangesHandler = function (event, document, change) {
                var changesDescriptor = [];
                while (change) {
                    var changeDescriptor = {
                        path: document.file.fullPath,
                        from: change.from,
                        to: change.to,
                        text: change.text && change.text.join('\n'),
                        removed: change.removed ? change.removed.join("\n") : ""
                    };
                    if (!changeDescriptor.from || !changeDescriptor.to) {
                        changeDescriptor.documentText = document.getText();
                    }
                    changesDescriptor.push(changeDescriptor);
                    change = change.next;
                }
                if (changesDescriptor.length > 0) {
                    _this.documentEdited.dispatch(changesDescriptor);
                }
            };
            this.activeEditorChangeHandler = function (event, current, previous) {
                _this.setActiveEditor(current);
            };
            $(documentManager).on('workingSetAdd', this.workingSetAddHandler);
            $(documentManager).on('workingSetAddList', this.workingSetAddListHandler);
            $(documentManager).on('workingSetRemove', this.workingSetRemoveHandler);
            $(documentManager).on('workingSetRemoveList', this.workingSetRemoveListHandler);

            $(editorManager).on('activeEditorChange', this.activeEditorChangeHandler);

            this.setFiles(documentManager.getWorkingSet().map(function (file) {
                return file.fullPath;
            }));
            this.setActiveEditor(editorManager.getActiveEditor());
        }
        Object.defineProperty(WorkingSet.prototype, "files", {
            //-------------------------------
            //  IWorkingSet implementations
            //-------------------------------
            /**
            * @see IWorkingSet#files
            */
            get: function () {
                return this.filesSet.values;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(WorkingSet.prototype, "workingSetChanged", {
            /**
            * @see IWorkingSet#workingSetChanged
            */
            get: function () {
                return this._workingSetChanged;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(WorkingSet.prototype, "documentEdited", {
            /**
            * @see IWorkingSet#documentEdited
            */
            get: function () {
                return this._documentEdited;
            },
            enumerable: true,
            configurable: true
        });

        /**
        * @see IWorkingSet#dispose
        */
        WorkingSet.prototype.dispose = function () {
            $(this.documentManager).off('workingSetAdd', this.workingSetAddHandler);
            $(this.documentManager).off('workingSetAddList', this.workingSetAddListHandler);
            $(this.documentManager).off('workingSetRemove', this.workingSetRemoveHandler);
            $(this.documentManager).off('workingSetRemoveList', this.workingSetRemoveListHandler);
            $(this.editorManager).off('activeEditorChange', this.activeEditorChangeHandler);
            this.setFiles(null);
            this.setActiveEditor(null);
        };

        //-------------------------------
        //  Privates methods
        //-------------------------------
        /**
        * set working set files
        */
        WorkingSet.prototype.setFiles = function (files) {
            var _this = this;
            this.files.forEach(function (path) {
                return _this.filesSet.remove(path);
            });
            if (files) {
                files.forEach(function (path) {
                    return _this.filesSet.add(path);
                });
            }
        };

        WorkingSet.prototype.setActiveEditor = function (editor) {
            if (this.currentDocument) {
                $(this.currentDocument).off('change', this.documentChangesHandler);
            }
            this.currentDocument = editor && editor.document;
            if (this.currentDocument) {
                $(this.currentDocument).on('change', this.documentChangesHandler);
            }
        };
        return WorkingSet;
    })();
    exports.WorkingSet = WorkingSet;
});
