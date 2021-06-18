const fetch = require('node-fetch');

const CustomTaskHandler = require('../lib/customTaskHandler')
const PipelineRunHandler = require('../lib/pipelineRunHandler')

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers) => {
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