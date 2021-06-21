const k8s = require('@kubernetes/client-node');

const SLACK = 'slack.channel.authorization';
const GITHUB = 'github.installation.authorization';

module.exports = class AuthorizationWatcher {
    /**
     * 
     * @param {k8s.KubeConfig} kc 
     */
    constructor(kc, logger) {
        this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
        this.logger = logger;
        this.config = {};

        this.configMapName = 'serval-authorization';
        this.namespace = 'serval';
    }

    hasSlackChannelAuthorization(namespace, channel) {
        if ( this.config[SLACK] != undefined ) {
            if ( this.config[SLACK][namespace] == undefined ) {
                return false;
            }
            return this.config[SLACK][namespace].indexOf(channel) != -1;
        }
        return true;
    }

    hasGithubInstallationAuthorization(namespace, installationId) {
        if ( this.config[GITHUB] != undefined ) {
            if ( this.config[GITHUB][namespace] == undefined ) {
                return false;
            }
            return this.config[GITHUB][namespace].indexOf(installationId) != -1;
        }
        return true;
    }

    start() {
        this.coreApi.readNamespacedConfigMap(this.configMapName, this.namespace).then(res => {
            if ( res.body && res.body.data && res.body.data.config ) {
                try {
                    const config = JSON.parse(res.body.data.config);
                    this.config = config;
                } catch(err) {
                    this.logger.error("could not read %s configmap in %s", this.configMapName, this.namespace);
                    this.logger.error(err);
                    process.exit(1); // kill just in case
                }
            } else {
                this.logger.info("no authorization configmap - allowing all!")
            }
        }).catch(err => {
            if ( err.statusCode == 404 ) {
                this.logger.info("no authorization configmap - allowing all!")
            } else {
                this.logger.error(err);
                process.exit(1); // kill just in case
            }
        })
    }
};