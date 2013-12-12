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
        function WorkingSet(documentManager) {
            var _this = this;
            this.documentManager = documentManager;
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
            * map file to document for event handling
            */
            this.filesMap = new collections.StringMap();
            //-------------------------------
            //  Events Handler
            //-------------------------------
            /**
            * handle 'workingSetAdd' event
            */
            this.workingSetAddHandler = function (event, file) {
                _this.addDocument(file.fullPath);
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
                    _this.addDocument(file.fullPath);
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
                _this.removeDocument(file.fullPath);
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
                    _this.removeDocument(file.fullPath);
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
                    changesDescriptor.push({
                        path: document.file.fullPath,
                        from: change.from,
                        to: change.to,
                        text: change.text && change.text.join('\n'),
                        removed: change.removed ? change.removed.join("\n") : ""
                    });
                    change = change.next;
                }
                if (changesDescriptor.length > 0) {
                    _this.documentEdited.dispatch(changesDescriptor);
                }
            };
            $(documentManager).on('workingSetAdd', this.workingSetAddHandler);
            $(documentManager).on('workingSetAddList', this.workingSetAddListHandler);
            $(documentManager).on('workingSetRemove', this.workingSetRemoveHandler);
            $(documentManager).on('workingSetRemoveList', this.workingSetRemoveListHandler);
            this.setFiles(documentManager.getWorkingSet().map(function (file) {
                return file.fullPath;
            }));
        }
        Object.defineProperty(WorkingSet.prototype, "files", {
            //-------------------------------
            //  IWorkingSet implementations
            //-------------------------------
            /**
            * @see IWorkingSet#files
            */
            get: function () {
                return this.filesMap.keys;
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
            this.setFiles(null);
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
                return _this.removeDocument(path);
            });
            if (files) {
                files.forEach(function (path) {
                    return _this.addDocument(path);
                });
            }
        };

        /**
        * add a document to the working set, and add event listener on the 'change' of this workingset
        * @param path
        */
        WorkingSet.prototype.addDocument = function (path) {
            var _this = this;
            this.documentManager.getDocumentForPath(path).then(function (document) {
                if (!document) {
                    throw new Error('??? should not happen');
                }
                if (_this.filesMap.has(path)) {
                    //should not happen but just in case ...
                    _this.removeDocument(path);
                }
                _this.filesMap.set(document.file.fullPath, document);
                $(document).on('change', _this.documentChangesHandler);
            }, function (err) {
                throw new Error(err);
            });
        };

        /**
        * remove a document from working set, and add event listener on the 'change' of this workingset
        * @param path
        */
        WorkingSet.prototype.removeDocument = function (path) {
            var document = this.filesMap.get(path);
            if (!document) {
                return;
            }
            $(document).off('change', this.documentChangesHandler);
            this.filesMap.delete(path);
        };
        return WorkingSet;
    })();
    exports.WorkingSet = WorkingSet;
});
