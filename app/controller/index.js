const k8s = require('@kubernetes/client-node');
const CustomTaskHandler = require('./lib/customTaskHandler');

const kc = new k8s.KubeConfig();

if ( process.env.KUBERNETES_SERVICE_HOST ) {
    kc.loadFromCluster();
} else {
    kc.loadFromDefault();
}

const handlers = new CustomTaskHandler(kc);

require('./handlers/microsoft-teams')(handlers);
require('./handlers/slack')(handlers);
require('./handlers/wait')(handlers);
require('./handlers/github-status')(handlers);
handlers.start();