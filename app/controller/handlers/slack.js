const { IncomingWebhook } = require('@slack/webhook');

const CustomTaskHandler = require('../lib/customTaskHandler')
const PipelineRunHandler = require('../lib/pipelineRunHandler')

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers) => {

    const send = (params, message) => {
        const webhook = new IncomingWebhook(params.webhookUrl);
        return webhook.send({
            text: message,
            username: params.username,
            icon_emoji: params.icon,
            channel: params.channel
        });
    };

    const defaultParams = [
        { name: 'username', default: 'Serval Bot' },
        { name: 'icon', default: ':tiger:' },
        { name: 'webhookUrl', sources: ['env', 'namespace-secret'] },
        { name: 'channel', sources: ['env', 'namespace-secret', 'pipelinerun', 'taskparam'] }
    ];

    const prefix = 'slack';

    runHandlers.addStarted(prefix,
        params => send(params, params.runStarted),
        [ ...defaultParams, { name: 'runStarted', default: ':alarm_clock: Pipeline `$name` Started', replace: true }]
    );

    runHandlers.addCancelled(prefix,
        params => send(params, params.runCancelled),
        [ ...defaultParams, { name: 'runCancelled', default: ':boom: Pipeline `$name` Cancelled', replace: true }]
    );

    runHandlers.addSucceeded(prefix,
        params => send(params, params.runSucceeded),
        [ ...defaultParams, { name: 'runSucceeded', default: ':partying_face: Pipeline `$name` Succeeded', replace: true }]
    );
    
    runHandlers.addFailed(prefix,
        params => send(params, params.runFailed),
        [ ...defaultParams, { name: 'runFailed', default: ':boom: Pipeline `$name` Failed', replace: true }]
    );

    handlers.addHandler('SlackNotification', 
        params => send(params, params.message),
        [ ...defaultParams, { name: 'message' }],
        prefix
    );
};