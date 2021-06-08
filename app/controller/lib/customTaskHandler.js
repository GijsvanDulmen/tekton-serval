const k8s = require('@kubernetes/client-node');

const APIVERSION = "serval.dev/v1";

module.exports = class CustomHandler {
    constructor(kc) {
        this.watcher = new k8s.Watch(kc);
        this.customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
        this.handlers = {};
        this.paramSpecs = {};
        this.handlerPrefix = {};
    }

    addHandler(name, handler, params, prefix) {
        this.handlers[name] = handler;
        this.paramSpecs[name] = params;
        this.handlerPrefix[name] = prefix;
    }

    getPatch(isSuccesfull, message, reason) {
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
                    startTime: now
                }
            }
        ];
    }

    getSuccessPatch() {
        return this.getPatch(true, "Successfull", "Successfull");
    }

    getFailurePatch(message) {
        return this.getPatch(false, message, message);
    }

    start() {
        this.watcher.watch("/apis/tekton.dev/v1alpha1/runs", {}, (phase, obj) => {
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

                        this.paramSpecs[obj.spec.ref.kind].forEach(paramSpec => {
                            if ( paramSpec.default != undefined ) {
                                params[paramSpec.name] = paramSpec.default;
                            }

                            // check if there is an annotation
                            Object.keys(obj.metadata.annotations).forEach(key => {
                                if ( key == 'serval.dev/'+prefix+"-"+paramSpec.name ) {
                                    params[paramSpec.name] = obj.metadata.annotations[key];
                                }
                            });

                            // explicit annotation
                            obj.spec.params.forEach(param => {
                                if ( param.name == paramSpec.name ) {
                                    params[param.name] = param.value;
                                }
                            });
                        });

                        // check if all params are there
                        if ( this.paramSpecs[obj.spec.ref.kind].length != Object.keys(params).length ) {
                            const patch = this.getFailurePatch("Parameters missing, consult documentation");
                            this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                            return;
                        }

                        this.handlers[obj.spec.ref.kind](params, this.customObjectsApi).then(() => {
                            const patch = this.getSuccessPatch();
                            this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                        }).catch(err => {
                            const patch = typeof err == 'string' ? this.getFailurePatch(err) : this.getFailurePatch("Failed");
                            this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                        })
                    } else {
                        const patch = this.getFailurePatch("Unknown handler specified");
                        this.patchCustomTaskResource(obj.metadata.namespace, obj.metadata.name, patch);
                    }
                }
            }
        });
    }

    patchCustomTaskResource(ns, name, patch) {
        const options = { "headers": { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH}};
        
        this.customObjectsApi.patchNamespacedCustomObjectStatus('tekton.dev', 'v1alpha1', ns, 'runs', name, patch, undefined, undefined, undefined, options).catch(err => {
            console.log("error!")
            console.log(err);
        });
    }
}