const CustomObject = require('./customObject');
const TaskRunMonitor = require('./taskRunMonitor');
const k8s = require('@kubernetes/client-node');
module.exports = class PipelineRunHandler extends CustomObject {
    constructor(kc, logger) {
        super(kc, logger);
        
        this.events = {
            started: [],
            succeeded: [],
            failed: [],
            cancelled: [],
            checkrun: []
        };

        this.taskRunMonitor = new TaskRunMonitor();
    }

    addStarted(on, handler, params) {
        this.events.started.push({ on: on, handler: handler, params: params });
    }

    addSucceeded(on, handler, params) {
        this.events.succeeded.push({ on: on, handler: handler, params: params });
    }

    addFailed(on, handler, params) {
        this.events.failed.push({ on: on, handler: handler, params: params });
    }

    addCancelled(on, handler, params) {
        this.events.cancelled.push({ on: on, handler: handler, params: params });
    }

    addCheckRun(on, handler, params) {
        this.events.checkrun.push({ on: on, handler: handler, params: params });
    }

    start() {
        this.taskRunMonitor.on('updated', (taskRunKey, newStatus, taskRun, obj) => {
            try {
                const checkRunTasks = this.getCheckRunTasks(obj);
                const checkRuns = this.getCheckRun(obj);

                if ( checkRunTasks.indexOf(taskRun.pipelineTaskName) != -1 ) {
                    this.events.checkrun.forEach(handler => {
                        if ( checkRuns.indexOf(handler.on) != -1 ) {
                            this.processHandler(handler, obj, newStatus, taskRun.pipelineTaskName, taskRun);
                        }
                    });
                }
            } catch(err) {
                this.logger.error("got error");
                this.logger.error(err);
            }            
        });

        this.watch("/apis/tekton.dev/v1beta1/pipelineruns", (phase, obj) => {
            if ( phase == 'ADDED' ) {
                return;
            }

            this.taskRunMonitor.processPipelineRun(obj);

            this.processForEachEvent(obj, (handler, obj) => {
                this.processHandler(handler, obj);
            });
        });
    }

    processForEachEvent(obj, callback) {
        let monitorRun = this.getMonitors(obj);
        if ( monitorRun.length == 0 ) {
            return;
        }
        
        if ( obj.status && obj.status.conditions ) {
            obj.status.conditions.forEach(condition => {
                if ( condition.type != 'Succeeded' ) {
                    return;
                }

                let processEvent = this.getEventFromCondition(condition);
                if ( processEvent != false ) {
                    this.events[processEvent].forEach(handler => {
                        if ( monitorRun.indexOf(handler.on) != -1 ) {
                            callback(handler, obj);
                        }
                    });
                }
            });
        }
    }

    getMonitors(obj) {
        return this.getAnnotationSplitted(obj, 'serval.dev/monitor-run');
    }

    getCheckRun(obj) {

        return this.getAnnotationSplitted(obj, 'serval.dev/check-run');
    }

    getCheckRunTasks(obj) {
        return this.getAnnotationSplitted(obj, 'serval.dev/check-run-tasks');
    }

    getAnnotationSplitted(obj, annotation) {
        let splitted = [];
        if ( obj.metadata && obj.metadata.annotations ) {
            Object.keys(obj.metadata.annotations).forEach(key => {
                if ( key == annotation ) {
                    splitted = obj.metadata.annotations[key].split(",").filter(v => v != '');
                }
            });
        }
        return splitted;
    }

    getEventFromCondition(condition) {
        if ( condition.status == undefined || condition.reason == undefined ) {
            return false; // safety guard
        } else if ( condition.status == 'Unknown' && condition.reason == 'Running' ) {
            return 'started';
        } else if ( condition.status == 'True' && condition.reason == 'Succeeded' ) {
            return 'succeeded';
        } else if ( condition.status == 'True' && condition.reason == 'Completed' ) {
            return 'succeeded';
        } else if ( condition.status == 'False' ) {
            if ( condition.reason == 'PipelineRunCancelled' ) {
                return 'cancelled';
            } else if ( condition.reason == 'PipelineRunTimeout' ) {
                return 'failed';
            } else if ( condition.reason == 'Failed' ) {
                return 'failed';
            } else {
                return 'failed';
            }
        }
        return false;
    }

    processHandler(handler, obj, ...otherParams) {
        let params = {};
        
        // check if there are secrets needed
        this.fetchSecretIfNeeded(handler.params, obj.metadata.namespace).then(secret => {
            handler.params.forEach(paramSpec => {
                if ( paramSpec.sources == undefined ) {
                    paramSpec.sources = ['pipelinerun'];
                }

                params = this.getParamFetcher().getParam(handler.on, paramSpec, params, secret, obj.metadata, obj.spec);

                if ( params[paramSpec.name] != undefined && paramSpec.replace ) {
                    params[paramSpec.name] = this.replaceCommonVars(obj, params[paramSpec.name]);
                }
            });

            // check if all params are there
            if ( handler.params.length == Object.keys(params).length ) {
                // add some default params
                params.runNamespace = obj.metadata.namespace;
                params.runName = obj.metadata.name;

                handler.handler(params, ...otherParams);
            } else {
                this.logger.error("params missing for run in %s name %s for %s", obj.metadata.namespace, obj.metadata.name, handler.on);
            }
        });
    }

    updateRunStatus(namespace, name, newStatus) {
        const patch = [
            {
                op: "replace",
                path: "/spec/status",
                value: newStatus
            }
        ];
        return this.getCustomObjectApi().patchNamespacedCustomObject('tekton.dev', 'v1beta1', namespace, 'pipelineruns', name, patch, undefined, undefined, undefined, this.getPatchHeaders())
    }

    getRunsForNamespace(namespace, callback) {
        this.getCustomObjectApi().listNamespacedCustomObject("tekton.dev", "v1beta1", namespace, "pipelineruns").then(pipelineRuns => {
            if ( pipelineRuns.body && pipelineRuns.body.items ) {
                pipelineRuns.body.items.forEach(item => callback(item));
            }
        });
    }

    /**
     * @param {function} callback 
     */
     getRunsPerNamespace(callback, filter) {
        this.getCoreApi().listNamespace().then(resp => {
            if ( resp.body && resp.body.items ) {
                resp.body.items.forEach(item => {
                    this.getCustomObjectApi().listNamespacedCustomObject("tekton.dev", "v1beta1", item.metadata.name, "pipelineruns").then(pipelineRuns => {
                        if ( pipelineRuns.body && pipelineRuns.body.items ) {
                            let servalTasks = [].concat(...pipelineRuns.body.items.map(pipelineRun => this.convertPipelineRunToTasks(pipelineRun)));
                            if ( filter != undefined ) {
                                servalTasks = servalTasks.filter(t => filter.indexOf(t.kind) != -1);
                            }
                            callback(servalTasks, item.metadata.name);
                        }
                    }).catch(err => {
                        console.log(err);
                    })
                })
            }
        });
    }

    convertPipelineRunToTasks(obj) {
        let servalTasks = [];

        let runStatus;
        if ( obj.status && obj.status.conditions ) {
            runStatus = this.getEventFromCondition(obj.status.conditions[0]);
        } else {
            runStatus = 'unknown';
        }

        const addStatus = (task, name) => {
            Object.keys(obj.status.runs).forEach(id => {
                if ( obj.status.runs[id].pipelineTaskName == name ) {
                    task.id = id;
                    task.status = {};
                    if ( obj.status.runs[id].status
                            && obj.status.runs[id].status.conditions 
                            && obj.status.runs[id].status.conditions[0] ) {
                        task.status = obj.status.runs[id].status.conditions[0];
                    }
                }
            });
            return task;
        };

        if ( obj.status.pipelineSpec && obj.status.pipelineSpec.tasks ) {
            obj.status.pipelineSpec.tasks.forEach(task => {
                let generifiedTask = {
                    run: obj.metadata.name,
                    runStatus: runStatus,
                    runStart: new Date(obj.status.startTime).getTime()
                }
                if ( task.taskRef != undefined ) {
                    if ( this.isServalApiVersion(task.taskRef.apiVersion) ) {
                        generifiedTask.kind = task.taskRef.kind;
                        generifiedTask.params = this.keyValueToNameValue(task.params)
                        servalTasks.push(addStatus(generifiedTask, task.name));
                    }
                } else if ( task.taskSpec != undefined ) {
                    if ( this.isServalApiVersion(task.taskSpec.apiVersion) ) {
                        generifiedTask.kind = task.taskSpec.kind;
                        generifiedTask.params = task.taskSpec.spec;
                        servalTasks.push(addStatus(generifiedTask, task.name));
                    }
                }
            });
        }
        return servalTasks;
    }
}