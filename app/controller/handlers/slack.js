const { IncomingWebhook } = require('@slack/webhook');

module.exports = handlers => {
    handlers.addHandler('SlackNotification', params => {
        if ( process.env.SLACK_WEBHOOK_URL == undefined ) {
            return Promise.reject("No slack webhook configured");
        }
    
        const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
        return webhook.send({
            text: params.message,
            username: 'TektonSlackBot',
            icon_emoji: ':tekton:',
            channel: params.channel
        });
    }, [
        { name: 'channel' },
        { name: 'message' },
    ], 'slack');
};