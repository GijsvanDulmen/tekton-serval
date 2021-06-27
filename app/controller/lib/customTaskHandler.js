const CustomObject = require('./customObject');

module.exports = class CustomTaskHandler extends CustomObject {
    constructor(kc, logger) {
        super(kc, logger);
        
        this.handlers = {};
        this.paramSpecs = {};
        this.handlerPrefix = {};
    }

    addHandler(name, handler, params, prefix) {
        this.handlers[name] = handler;
        this.paramSpecs[name] = params;
        this.handlerPrefix[name] = prefix;
    }

    getPatch(isSuccesfull, message, reason, results) {
        const now = new Date().toISOString();
        return [
            {
                "op": "replace",
                "path": "/status",
                "value": {
                    completionTime: now,
                    conditions: [
                        {
                            lastTransitionTime: now,
                            message: message,
                            reason: reason,
                            status: isSuccesfull ? "True" : "False",
                            type: "Succeeded"
                        }
                    ],
                    startTime: now,
                    results: results
                }
            }
        ];
    }

    getSuccessPatch(results) {
        return this.getPatch(true, "Successfull", "Successfull", results);
    }

    getFailurePatch(message) {
        return this.getPatch(false, message, message, []);
    }

    getFromTaskSpec(paramSpec, params, spec) {
        if ( paramSpec.sources.indexOf('taskparam') != -1 ) {
            if ( spec.params ) {
                spec.params.forEach(param => {
                    if ( param.name == paramSpec.name ) {
                        params[param.name] = param.value;
                    }
                });
            }
        }
        return params;
    }

    isServalCustomTask(obj) {
        if ( obj && obj.spec ) {
            if ( obj.spec.ref && this.isServalApiVersion(obj.spec.ref.apiVersion) ) {
                return true;
            } else if ( obj.spec.spec && this.isServalApiVersion(obj.spec.spec.apiVersion) ) {
                return true;
            }
        }
        return false;
    }

    isServalCustomTaskToProcess(obj) {
        if ( obj.status && obj.status.completionTime ) {
            return false; // already done
        }
        return this.isServalCustomTask(obj);
    }

    generifyCustomTask(obj) {
        if ( obj && obj.spec ) {
            let status = {};
            if ( obj.status
                    && obj.status.conditions
                    && obj.status.conditions[0] ) {
                status = obj.status.conditions[0];
            }
            
            if ( obj.spec.ref && this.isServalApiVersion(obj.spec.ref.apiVersion) ) {
                return {
                    kind: obj.spec.ref.kind,
                    status: status,
                    run: obj.metadata.labels["tekton.dev/pipelineRun"],
                    params: obj.spec.params == undefined ? [] : obj.spec.params
                };
            } else if ( obj.spec.spec && this.isServalApiVersion(obj.spec.spec.apiVersion) ) {
                const params = this.keyValueToNameValue(obj.spec.spec.spec);
                params.forEach(param => {
                    if ( typeof param.value != 'string' ) {
                        throw new Error("param " + param.name + " should be a string");
                    }
                });

                return {
                    kind: obj.spec.spec.kind,
                    status: status,
                    run: obj.metadata.labels["tekton.dev/pipelineRun"],
                    params: params
                };
            }
        }
        return {};   
    }

    formatMissingTaskMessage(runKind, params) {
        let missing = [];
        this.paramSpecs[runKind].forEach(paramSpec => {
            if ( params[paramSpec.name] == undefined ) {
                missing.push(paramSpec.name);
            }
        });

        return "Parameters [" + missing.join(', ') + "] missing, consult documentation";
    }

    start() {
        this.watch("/apis/tekton.dev/v1alpha1/runs", (phase, obj) => {            
            if ( phase == 'ADDED' ) {
                if ( this.isServalCustomTaskToProcess(obj) ) {
                    // console.log(JSON.stringify(obj, null, 2));
                    // console.log('-----');

                    try {
                        let run = this.generifyCustomTask(obj);
                        if ( this.handlers[run.kind] ) {

                            let prefix = this.handlerPrefix[run.kind];
                            this.getParameters(run.kind, prefix, run, obj, params => {
                                this.handlers[run.kind](params, this.customObjectsApi).then(results => {
                                    if ( results == false ) {
                                        this.logger.info("not updating results for " + run.kind);
                                        return;
                                    }
    
                                    let taskResults = this.keyValueToNameValue(results);
                                    
                                    const patch = this.getSuccessPatch(taskResults);
                                    this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                                }).catch(err => {
                                    this.logger.error("error executing %s in %s for %s", run.kind, obj.metadata.namespace, obj.metadata.name);
                                    this.logger.error(err);
                                    this.updateCustomTaskWithErrorMessageWithObj(obj, typeof err == 'string' ? err : "Failed");
                                })
                            }).catch(err => {
                                this.updateCustomTaskWithErrorMessageWithObj(obj, err.message);
                            })
                        } else {
                            this.updateCustomTaskWithErrorMessageWithObj(obj, "Unknown handler specified");
                        }
                    } catch(err) {
                        this.updateCustomTaskWithErrorMessageWithObj(obj, err.message);
                    }
                }
            }
        });
    }

    updateCustomTaskWithErrorMessageWithObj(obj, message) {
        this.updateCustomTaskWithErrorMessage(obj.metadata.namespace, obj.metadata.name, message);
    }

    updateCustomTaskWithErrorMessage(namespace, name, message) {
        const patch = this.getFailurePatch(message);
        this.patchCustomTaskResource(namespace, name, patch);
    }

    getParameters(handlerName, prefix, run, obj, callback) {
        return this.fetchSecretIfNeeded(this.paramSpecs[handlerName], obj.metadata.namespace).then(secret => {
            let params = {};
            
            this.paramSpecs[handlerName].forEach(paramSpec => {
                if ( paramSpec.sources == undefined ) {
                    paramSpec.sources = ['pipelinerun', 'taskparam'];
                }
            
                params = this.getParamFetcher().getParam(prefix, paramSpec, params, secret, obj.metadata, obj.spec);
                
                // explicit task params
                params = this.getFromTaskSpec(paramSpec, params, run);

                if ( params[paramSpec.name] != undefined && paramSpec.replace ) {
                    params[paramSpec.name] = this.replaceCommonVars(obj, params[paramSpec.name]);
                }
            });

            // check if all params are there
            if ( this.paramSpecs[handlerName].length != Object.keys(params).length ) {
                throw new Error(this.formatMissingTaskMessage(handlerName, params));
            }

            // add some default params
            params.runNamespace = obj.metadata.namespace;
            params.runName = obj.metadata.name;

            callback(params);
        });
    }
}