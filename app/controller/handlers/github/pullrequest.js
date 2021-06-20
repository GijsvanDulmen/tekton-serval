const CustomTaskHandler = require('../../lib/customTaskHandler'); // eslint-disable-line no-unused-vars
const PipelineRunHandler = require('../../lib/pipelineRunHandler'); // eslint-disable-line no-unused-vars

const GithubApp = require('./app');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {
    const app = new GithubApp();

    const openPullRequest = (params) => {
        const json = {
            title: params.title,
            head: params.head,
            base: params.base,
            body: params.body,
            draft: params.draft == 'true'
        };

        logger.info("open github pr for %s in ns %s", params.runName, params.runNamespace);

        return app.postForInstallation(params, "pulls", json, resp => {
            return {
                id: new String(resp.id),
                number: new String(resp.number)
            };
        });
    }

    // create pull request
    const prefix = 'github-pullrequest';

    // https://docs.github.com/en/rest/reference/pulls#create-a-pull-request
    handlers.addHandler('GithubOpenPullRequest',
        params => openPullRequest(params),
        [
            ...app.getAppParams(),
            
            { name: 'title' },
            { name: 'head' },
            { name: 'base' },
            { name: 'body', default: '' },
            { name: 'draft', default: 'false' },
        ],
        prefix
    );


    const updatePullRequest = (params) => {
        const json = {
            title: params.title,
            base: params.base,
            body: params.body,
            state: params.state,
        };

        logger.info("update github pr %s for %s in ns %s", params.pull_number, params.runName, params.runNamespace);

        return app.postForInstallation(params, "pulls/"+params.pull_number, json);
    }

    // https://docs.github.com/en/rest/reference/pulls#create-a-pull-request
    handlers.addHandler('GithubUpdatePullRequest',
        params => updatePullRequest(params),
        [
            ...app.getAppParams(),
            
            { name: 'pull_number' },
            { name: 'title', default: '' },
            { name: 'body', default: '' },
            { name: 'state', default: 'open' },
            { name: 'base', default: '' },
        ],
        prefix
    );

    const addComment = (params) => {
        const json = {
            body: params.body
        };

        logger.info("add github comment on %s for %s in ns %s", params.pull_number, params.runName, params.runNamespace);

        return app.postForInstallation(params, "issues/"+params.pull_number+"/comments", json);
    }

    // https://docs.github.com/en/rest/reference/issues#create-an-issue-comment
    handlers.addHandler('GithubAddComment',
        params => addComment(params),
        [
            ...app.getAppParams(),
            
            { name: 'pull_number' },
            { name: 'body' }
        ],
        prefix
    );

    const addReviewer = (params) => {
        const json = {
            reviewers: [params.reviewer]
        };

        logger.info("add github reviewers on %s for %s in ns %s", params.pull_number, params.runName, params.runNamespace);

        return app.postForInstallation(params, "pulls/"+params.pull_number+"/requested_reviewers", json);
    }

    // https://docs.github.com/en/rest/reference/issues#create-an-issue-comment
    handlers.addHandler('GithubAddReviewer',
        params => addReviewer(params),
        [
            ...app.getAppParams(),
            
            { name: 'pull_number' },
            { name: 'reviewer' }
        ],
        prefix
    );
};