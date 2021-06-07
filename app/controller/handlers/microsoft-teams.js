const fetch = require('node-fetch');

module.exports = handlers => {
    handlers.addHandler('TeamsNotification', params => {
        if ( process.env.TEAMS_WEBHOOK_URL == undefined ) {
            return Promise.reject("No teams webhook configured");
        }
    
        let message;
        params.forEach(param => {
            if (param.name == 'message') {
                message = param.value;
            }
        })
    
        if ( message == undefined ) {
            return Promise.reject('message parameter missing');
        }
    
        return fetch(process.env.TEAMS_WEBHOOK_URL, {
            method: 'post',
            body:    JSON.stringify({
                text: message
            }),
            headers: { 'Content-Type': 'application/json' },
        });
    });
};