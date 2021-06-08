const fetch = require('node-fetch');

module.exports = handlers => {
    handlers.addHandler('TeamsNotification', params => {
        if ( process.env.TEAMS_WEBHOOK_URL == undefined ) {
            return Promise.reject("No teams webhook configured");
        }
    
        return fetch(process.env.TEAMS_WEBHOOK_URL, {
            method: 'post',
            body:    JSON.stringify({
                text: params.message
            }),
            headers: { 'Content-Type': 'application/json' },
        });
    }, [
        { name: 'message' },
    ], 'microsoft-teams');
};