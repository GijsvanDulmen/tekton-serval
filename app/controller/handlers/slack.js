const { IncomingWebhook } = require('@slack/webhook');

const CustomTaskHandler = require('../lib/customTaskHandler')
const PipelineRunHandler = require('../lib/pipelineRunHandler')

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers) => {

    const sendToSlack = (channel, message) => {
        if ( process.env.SLACK_WEBHOOK_URL == undefined ) {
            return Promise.reject("No slack webhook configured");
        }
    
        const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
        return webhook.send({
            text:message,
            username: 'TektonSlackBot',
            icon_emoji: ':tekton:',
            channel: channel
        });
    };

    runHandlers.addCancelled('slack', () => sendToSlack("#tekton-dev", ":x: Pipeline Run Cancelled"));
    runHandlers.addStarted('slack', () => sendToSlack("#tekton-dev", ":crossed_fingers: Pipeline Run Started"));
    runHandlers.addSucceeded('slack', () => sendToSlack("#tekton-dev", ":partying_face: Pipeline Run Succeeded"));
    runHandlers.addFailed('slack', () => sendToSlack("#tekton-dev", ":x: Pipeline Run Failed"));

    handlers.addHandler('SlackNotification', params => sendToSlack(params.channel, params.message), [
        { name: 'channel' },
        { name: 'message' },
    ], 'slack');
};