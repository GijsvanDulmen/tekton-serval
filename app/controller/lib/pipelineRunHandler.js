const CustomObject = require('./customObject');

module.exports = class PipelineRunHandler extends CustomObject {
    constructor(kc, logger) {
        super(kc, logger);
        
        this.events = {
            started: [],
            succeeded: [],
            failed: [],
            cancelled: []
        };
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

    start() {
        this.watch("/apis/tekton.dev/v1alpha1/pipelineruns", (phase, obj) => {
            if ( phase == 'ADDED' ) {
                return;
            }

            let monitorRun = [];
            Object.keys(obj.metadata.annotations).forEach(key => {
                if ( key == 'serval.dev/monitor-run' ) {
                    monitorRun = obj.metadata.annotations[key].split(",");
                }
            });

            if ( monitorRun.length == 0 ) {
                return;
            }
           
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

                    if ( processEvent != false ) {
                        this.events[processEvent].forEach(handler => {
                            if ( monitorRun.indexOf(handler.on) != -1 ) {
                                this.processHandler(handler, obj);
                            }
                        });
                    }
                });
            }
        });
    }

    processHandler(handler, obj) {
        let params = {};
        
        // check if there are secrets needed
        this.fetchSecretIfNeeded(handler.params, obj.metadata.namespace).then(secret => {
            handler.params.forEach(paramSpec => {
                if ( paramSpec.default != undefined ) {
                    params[paramSpec.name] = paramSpec.default;
                }

                if ( paramSpec.sources == undefined ) {
                    paramSpec.sources = ['pipelinerun'];
                }

                // get from environment
                params = this.getFromEnvironment(handler.on, paramSpec, params);

                // get from environment
                params = this.getFromSecret(handler.on, paramSpec, params, secret);
                
                // check if there is an annotation
                params = this.getFromAnnotations(handler.on, paramSpec, params, obj.metadata);

                if ( params[paramSpec.name] != undefined && paramSpec.replace ) {
                    params[paramSpec.name] = params[paramSpec.name].replace("$name", obj.metadata.name);
                }
            });

            // check if all params are there
            if ( handler.params.length == Object.keys(params).length ) {
                handler.handler(params);
            } else {
                this.logger.error("params missing for run in %s name %s for %s", obj.metadata.namespace, obj.metadata.name, handler.on);
            }
        });
    }
}