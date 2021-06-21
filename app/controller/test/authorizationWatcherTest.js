var expect = require('chai').expect;
const AuthorizationWatcher = require('../lib/authorizationWatcher');
const { createLogger } = require('winston');

describe('AuthorizationWatcher', function () {

    const logger = createLogger({ level: 'info' });
    const kc = require('./fakeKubeConfig');
    
    describe('hasSlackChannelAuthorization', function () {
        it('should work without authorization', function () {
            const aw = new AuthorizationWatcher(kc, logger);
            expect(aw.hasSlackChannelAuthorization('test', 'test')).to.be.true;
        });

        it('should work with authorizations', function () {
            const aw = new AuthorizationWatcher(kc, logger);
            aw.config['slack.channel.authorization'] = {
                'namespace1': ['#channel']
            };
            expect(aw.hasSlackChannelAuthorization('test', 'test')).to.be.false;
            expect(aw.hasSlackChannelAuthorization('namespace1', '#channel')).to.be.true;
        });
    });

    describe('hasGithubInstallationAuthorization', function () {
        it('should work without authorization', function () {
            const aw = new AuthorizationWatcher(kc, logger);
            expect(aw.hasGithubInstallationAuthorization('test', 'test')).to.be.true;
        });

        it('should work with authorizations', function () {
            const aw = new AuthorizationWatcher(kc, logger);
            aw.config['github.installation.authorization'] = {
                'namespace1': [123]
            };
            expect(aw.hasGithubInstallationAuthorization('test', 'test')).to.be.false;
            expect(aw.hasGithubInstallationAuthorization('namespace1', 123)).to.be.true;
        });
    });
});