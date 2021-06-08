const { createAppAuth } = require("@octokit/auth-app");
const fetch = require('node-fetch');

module.exports = handlers => {
    handlers.addHandler('GithubStatus', params => {
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
            state: params.status,
            target_url: params.url,
            description: "Description",
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
    }, [
        { name: 'commit' },
        { name: 'repository' },
        { name: 'owner' },
        { name: 'status' },
        { name: 'installation-id' },
        { name: 'url' },
        { name: 'context', default: 'cicd/tekton' },
    ], 'github-status');
};