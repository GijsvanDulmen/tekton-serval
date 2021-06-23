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
    }

    /**
     * @returns ParamFetcher
     */
    getParamFetcher() {
        return this.paramFetcher;
    }

    patchCustomTaskResource(ns, name, patch) {
        const options = { "headers": { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH}};
        
        this.customObjectsApi.patchNamespacedCustomObjectStatus('tekton.dev', 'v1alpha1', ns, 'runs', name, patch, undefined, undefined, undefined, options).catch(err => {
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
}