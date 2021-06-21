const { IncomingWebhook } = require('@slack/webhook');
const { WebClient } = require('@slack/web-api');

const botToken = process.env.SLACK_BOT_TOKEN;

module.exports = class SlackApi {
    constructor() {
        this.web = new WebClient(botToken);
    }

    sendWithWebhookUrl(params, message) {
        const webhook = new IncomingWebhook(params.webhookUrl);
        return webhook.send(this.createMessage(params, message));
    }

    sendWithApi(params, message) {
        return this.web.chat.postMessage(this.createMessage(params, message));
    }

    updateMessageWithApi(ts, channel, message) {
        return this.web.chat.update({
            ts: ts,
            channel: channel,
            attachments: [
                {
                    color: "#EDC707",
                    blocks: [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": message
                            }
                        }
                    ]
                }
            ]
        });
    }

    sendApprovalWithApi(params, message, id) {
        return this.web.chat.postMessage({
            attachments: [
                {
                    color: "#EDC707",
                    blocks: [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": message
                            }
                        },
                        {
                            "type": "actions",
                            "block_id": id,
                            "elements": [
                                {
                                    "type": "button",
                                    "action_id": "approve_request:no",
                                    "style": "danger",
                                    "value": "rejected",
                                    "text": {
                                        "type": "plain_text",
                                        "text": ":no_entry: Reject",
                                        "emoji": true
                                    }
                                },
                                {
                                    "type": "button",
                                    "style": "primary",
                                    "value": "approved",
                                    "action_id": "approve_request:yes",
                                    "text": {
                                        "type": "plain_text",
                                        "text": ":white_check_mark: Approve",
                                        "emoji": true
                                    }
                                }
                            ]
                        }
                    ]
                }
            ],
            channel: params.channel,
            username: params.username,
            icon_emoji: params.icon
        });
    }

    createMessage(params, message) {
        return {
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
        };
    }
}