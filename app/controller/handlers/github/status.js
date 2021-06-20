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

    const updateStatus = (params, state) => {
        const json = {
            state: state,
            target_url: params.url,
            description: params.description,
            context: params.context
        };

        logger.info("setting github status on %s for %s in ns %s", params.commit, params.runName, params.runNamespace);

        return app.postForInstallation(params, "statuses/"+params.commit, json);
    }

    const defaultParams = [
        ...app.getAppParams(),
        
        { name: 'commit' },
        { name: 'url', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], replace: true },
        { name: 'description', replace: true, default: "Run $name" },
        { name: 'context', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], default: 'cicd/serval' },
    ];

    const prefix = 'github-status';

    runHandlers.addStarted(prefix,
        params => updateStatus(params, 'pending'),
        defaultParams
    );

    runHandlers.addCancelled(prefix,
        params => updateStatus(params, 'failure'),
        defaultParams
    );

    runHandlers.addSucceeded(prefix,
        params => updateStatus(params, 'success'),
        defaultParams
    );
    
    runHandlers.addFailed(prefix,
        params => updateStatus(params, 'failure'),
        defaultParams
    );

    handlers.addHandler('GithubStatus',
        params => updateStatus(params, params.status),
        [ ...defaultParams, { name: 'status' }],
        prefix
    );
};