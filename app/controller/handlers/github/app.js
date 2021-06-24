const fetch = require('node-fetch');
const { createAppAuth } = require("@octokit/auth-app");
const Bottleneck = require("bottleneck");
const AuthorizationWatcher = require('../../lib/authorizationWatcher');

const limiter = new Bottleneck({
    minTime: 100
});

module.exports = class GithubApp {
    /**
     * 
     * @param {AuthorizationWatcher} authWatcher 
     */
    constructor(authWatcher) {
        this.authWatcher = authWatcher;
    }

    token(installationId, namespace) {
        if ( !this.authWatcher.hasGithubInstallationAuthorization(namespace, installationId) ) {
            return Promise.reject("no authorization for this namespace and installation id combination");
        }

        return limiter.schedule(() => {
            return new Promise((res, rej) => {
                if ( process.env.GITHUB_APP_KEY == undefined
                    || process.env.GITHUB_APP_ID == undefined
                    || process.env.GITHUB_APP_CLIENT_ID == undefined
                    || process.env.GITHUB_APP_CLIENT_SECRET == undefined ) {
                    return rej("No github app configured");
                }

                const auth = createAppAuth({
                    appId: process.env.GITHUB_APP_ID,
                    privateKey: process.env.GITHUB_APP_KEY,
                    clientId: process.env.GITHUB_APP_CLIENT_ID,
                    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
                });

                return auth({ type: "installation", installationId: installationId, })
                    .then(resp => res(resp.token))
                    .catch(err => rej(err));
            });
        });
    }

    post(owner, repository, url, json, token, contentType, method) {
        if ( contentType == undefined ) {
            contentType == 'application/vnd.github.v3+json';
        }

        const completeUrl = "https://api.github.com/repos/"+owner+"/"+repository+"/"+url;
        return fetch(completeUrl, {
            method: method,
            body: JSON.stringify(json),
            headers: {
                "User-Agent": "Serval Tekton, the fast cat",
                'Content-Type': 'application/json',
                'Accept': contentType,
                'Authorization': 'Bearer ' + token,
            }
        });
    }

    postForInstallation(params, url, json, resultParser, contentType, method) {
        method = method == undefined ? 'post' : method;
        return this.token(params["installation-id"], params.runNamespace).then(token => {
            const p = this.post(params.owner, params.repository, url, json, token, contentType, method)
            if ( resultParser != undefined ) {
                return p.then(resp => resp.json())
                        .then(resp => {
                            if ( resp.errors ) {
                                throw new Error(resp.errors);
                            }
                            if ( resp.message ) {
                                throw new Error(resp.message);
                            }   
                            return resultParser(resp);
                        });
            }
            return p.then(() => {});
        });
    }

    getAppParams() {
        return [
            { name: 'repository', sources: ['namespace-secret', 'pipelinerun', 'taskparam'] },
            { name: 'owner', sources: ['namespace-secret', 'pipelinerun', 'taskparam'] },
            { name: 'installation-id', sources: ['namespace-secret', 'pipelinerun', 'taskparam'] },
        ];
    }
}