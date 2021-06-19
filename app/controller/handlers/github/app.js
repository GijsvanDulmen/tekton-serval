const fetch = require('node-fetch');
const { createAppAuth } = require("@octokit/auth-app");
const Bottleneck = require("bottleneck");

const limiter = new Bottleneck({
    minTime: 100
});

module.exports = class GithubApp {
    constructor() {

    }

    token(installationId) {
        return limiter.schedule(() => {
            return new Promise((res, rej) => {
                if ( process.env.GITHUB_APP_KEY == undefined ) {
                    return rej("No github app key configured");
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

    post(owner, repository, url, json, token, contentType) {
        if ( contentType == undefined ) {
            contentType == 'application/vnd.github.v3+json';
        }

        const completeUrl = "https://api.github.com/repos/"+owner+"/"+repository+"/"+url;

        // console.log("posting to " + completeUrl);

        return fetch(completeUrl, {
            method: 'post',
            body:    JSON.stringify(json),
            headers: {
                "User-Agent": "Serval Tekton, the fast cat",
                'Content-Type': 'application/json',
                'Accept': contentType,
                'Authorization': 'Bearer ' + token,
            }
        });
    }

    postForInstallation(params, url, json, resultParser, contentType) {
        return this.token(params["installation-id"]).then(token => {
            const p = this.post(params.owner, params.repository, url, json, token, contentType)
            if ( resultParser != undefined ) {
                return p.then(resp => resp.json())
                        .then(resp => resultParser(resp));
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