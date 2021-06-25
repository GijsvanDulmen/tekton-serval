const CustomTaskHandler = require('../lib/customTaskHandler');
const PipelineRunHandler = require('../lib/pipelineRunHandler');

const Bottleneck = require("bottleneck");
const AuthorizationWatcher = require('../lib/authorizationWatcher');
const SlackSocket = require('./slack/slackSocket');
const SlackApi = require('./slack/slackApi');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 * @param {*} logger
 * @param {AuthorizationWatcher} authWatcher
 * @param {SlackSocket} slackSocket
 * * @param {SlackApi} slackApi
 */
module.exports = (handlers, runHandlers, logger, authWatcher, slackSocket, slackApi) => {

    // https://api.slack.com/docs/rate-limits#rate-limits__limits-when-posting-messages
    // set the min time this way to allow for reduced stress on the api
    const limiter = new Bottleneck({
        minTime: 1000
    });

    const send = (params, message) => {
        return limiter.schedule(() => {
            logger.info("sending slack message for %s in ns %s", params.runName, params.runNamespace);
            return slackApi.sendWithWebhookUrl(params, message).then(() => {}); // no results
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

    const sendByApi = (params, message) => {
        if ( slackApi == undefined || slackSocket == undefined ) {
            return Promise.reject("no slack api setup");
        }

        if ( !authWatcher.hasSlackChannelAuthorization(params.runNamespace, params.channel) ) {
            return Promise.reject("no authorization for this namespace and channel combination");
        }

        return limiter.schedule(() => {
            logger.info("sending slack api message for %s in ns %s", params.runName, params.runNamespace);
            return slackApi.sendWithApi(params, message).then(() => {}); // no results
        });        
    };

    handlers.addHandler('SlackWrite', 
        params => sendByApi(params, params.message),
        [ ...defaultParamsToken, { name: 'message', replace: true }],
        prefix
    );

    const approveByApi = (params, message) => {
        if ( slackApi == undefined || slackSocket == undefined ) {
            return Promise.reject("no slack api setup");
        }

        if ( !authWatcher.hasSlackChannelAuthorization(params.runNamespace, params.channel) ) {
            return Promise.reject("no authorization for this namespace and channel combination");
        }

        return new Promise((res, rej) => {
            limiter.schedule(() => {
                logger.info("sending slack api message for %s in ns %s", params.runName, params.runNamespace);

                const id = params.runNamespace+"-"+params.runName;
                slackApi.sendApprovalWithApi(params, message, id).catch(err => {
                    rej(err);
                }).then(resp => {
                    slackSocket.addCallback(id, result => {
                        let completedMessage;
                        if ( result.result == 'timeout' ) {
                            completedMessage = ':alarm_clock: timeout for: ' + message;
                        } else {
                            completedMessage = result.result + " by `"+result.by+"` for: " + message;
                        }

                        slackApi.updateMessageWithApi(result.ts, result.channel, completedMessage);
                        res({ result: result.result });
                    }, 1000*parseInt(params.timeout), {
                        channel: resp.channel,
                        ts: resp.ts
                    })
                });
            });     
        });
    };

    handlers.addHandler('SlackApprove', 
        params => approveByApi(params, params.message),
        [ ...defaultParamsToken, { name: 'message', replace: true }, { name: 'timeout' }],
        prefix
    );
};