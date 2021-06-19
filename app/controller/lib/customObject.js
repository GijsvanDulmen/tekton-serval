const k8s = require('@kubernetes/client-node');

module.exports = class CustomObject {
    constructor(kc) {
        this.watcher = new k8s.Watch(kc);
        this.customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
        this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
    }

    watch(resource, handler) {
        this.watcher.watch(resource, {}, (phase, obj) => handler(phase, obj)).catch(err => {
            console.log(err);
        });
    }

    patchCustomTaskResource(ns, name, patch) {
        const options = { "headers": { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH}};
        
        this.customObjectsApi.patchNamespacedCustomObjectStatus('tekton.dev', 'v1alpha1', ns, 'runs', name, patch, undefined, undefined, undefined, options).catch(err => {
            console.log("error!")
            console.log(err);
        });
    }

    /**
     * 
     * @param {string} name 
     * @param {object} paramSpec 
     * @param {object} params 
     * @returns {object}
     */
     getFromEnvironment(name, paramSpec, params) {
        if ( paramSpec.sources.indexOf('env') != -1 ) {
            const envName = name.toUpperCase()+"_"+paramSpec.name.toUpperCase();
            if ( process.env[envName] != undefined ) {
                params[paramSpec.name] = process.env[envName];
            }
        }
        return params;
    }

    getFromAnnotations(prefix, paramSpec, params, metadata) {
        if ( paramSpec.sources.indexOf('pipelinerun') != -1 ) {
            if ( metadata.annotations ) {
                Object.keys(metadata.annotations).forEach(key => {
                    if ( key == 'serval.dev/'+prefix+"-"+paramSpec.name ) {
                        params[paramSpec.name] = metadata.annotations[key];
                    }
                });
            }
        }
        return params;
    }

    getFromSecret(prefix, paramSpec, params, secret) {
        if ( paramSpec.sources.indexOf('namespace-secret') != -1 ) {
            Object.keys(secret).forEach(key => {
                if ( key == prefix+"-"+paramSpec.name ) {
                    params[paramSpec.name] = secret[key];
                }
            });
        }
        return params;
    }

    fetchSecretIfNeeded(paramSpecs, namespace) {
        return new Promise((res, rej) => { 
            let needSecretCheck = false;
            paramSpecs.forEach(paramSpec => {
                if ( paramSpec.sources && paramSpec.sources.indexOf('namespace-secret') ) {
                    needSecretCheck = true;
                }
            });

            if ( needSecretCheck ) {
                this.coreApi.readNamespacedSecret("serval", namespace).then(resp => {
                    let results = {};
                    if ( resp.body && resp.body.data ) {
                        Object.keys(resp.body.data).forEach(key => {
                            results[key] = Buffer.from(resp.body.data[key], 'base64').toString('ascii');
                        });
                    }
                    res(results);
                }).catch(err => {
                    console.log(err);
                    // nothing available
                    res({});
                })
            } else {
                res({}); // no secret available
            }
        });
    }
}