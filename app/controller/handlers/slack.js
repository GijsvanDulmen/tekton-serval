const { IncomingWebhook } = require('@slack/webhook');
const { WebClient } = require('@slack/web-api');

const CustomTaskHandler = require('../lib/customTaskHandler'); // eslint-disable-line no-unused-vars
const PipelineRunHandler = require('../lib/pipelineRunHandler'); // eslint-disable-line no-unused-vars

const Bottleneck = require("bottleneck");
const AuthorizationWatcher = require('../lib/authorizationWatcher');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 * @param {*} logger
 * @param {AuthorizationWatcher} authWatcher
 */
module.exports = (handlers, runHandlers, logger, authWatcher) => {

    // https://api.slack.com/docs/rate-limits#rate-limits__limits-when-posting-messages
    // set the min time this way to allow for reduced stress on the api
    const limiter = new Bottleneck({
        minTime: 1000
    });

    const send = (params, message) => {
        return limiter.schedule(() => {
            logger.info("sending slack message for %s in ns %s", params.runName, params.runNamespace);

            const webhook = new IncomingWebhook(params.webhookUrl);
            return webhook.send({
                attachments: [
                    {
                        color: "#EDC707",
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: message
                                }
                            }
                        ]
                    }
                ],
                channel: params.channel,
                username: params.username,
                icon_emoji: params.icon
            }).then(() => {}); // no results
        });        
    };

    const sendByApi = (params, message) => {
        if ( !authWatcher.hasSlackChannelAuthorization(params.runNamespace, params.channel) ) {
            return Promise.reject("no authorization for this namespace and channel combination");
        }

        return limiter.schedule(() => {
            logger.info("sending slack api message for %s in ns %s", params.runName, params.runNamespace);

            const web = new WebClient(params.token);
            return web.chat.postMessage({
                attachments: [
                    {
                        color: "#EDC707",
                        blocks: [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: message
                                }
                            }
                        ]
                    }
                ],
                channel: params.channel,
                username: params.username,
                icon_emoji: params.icon
            }).then(() => {}); // no results
        });        
    };

    const defaultParams = [
        { name: 'username', default: 'Serval Bot' },
        { name: 'icon', default: ':tiger:' },
        { name: 'webhookUrl', sources: ['env', 'namespace-secret'] },
        { name: 'channel', sources: ['env', 'namespace-secret', 'pipelinerun', 'taskparam'] }
    ];

    const defaultParamsToken = [
        { name: 'username', default: 'Serval Bot' },
        { name: 'icon', default: ':tiger:' },
        { name: 'token', sources: ['env', 'namespace-secret'] },
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

    handlers.addHandler('SlackWrite', 
        params => sendByApi(params, params.message),
        [ ...defaultParamsToken, { name: 'message' }],
        prefix
    );


};