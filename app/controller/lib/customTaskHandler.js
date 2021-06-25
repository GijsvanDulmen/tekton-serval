const CustomObject = require('./customObject');

const APIVERSION = "serval.dev/v1";

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

    isServalCustomTaskToProcess(obj) {
        if ( obj.status && obj.status.completionTime ) {
            return false; // already done
        }
        if ( obj && obj.spec ) {
            if ( obj.spec.ref && obj.spec.ref.apiVersion == APIVERSION ) {
                return true;
            } else if ( obj.spec.spec && obj.spec.spec.apiVersion == APIVERSION ) {
                return true;
            }
        }
        return false;
    }

    generifyCustomTask(obj) {
        if ( obj && obj.spec ) {
            if ( obj.spec.ref && obj.spec.ref.apiVersion == APIVERSION ) {
                return {
                    kind: obj.spec.ref.kind,
                    params: obj.spec.params == undefined ? [] : obj.spec.params
                };
            } else if ( obj.spec.spec && obj.spec.spec.apiVersion == APIVERSION ) {
                const params = this.keyValueToNameValue(obj.spec.spec.spec);
                params.forEach(param => {
                    if ( typeof param.value != 'string' ) {
                        throw new Error("param " + param.name + " should be a string");
                    }
                });

                return {
                    kind: obj.spec.spec.kind,
                    params: params
                };
            }
        }
        return {};   
    }

    start() {
        this.watch("/apis/tekton.dev/v1alpha1/runs", (phase, obj) => {            
            if ( phase == 'ADDED' ) {
                if ( this.isServalCustomTaskToProcess(obj) ) {
                    // console.log(JSON.stringify(obj, null, 2));
                    // console.log('-----');

                    let run;
                    try {
                        run = this.generifyCustomTask(obj);
                    } catch(err) {
                        const patch = this.getFailurePatch(err.message);
                        this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                        return;
                    }
                    
                    if ( this.handlers[run.kind] ) {
                        let params = {};
                        let prefix = this.handlerPrefix[run.kind];

                        // check if there are secrets needed
                        this.fetchSecretIfNeeded(this.paramSpecs[run.kind], obj.metadata.namespace).then(secret => {
                            this.paramSpecs[run.kind].forEach(paramSpec => {
                                if ( paramSpec.sources == undefined ) {
                                    paramSpec.sources = ['pipelinerun', 'taskparam'];
                                }
                            
                                params = this.getParamFetcher().getParam(prefix, paramSpec, params, secret, obj.metadata, obj.spec);
                                
                                // explicit task params
                                params = this.getFromTaskSpec(paramSpec, params, run);

                                if ( params[paramSpec.name] != undefined && paramSpec.replace ) {
                                    params[paramSpec.name] = params[paramSpec.name].replace("$name", obj.metadata.labels["tekton.dev/pipelineRun"]);
                                }
                            });

                            // check if all params are there
                            if ( this.paramSpecs[run.kind].length != Object.keys(params).length ) {
                                let missing = [];
                                this.paramSpecs[run.kind].forEach(paramSpec => {
                                    if ( params[paramSpec.name] == undefined ) {
                                        missing.push(paramSpec.name);
                                    }
                                });

                                const patch = this.getFailurePatch("Parameters " + missing.join(',') + " missing, consult documentation");
                                this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                                return;
                            }

                            // add some default params
                            params.runNamespace = obj.metadata.namespace;
                            params.runName = obj.metadata.name;

                            this.handlers[run.kind](params, this.customObjectsApi).then(results => {
                                let taskResults = this.keyValueToNameValue(results);
                                
                                const patch = this.getSuccessPatch(taskResults);
                                this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                            }).catch(err => {
                                this.logger.error("error executing %s in %s for %s", run.kind, obj.metadata.namespace, obj.metadata.name);
                                this.logger.error(err);
                                const patch = typeof err == 'string' ? this.getFailurePatch(err) : this.getFailurePatch("Failed");
                                this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                            })
                        });
                    } else {
                        const patch = this.getFailurePatch("Unknown handler specified");
                        this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                    }
                }
            }
        });
    }

    keyValueToNameValue(results) {
        let taskResults = [];
        if ( results != undefined ) {
            Object.keys(results).forEach(key => {
                taskResults.push({
                    name: key,
                    value: results[key]
                });
            });
        }
        return taskResults;
    }
}