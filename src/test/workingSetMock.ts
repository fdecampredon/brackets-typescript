import ws = require('../main/workingSet');
import signal = require('../main/utils/signal');

class WorkingSetMock implements ws.IWorkingSet {
    
    workingSetChanged = new signal.Signal<ws.ChangeRecord>();
    documentEdited = new signal.Signal<ws.DocumentChangeDescriptor[]>();
    files: string [] = [];
    dispose(): void { }
}

export = WorkingSetMock;
