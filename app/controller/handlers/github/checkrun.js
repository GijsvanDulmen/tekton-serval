const CustomTaskHandler = require('../../lib/customTaskHandler');
const PipelineRunHandler = require('../../lib/pipelineRunHandler');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger, app) => {
    const createCheckRun = params => {
        let json = {
            
            name: params.name,
            head_sha: params.commit,

            // Can be one of queued, in_progress, or completed.
            status: params.status,
            started_at: new Date().toISOString(),
            
            // name of the pipelinerun
            external_id: params.runName,
            
            output: {
                title: params.title,
                summary: params.summary,
                text: params.text
            }
        };
        
        if ( params.completed == 'yes' ) {
            // Can be one of action_required, cancelled, failure, neutral, success, skipped, stale, or timed_out.
            json.conclusion = params.conclusion == '' ? 'success' : params.conclusion;
            json.completed_at = new Date().toISOString();
        }

        if ( params.url != '' ) { json.details_url = params.url; }

        logger.info("creating github checkrun on %s for %s in ns %s", params.commit, params.runName, params.runNamespace);

        return app.postForInstallation(params, "check-runs", json, resp => {
            return {
                id: new String(resp.id)
            };
        });
    }

    const defaultParams = [
        { name: 'name' },
        { name: 'status' },

        { name: 'completed', default: '' }, // use yes/no
        { name: 'conclusion', default: '' },

        // output
        { name: 'title' },
        { name: 'summary' },
        { name: 'text', default: '' },

        { name: 'url', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], replace: true, default: '' }
    ];

    const createParams = [
        ...app.getAppParams(),
        ...defaultParams,
        { name: 'commit' },
    ];

    const updateParams = [
        ...app.getAppParams(),
        ...defaultParams,
        { name: 'id' }
    ];

    const prefix = 'github-checkrun';

    handlers.addHandler('GithubCreateCheckRun',
        params => createCheckRun(params),
        [ ...createParams ],
        prefix
    );

    // update checkrun
    const updateCheckRun = params => {
        let json = {
            name: params.name,
            
            // Can be one of queued, in_progress, or completed.
            status: params.status,
            
            output: {
                title: params.title,
                summary: params.summary,
                text: params.text
            }
        };
        
        if ( params.completed == 'yes' ) {
            // Can be one of action_required, cancelled, failure, neutral, success, skipped, stale, or timed_out.
            json.conclusion = params.conclusion == '' ? 'success' : params.conclusion;
            json.completed_at = new Date().toISOString();
        }

        if ( params.url != '' ) { json.details_url = params.url; }

        logger.info("updating github checkrun %s for %s in ns %s", params.id, params.runName, params.runNamespace);

        return app.postForInstallation(params, "check-runs/"+params.id, json, resp => {
            return {
                id: new String(resp.id)
            };
        }, undefined, 'patch');
    }

    handlers.addHandler('GithubUpdateCheckRun',
        params => updateCheckRun(params),
        [ ...updateParams ],
        prefix
    );

    runHandlers.addCheckRun('github-checkrun', (params, newStatus, pipelineTaskName, taskRun) => {
        if ( newStatus == 'unknown' ) {
            return;
        }

        let json = {
            name: pipelineTaskName,
            head_sha: params.commit,

            external_id: params.runName,
            
            output: {
                title: '',
                summary: ''
            }
        };

        if ( newStatus == 'running' ) {
            json.status = 'in_progress'; // complete
            json.started_at = new Date().toISOString();
        } else {
            json.status = 'completed';
            json.completed_at = new Date().toISOString();

            if ( newStatus == 'cancelled' ) {
                json.conclusion = 'cancelled';
            } else if ( newStatus == 'failed' ) {
                json.conclusion = 'failure';
            } else if ( newStatus == 'succeeded' ) {
                json.conclusion = 'success';
            }
        }

        if ( params.url != '' ) { json.details_url = params.url; }

        logger.info("creating github checkrun on %s for %s in ns %s", params.commit, params.runName, params.runNamespace);

        return app.postForInstallation(params, "check-runs", json, resp => {
            return {
                id: new String(resp.id)
            };
        });
    }, [
        ...app.getAppParams(),
        { name: 'commit' },
        { name: 'url', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], replace: true, default: '' }
    ])
};