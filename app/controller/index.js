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

// logging
const { createLogger, format, transports } = require('winston');
 
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.splat(),
    format.simple()
  ),
  defaultMeta: { service: 'serval' },
  transports: [
  ],
});

logger.add(new transports.Console({ format: format.json() }));

const handlers = new CustomTaskHandler(kc, logger);
const runHandlers = new PipelineRunHandler(kc, logger);
const authWatcher = new AuthorizationWatcher(kc, logger);

require('./handlers/microsoft-teams')(handlers, runHandlers, logger);
require('./handlers/wait')(handlers, runHandlers, logger);

// slack
const SlackSocket = require('./lib/slackSocket');
const slackSocket = new SlackSocket(logger);
require('./handlers/slack')(handlers, runHandlers, logger, authWatcher, slackSocket);

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
slackSocket.start();