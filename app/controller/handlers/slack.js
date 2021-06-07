const { IncomingWebhook } = require('@slack/webhook');

module.exports = handlers => {
    handlers.addHandler('SlackNotification', params => {
        if ( process.env.SLACK_WEBHOOK_URL == undefined ) {
            return Promise.reject("No slack webhook configured");
        }
    
        const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);
    
        let message;
        let channel;
        params.forEach(param => {
            if (param.name == 'channel') {
                channel = param.value;
            } else if (param.name == 'message') {
                message = param.value;
            }
        })
    
        if ( message == undefined || channel == undefined ) {
            return Promise.reject('message or channel parameter missing');
        }
    
        return webhook.send({
            text: message,
            username: 'TektonSlackBot',
            icon_emoji: ':tekton:',
            channel: channel
        });
    });
};