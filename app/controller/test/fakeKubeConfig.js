const k8s = require('@kubernetes/client-node');
const cluster = { name: 'server', server: 'http://localhost' };
const user = { name: 'user', password: 'password', };
const context = { name: 'context', user: user.name, cluster: cluster.name };

const kc = new k8s.KubeConfig();
kc.loadFromOptions({
    clusters: [cluster],
    users: [user],
    contexts: [context],
    currentContext: context.name,
});

module.exports = kc;