define(["require", "exports", './utils/signal'], function(require, exports, __signal__) {
    var signal = __signal__;

    (function (WorkingSetChangeKind) {
        WorkingSetChangeKind[WorkingSetChangeKind["ADD"] = 0] = "ADD";
        WorkingSetChangeKind[WorkingSetChangeKind["REMOVE"] = 1] = "REMOVE";
    })(exports.WorkingSetChangeKind || (exports.WorkingSetChangeKind = {}));
    var WorkingSetChangeKind = exports.WorkingSetChangeKind;

    var WorkingSet = (function () {
        function WorkingSet(documentManager) {
            var _this = this;
            this.workingSetChanged = new signal.Signal();
            this.documentEdited = new signal.Signal();
            this._files = [];
            this.workingSetAddHandler = function (event, file) {
                _this._files.push(file.fullPath);
                _this.workingSetChanged.dispatch({
                    kind: WorkingSetChangeKind.ADD,
                    paths: [file.fullPath]
                });
            };
            this.workingSetAddListHandler = function (event) {
                var files = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    files[_i] = arguments[_i + 1];
                }
                var paths = files.map(function (file) {
                    return file.fullPath;
                });
                _this._files = _this._files.concat(paths);
                _this.workingSetChanged.dispatch({
                    kind: WorkingSetChangeKind.ADD,
                    paths: paths
                });
            };
            this.workingSetRemoveHandler = function (event, file) {
                var index = _this._files.indexOf(file.fullPath);
                if (index !== -1) {
                    _this._files.splice(index, 1);
                    _this.workingSetChanged.dispatch({
                        kind: WorkingSetChangeKind.REMOVE,
                        paths: [file.fullPath]
                    });
                }
            };
            this.workingSetRemoveListHandler = function (event) {
                var files = [];
                for (var _i = 0; _i < (arguments.length - 1); _i++) {
                    files[_i] = arguments[_i + 1];
                }
                var pathsRemoved = [];
                files.forEach(function (file) {
                    var index = _this._files.indexOf(file.fullPath);
                    if (index !== -1) {
                        _this._files.splice(index, 1);
                        pathsRemoved.push(file.fullPath);
                    }
                });
                if (pathsRemoved.length > 0) {
                    _this.workingSetChanged.dispatch({
                        kind: WorkingSetChangeKind.REMOVE,
                        paths: pathsRemoved
                    });
                }
            };
            this.currentDocumentChangeHandler = function (event, document) {
                _this.setCurrentDocument(_this.documentManager.getCurrentDocument());
            };
            this.documentChangesHandler = function (event, document, change) {
                var changesDescriptor = [];
                while (change) {
                    changesDescriptor.push({
                        path: _this._currentDocument.file.fullPath,
                        from: change.from,
                        to: change.to,
                        text: change.text && change.text.join('\n'),
                        removed: change.removed
                    });
                    change = change.next;
                }
                if (changesDescriptor.length > 0) {
                    _this.documentEdited.dispatch(changesDescriptor);
                }
            };
            this.documentManager = documentManager;
            $(documentManager).on('workingSetAdd', this.workingSetAddHandler);
            $(documentManager).on('workingSetAddList', this.workingSetAddListHandler);
            $(documentManager).on('workingSetRemove', this.workingSetRemoveHandler);
            $(documentManager).on('workingSetRemoveList', this.workingSetRemoveListHandler);
            $(documentManager).on('currentDocumentChange', this.currentDocumentChangeHandler);
            this._files = documentManager.getWorkingSet().map(function (file) {
                return file.fullPath;
            });
            this.setCurrentDocument(this.documentManager.getCurrentDocument());
        }
        Object.defineProperty(WorkingSet.prototype, "files", {
            get: function () {
                return this._files.slice(0, this._files.length);
            },
            enumerable: true,
            configurable: true
        });

        WorkingSet.prototype.dispose = function () {
            $(this.documentManager).off('workingSetAdd', this.workingSetAddHandler);
            $(this.documentManager).off('workingSetAddList', this.workingSetAddListHandler);
            $(this.documentManager).off('workingSetRemove', this.workingSetRemoveHandler);
            $(this.documentManager).off('workingSetRemoveList', this.workingSetRemoveListHandler);
            $(this.documentManager).off('currentDocumentChange', this.currentDocumentChangeHandler);
            this.setCurrentDocument(null);
        };

        WorkingSet.prototype.setCurrentDocument = function (document) {
            if (this._currentDocument) {
                $(this._currentDocument).off('change', this.documentChangesHandler);
            }
            this._currentDocument = document;
            if (this._currentDocument) {
                $(this._currentDocument).on('change', this.documentChangesHandler);
            }
        };
        return WorkingSet;
    })();
    exports.WorkingSet = WorkingSet;
});
