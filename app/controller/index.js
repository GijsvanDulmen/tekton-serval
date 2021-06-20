const k8s = require('@kubernetes/client-node');
const CustomTaskHandler = require('./lib/customTaskHandler');
const PipelineRunHandler = require('./lib/pipelineRunHandler');

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

require('./handlers/microsoft-teams')(handlers, runHandlers, logger);
require('./handlers/slack')(handlers, runHandlers, logger);
require('./handlers/wait')(handlers, runHandlers, logger);
require('./handlers/github/status')(handlers, runHandlers, logger);
require('./handlers/github/deployment')(handlers, runHandlers, logger);
require('./handlers/github/pullrequest')(handlers, runHandlers, logger);

handlers.start();
runHandlers.start();