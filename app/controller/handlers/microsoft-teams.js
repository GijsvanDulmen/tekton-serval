const fetch = require('node-fetch');

const CustomTaskHandler = require('../lib/customTaskHandler'); // eslint-disable-line no-unused-vars
const PipelineRunHandler = require('../lib/pipelineRunHandler'); // eslint-disable-line no-unused-vars

const Bottleneck = require("bottleneck");

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {

    // https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using#rate-limiting-for-connectors
    // set the min time this way to allow for reduced stress on the api
    const limiter = new Bottleneck({
        minTime: 250
    });

    const send = (params, message) => {
        return limiter.schedule(() => {
            logger.info("sending teams message for %s in ns %s", params.runName, params.runNamespace);

            return fetch(params.webhookUrl, {
                method: 'post',
                body:    JSON.stringify({ text: message }),
                headers: { 'Content-Type': 'application/json' },
            })
            .then(() => {}); // no results
        });
    };

    const webHookUrlParam = { name: 'webhookUrl', sources: ['env', 'namespace-secret'] };
    const prefix = 'microsoft-teams';
    
    runHandlers.addStarted(prefix,
        params => send(params, params.runStarted),
        [ webHookUrlParam, { name: 'runStarted', default: 'Pipeline $name Started', replace: true }]
    );

    runHandlers.addCancelled(prefix,
        params => send(params, params.runCancelled),
        [ webHookUrlParam, { name: 'runCancelled', default: 'Pipeline $name Cancelled', replace: true }]
    );

    runHandlers.addSucceeded(prefix,
        params => send(params, params.runSucceeded),
        [ webHookUrlParam, { name: 'runSucceeded', default: 'Pipeline $name Succeeded', replace: true }]
    );
    
    runHandlers.addFailed(prefix,
        params => send(params, params.runFailed),
        [ webHookUrlParam, { name: 'runFailed', default: 'Pipeline $name Failed', replace: true }]
    );

    handlers.addHandler('TeamsNotification',
        params => send(params, params.message),
        [ webHookUrlParam, { name: 'message' }],
        prefix
    );
};