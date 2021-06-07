const { createAppAuth } = require("@octokit/auth-app");
const fetch = require('node-fetch');

module.exports = handlers => {
    handlers.addHandler('GithubStatus', params => {
        if ( process.env.GITHUB_APP_KEY == undefined ) {
            return Promise.reject("No github app key configured");
        }

        let settings = {
            context: 'cicd/tekton'
        };

        let props = ['commit', 'repository', 'owner', 'status', 'installation-id', 'url', 'context'];

        params.forEach(param => {
            if ( props.indexOf(param.name) != -1 ) {
                settings[param.name] = param.value;
            }
        });

        if ( Object.keys(settings).length != props.length ) {
            return Promise.reject('parameters missing, consult documentation');
        }
    
        const auth = createAppAuth({
            appId: process.env.GITHUB_APP_ID,
            privateKey: process.env.GITHUB_APP_KEY,
            clientId: process.env.GITHUB_APP_CLIENT_ID,
            clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
        });
        
        const json = {
            state: settings.status,
            target_url: settings.url,
            description: "Description",
            context: settings.context
        };

        return auth({
            type: "installation",
            installationId: settings["installation-id"],
        }).then(res => {
            return fetch("https://api.github.com/repos/"+settings.owner+"/"+settings.repository+"/statuses/"+settings.commit, {
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
    });
};