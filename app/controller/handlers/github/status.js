const CustomTaskHandler = require('../../lib/customTaskHandler');
const PipelineRunHandler = require('../../lib/pipelineRunHandler');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger, app) => {
    const updateStatus = (params, state) => {
        let json = {
            state: state,
            context: params.context
        };

        if ( params.url != '' ) { json.target_url = params.url; }
        if ( params.description != '' ) { json.description = params.description; }

        logger.info("setting github status on %s for %s in ns %s", params.commit, params.runName, params.runNamespace);

        return app.postForInstallation(params, "statuses/"+params.commit, json);
    }

    const defaultParams = [
        ...app.getAppParams(),
        
        { name: 'commit' },
        { name: 'url', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], replace: true, default: '' },
        { name: 'description', replace: true, default: '' },
        { name: 'context', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], default: 'serval' },
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