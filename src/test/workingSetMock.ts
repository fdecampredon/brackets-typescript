import ws = require('../main/workingSet');
import signal = require('../main/utils/signal');

class WorkingSetMock implements ws.IWorkingSet {
    files: string [] = [];
    workingSetChanged = new signal.Signal<ws.ChangeRecord>();
    documentEdited = new signal.Signal<ws.DocumentChangeDescriptor[]>();
    
    dispose(): void {
        this.workingSetChanged.clear();
        this.documentEdited.clear();
    }
    
    addFiles(paths: string[]) {
        this.files = this.files.concat(paths);
        this.workingSetChanged.dispatch({
            kind: ws.WorkingSetChangeKind.ADD,
            paths: paths
        });
    }
    
    
    removeFiles(paths: string[]) {
        this.files = this.files.filter(path => paths.indexOf(path) === -1)
        this.workingSetChanged.dispatch({
            kind: ws.WorkingSetChangeKind.REMOVE,
            paths: paths
        });
    }
}

export = WorkingSetMock;