const k8s = require('@kubernetes/client-node');
const ParamFetcher = require('./paramFetcher');

module.exports = class CustomObject {
    constructor(kc, logger) {
        this.watcher = new k8s.Watch(kc);
        this.customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
        this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
        this.logger = logger;
        this.paramFetcher = new ParamFetcher();
    }

    getPatchHeaders() {
        return { "headers": { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH}};
    }

    watch(resource, handler) {
        const start = () => {
            this.logger.info("starting watch for %s", resource);
            this.watcher.watch(resource, {}, (phase, obj) => handler(phase, obj)).catch(err => {
                this.logger.error("error watching for %s", resource);
                this.logger.error(err);
                
                this.logger.info("restarting watch for %s in 5s", resource);
                setTimeout(() => start(), 5000);
            });
        };
        start();
    }

    replaceCommonVars(obj, string) {
        string = string.replace('$namespace', obj.metadata.namespace);
        if ( obj.kind == 'PipelineRun' ) {
            string = string.replace('$name', obj.metadata.name);
        } else if ( obj.kind == 'Run' ) {
            string = string.replace('$name', obj.metadata.labels["tekton.dev/pipelineRun"]);
            string = string.replace('$pipeline', obj.metadata.labels["tekton.dev/pipeline"]);
            string = string.replace('$task', obj.metadata.labels["tekton.dev/pipelineTask"]);
        }
        return string;
    }

    isServalApiVersion(version) {
        return version == "serval.dev/v1";
    }

    patchFieldInConfigmap(name, namespace, field, value) {
        const patch = [
            {
                op: "replace",
                path: "/data/"+field,
                value: value
            }
        ];
        return this.getCoreApi().patchNamespacedConfigMap(name, namespace, patch, undefined, undefined, undefined, undefined, this.getPatchHeaders());
    }

    getFieldFromConfigmap(name, namespace, field) {
        return new Promise((res, rej) => {
            this.getCoreApi().readNamespacedConfigMap(name, namespace).then(resp => {
                if ( resp.body && resp.body.data && resp.body.data[field] ) {
                    res(resp.body.data[field]);
                } else {
                    rej('no such field');
                }
            })
        });
    }

    /**
     * @returns {k8s.CoreV1Api}
     */
    getCoreApi() {
        return this.coreApi;
    }

    /**
     * @returns {k8s.CustomObjectsApi}
     */
    getCustomObjectApi() {
        return this.customObjectsApi;
    }

    /**
     * @returns ParamFetcher
     */
    getParamFetcher() {
        return this.paramFetcher;
    }

    patchCustomTaskResource(ns, name, patch) {
        this.customObjectsApi.patchNamespacedCustomObjectStatus('tekton.dev', 'v1alpha1', ns, 'runs', name, patch, undefined, undefined, undefined, this.getPatchHeaders()).catch(err => {
            this.logger.error("error patching run in %s on %s", ns, name);
            this.logger.error(err);
        });
    }

    fetchSecretIfNeeded(paramSpecs, namespace) {
        return new Promise(res => { 
            let needSecretCheck = false;
            paramSpecs.forEach(paramSpec => {
                if ( paramSpec.sources && paramSpec.sources.indexOf('namespace-secret') != -1 ) {
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
                    this.logger.error("error reading serval secret in %s", namespace);
                    this.logger.error(err);
                    res({}); // nothing available
                })
            } else {
                res({}); // no secret available
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