const { SocketModeClient, LogLevel } = require('@slack/socket-mode');

const appToken = process.env.SLACK_APP_TOKEN;

module.exports = class SlackSocket {
    constructor(logger) {
        this.client = new SocketModeClient({
            appToken
        });
        this.logger = logger;
        this.listeners = [];
    }

    addCallback(id, callback, timeout, extraData) {
        const timer = setTimeout(() => {
            this.listeners = this.listeners.filter(l => l.id != id);
            extraData.result = 'timeout';
            callback(extraData);
        }, timeout)

        this.listeners.push({ id: id, callback: callback, timeout: timer, extraData: extraData });
    }

    start() {
        this.client.on('disconnected', () => {
            this.logger.info("slack socket disconnected")
        });

        this.client.on('connected', () => {
            this.logger.info("slack socket connected")
        });
        
        
        this.client.on('interactive', ({ body, ack }) => {
            ack().then(() => {
                if ( body.actions ) {
                    if ( body.actions[0] ) {
                        this.listeners.forEach(l => {
                            if ( body.actions[0].block_id == l.id ) {
                                l.extraData.result = body.actions[0].value;
                                if ( body.user && body.user.username ) {
                                    l.extraData.by = body.user.username;
                                }
                                clearTimeout(l.timeout);
                                l.callback(l.extraData);

                                this.logger.info("slack received callback for: " + l.id);
                            }
                        });
                    }
                }
            });
        });
        
        this.client.start().catch(err => {
            this.logger.error("slack socket could not connect");
            this.logger.error(err);
        });
    }
}