const k8s = require('@kubernetes/client-node');

module.exports = class PipelineRunHandler {
    constructor(kc) {
        this.watcher = new k8s.Watch(kc);
        this.customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);

        this.events = {
            started: [],
            succeeded: [],
            failed: [],
            cancelled: []
        }
    }

    addStarted(on, handler) {
        this.events.started.push({ on: on, handler: handler });
    }

    addSucceeded(on, handler) {
        this.events.succeeded.push({ on: on, handler: handler });
    }

    addFailed(on, handler) {
        this.events.failed.push({ on: on, handler: handler });
    }

    addCancelled(on, handler) {
        this.events.cancelled.push({ on: on, handler: handler });
    }

    start() {
        this.watcher.watch("/apis/tekton.dev/v1alpha1/pipelineruns", {}, (phase, obj) => {
            if ( phase == 'ADDED' ) {
                return;
            }

            console.log(obj.metadata.annotations);

            let monitorRun = [];
            Object.keys(obj.metadata.annotations).forEach(key => {
                if ( key == 'serval.dev/monitor-run' ) {
                    monitorRun = obj.metadata.annotations[key].split(",");
                }
            });

            if ( monitorRun.length == 0 ) {
                return;
            }

            console.log(monitorRun);
            
            if ( obj.status && obj.status.conditions ) {
                obj.status.conditions.forEach(condition => {
                    if ( condition.type != 'Succeeded' ) {
                        return;
                    }

                    let processEvent = false;
                    if ( condition.status == 'Unknown' && condition.reason == 'Running' ) {
                        processEvent = 'started';
                    } else if ( condition.status == 'True' && condition.reason == 'Succeeded' ) {
                        processEvent = 'succeeded';
                    } else if ( condition.status == 'True' && condition.reason == 'Completed' ) {
                        processEvent = 'succeeded';
                    } else if ( condition.status == 'False' ) {
                        if ( condition.reason == 'PipelineRunCancelled' ) {
                            processEvent = 'cancelled';
                        } else if ( condition.reason == 'PipelineRunTimeout' ) {
                            processEvent = 'failed';
                        } else if ( condition.reason == 'Failed' ) {
                            processEvent = 'failed';
                        } else {
                            processEvent = 'failed';
                        }
                    }

                    console.log(processEvent);

                    if ( processEvent != false ) {
                        this.events[processEvent].forEach(handler => {
                            if ( monitorRun.indexOf(handler.on) != -1 ) {
                                handler.handler(obj);
                            }
                        });
                    }
                });
            }
        });
    }
}