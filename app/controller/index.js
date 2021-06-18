const k8s = require('@kubernetes/client-node');
const CustomTaskHandler = require('./lib/customTaskHandler');
const PipelineRunHandler = require('./lib/pipelineRunHandler');

const kc = new k8s.KubeConfig();

if ( process.env.KUBERNETES_SERVICE_HOST ) {
    kc.loadFromCluster();
} else {
    kc.loadFromDefault();
}

const handlers = new CustomTaskHandler(kc);
const runHandlers = new PipelineRunHandler(kc);

require('./handlers/microsoft-teams')(handlers, runHandlers);
require('./handlers/slack')(handlers, runHandlers);
require('./handlers/wait')(handlers, runHandlers);
require('./handlers/github-status')(handlers, runHandlers);

handlers.start();
runHandlers.start();