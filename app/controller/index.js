const k8s = require('@kubernetes/client-node');
const CustomTaskHandler = require('./lib/customTaskHandler');
const PipelineRunHandler = require('./lib/pipelineRunHandler');
const AuthorizationWatcher = require('./lib/authorizationWatcher');

const kc = new k8s.KubeConfig();

if ( process.env.KUBERNETES_SERVICE_HOST ) {
    kc.loadFromCluster();
} else {
    // local usage
    kc.loadFromDefault();
    kc.setCurrentContext('serval-sa'); // is created during cluster setup
}

const logger = require('./lib/logger');

const handlers = new CustomTaskHandler(kc, logger);
const runHandlers = new PipelineRunHandler(kc, logger);
const authWatcher = new AuthorizationWatcher(kc, logger);

require('./handlers/microsoft-teams')(handlers, runHandlers, logger);
require('./handlers/wait')(handlers, runHandlers, logger);

// slack
if ( process.env.SLACK_APP_TOKEN !== undefined
    && process.env.SLACK_BOT_TOKEN !== undefined ) {
    const Socket = require('./handlers/slack/slackSocket');
    const slackSocket = new Socket(logger, process.env.SLACK_APP_TOKEN);

    const SlackApi = require('./handlers/slack/slackApi');
    const slackApi = new SlackApi(process.env.SLACK_BOT_TOKEN);
    require('./handlers/slack')(handlers, runHandlers, logger, authWatcher, slackSocket, slackApi);

    slackSocket.start(); 
} else {
    require('./handlers/slack')(handlers, runHandlers, logger, authWatcher, undefined, undefined);
}

// github
const GithubApp = require('./handlers/github/app');
const app = new GithubApp(authWatcher);
require('./handlers/github/status')(handlers, runHandlers, logger, app);
require('./handlers/github/deployment')(handlers, runHandlers, logger, app);
require('./handlers/github/pullrequest')(handlers, runHandlers, logger, app);

// start all
authWatcher.start();
handlers.start();
runHandlers.start();