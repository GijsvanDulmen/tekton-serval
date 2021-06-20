const CustomTaskHandler = require('../../lib/customTaskHandler'); // eslint-disable-line no-unused-vars
const PipelineRunHandler = require('../../lib/pipelineRunHandler'); // eslint-disable-line no-unused-vars

const GithubApp = require('./app');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {
    const app = new GithubApp();

    const createDeployment = (params) => {
        const json = {
            ref: params.ref,
            environment: params.environment,
            auto_merge: false,
            description: params.description,
            production_environment: params.production == 'true'
        };

        logger.info("create github deployment for %s in ns %s", params.runName, params.runNamespace);

        return app.postForInstallation(params, "deployments", json, resp => {
            return {
                sha: resp.sha,
                ref: resp.ref,
                id: new String(resp.id),
                environment: resp.environment,
                statuses_url: resp.statuses_url
            };
        });
    }

    const updateDeployment = (params) => {
        const json = {
            description: params.description,
            environment_url: params.environment_url,
            state: params.state
        };

        logger.info("update github deployment %s for %s in ns %s", params.deployment_id, params.runName, params.runNamespace);

        let contentType = undefined;
        if ( params.state == 'in_progress' ) {
            contentType = 'application/vnd.github.flash-preview+json';
        } else if ( params.state == 'inactive' ) {
            contentType = 'application/vnd.github.ant-man-preview+json';
        }

        return app.postForInstallation(params, "deployments/"+params.deployment_id+"/statuses", json, undefined, contentType);
    }

    // create deployment
    const prefix = 'github-deployment';

    // https://docs.github.com/en/rest/reference/repos#create-a-deployment
    handlers.addHandler('GithubCreateDeployment',
        params => createDeployment(params),
        [
            ...app.getAppParams(),
            
            { name: 'ref' },
            { name: 'environment', default: 'production' },
            { name: 'production', default: true },
            { name: 'description', default: 'Serval Deployment' },
        ],
        prefix
    );

    // update deployment status
    // https://docs.github.com/en/rest/reference/repos#create-a-deployment-status
    handlers.addHandler('GithubUpdateDeployment',
        params => updateDeployment(params),
        [
            ...app.getAppParams(),
            
            { name: 'deployment_id' },
            { name: 'description', default: 'Serval Deployment' },
            { name: 'environment_url', default: '' },

            // Can be one of error, failure, inactive, in_progress, queued pending, or success
            { name: 'state' }
        ],
        prefix
    );
};