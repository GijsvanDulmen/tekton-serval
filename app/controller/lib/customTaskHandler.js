const CustomObject = require('./customObject');

const APIVERSION = "serval.dev/v1";

module.exports = class CustomHandler extends CustomObject {
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

    start() {
        this.watch("/apis/tekton.dev/v1alpha1/runs", (phase, obj) => {
            if ( phase == 'ADDED' ) {
                if ( obj.status && obj.status.completionTime ) {
                    return; // already done
                }

                if ( obj && obj.spec && obj.spec.ref && obj.spec.ref.apiVersion == APIVERSION ) {
                    // console.log(JSON.stringify(obj.metadata.annotations, null, 2));
                    // console.log('-----');

                    if ( this.handlers[obj.spec.ref.kind] ) {
                        let params = {};
                        let prefix = this.handlerPrefix[obj.spec.ref.kind];

                        // check if there are secrets needed
                        this.fetchSecretIfNeeded(this.paramSpecs[obj.spec.ref.kind], obj.metadata.namespace).then(secret => {
                            this.paramSpecs[obj.spec.ref.kind].forEach(paramSpec => {
                                if ( paramSpec.default != undefined ) {
                                    params[paramSpec.name] = paramSpec.default;
                                }

                                if ( paramSpec.sources == undefined ) {
                                    paramSpec.sources = ['pipelinerun', 'taskparam'];
                                }

                                // get from environment
                                params = this.getFromEnvironment(prefix, paramSpec, params);

                                // get from environment
                                params = this.getFromSecret(prefix, paramSpec, params, secret);
                                
                                // check if there is an annotation
                                params = this.getFromAnnotations(prefix, paramSpec, params, obj.metadata);
                                
                                // explicit annotation
                                params = this.getFromTaskSpec(paramSpec, params, obj.spec);
                            });

                            // check if all params are there
                            if ( this.paramSpecs[obj.spec.ref.kind].length != Object.keys(params).length ) {
                                const patch = this.getFailurePatch("Parameters missing, consult documentation");
                                this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                                return;
                            }

                            // add some default params
                            params.runNamespace = obj.metadata.namespace;
                            params.runName = obj.metadata.name;

                            this.handlers[obj.spec.ref.kind](params, this.customObjectsApi).then(results => {
                                let taskResults = [];
                                if ( results != undefined ) {
                                    Object.keys(results).forEach(key => {
                                        taskResults.push({
                                            name: key,
                                            value: results[key]
                                        });
                                    });
                                }
                                
                                const patch = this.getSuccessPatch(taskResults);
                                this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                            }).catch(err => {
                                this.logger.error("error executing %s in %s for %s", obj.spec.ref.kind, obj.metadata.namespace, obj.metadata.name);
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
}