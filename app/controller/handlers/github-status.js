const { createAppAuth } = require("@octokit/auth-app");
const fetch = require('node-fetch');
const CustomTaskHandler = require('../lib/customTaskHandler')
const PipelineRunHandler = require('../lib/pipelineRunHandler')

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers) => {

    const updateStatus = (params, state) => {
        if ( process.env.GITHUB_APP_KEY == undefined ) {
            return Promise.reject("No github app key configured");
        }
    
        const auth = createAppAuth({
            appId: process.env.GITHUB_APP_ID,
            privateKey: process.env.GITHUB_APP_KEY,
            clientId: process.env.GITHUB_APP_CLIENT_ID,
            clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
        });

        const json = {
            state: state,
            target_url: params.url,
            description: params.description,
            context: params.context
        };

        return auth({
            type: "installation",
            installationId: params["installation-id"],
        }).then(res => {
            return fetch("https://api.github.com/repos/"+params.owner+"/"+params.repository+"/statuses/"+params.commit, {
                method: 'post',
                body:    JSON.stringify(json),
                headers: {
                    "User-Agent": "Serval Tekton, the fast cat",
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + res.token,
                }
            }).catch(err => {
                console.log(err)
            })
        }).catch(err => {
            console.log(err)
        });
    }

    const defaultParams = [
        { name: 'commit' },
        { name: 'repository', sources: ['namespace-secret', 'pipelinerun', 'taskparam'] },
        { name: 'owner', sources: ['namespace-secret', 'pipelinerun', 'taskparam'] },
        { name: 'installation-id', sources: ['namespace-secret', 'pipelinerun', 'taskparam'] },
        { name: 'url', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], replace: true },
        { name: 'description', replace: true, default: "Run $name" },
        { name: 'context', sources: ['namespace-secret', 'pipelinerun', 'taskparam'], default: 'cicd/serval' },
    ];

    const prefix = 'github-status';

    runHandlers.addStarted(prefix,
        params => updateStatus(params, 'pending'),
        defaultParams
    );

    runHandlers.addCancelled(prefix,
        params => updateStatus(params, 'failure'),
        defaultParams
    );

    runHandlers.addSucceeded(prefix,
        params => updateStatus(params, 'success'),
        defaultParams
    );
    
    runHandlers.addFailed(prefix,
        params => updateStatus(params, 'failure'),
        defaultParams
    );

    handlers.addHandler('GithubStatus',
        params => updateStatus(params, params.status),
        [ ...defaultParams, { name: 'status' }],
        prefix
    );
};