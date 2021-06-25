var expect = require('chai').expect;
const ParamFetcher = require('../lib/paramFetcher');

describe('ParamFetcher', function () {
    describe('getFromEnvironment', function () {
        it('should work normally', function () {
            const pf = new ParamFetcher();
            const spec = {
                sources: ['env'],
                name: 'webhookUrl'
            };
            process.env.SLACK_WEBHOOKURL = 'abc';
            const results = pf.getFromEnvironment("slack", spec, {});
            expect(results.webhookUrl).to.eq("abc");
        });

        it('should work not fetch when not env', function () {
            const pf = new ParamFetcher();
            const spec = {
                sources: [],
                name: 'webhookUrl'
            };
            process.env.SLACK_WEBHOOKURL = 'abc';
            const results = pf.getFromEnvironment("slack", spec, {});
            expect(results.webhookUrl).to.eq(undefined);
        });
    });

    describe('getFromEnvironment', function () {
        it('should work normally', function () {
            const pf = new ParamFetcher();
            const annotations = {
                'serval.dev/slack-channel': "#tekton-dev"
            };
            const spec = {
                sources: ['pipelinerun'],
                name: 'channel'
            };
            const results = pf.getFromAnnotations("slack", spec, {}, { annotations: annotations });
            expect(results.channel).to.eq("#tekton-dev");
        });

        it('should work normally with extra prefixes prefer prefix', function () {
            const pf = new ParamFetcher();
            const annotations = {
                'serval.dev/github-installation-id': "123",
                'serval.dev/github-pullrequest-installation-id': "456"
            };
            const spec = {
                sources: ['pipelinerun'],
                name: 'installation-id'
            };
            const results = pf.getFromAnnotations("github-pullrequest", spec, {}, { annotations: annotations }, ['github']);
            expect(results['installation-id']).to.eq("456");
        });

        it('should work normally with extra prefixes use extra prefix', function () {
            const pf = new ParamFetcher();
            const annotations = {
                'serval.dev/github-installation-id': "123"
            };
            const spec = {
                sources: ['pipelinerun'],
                name: 'installation-id'
            };
            const results = pf.getFromAnnotations("github-pullrequest", spec, {}, { annotations: annotations }, ['github']);
            expect(results['installation-id']).to.eq("123");
        });

        it('should work normally when there are no annotations', function () {
            const pf = new ParamFetcher();
            const spec = {
                sources: ['pipelinerun'],
                name: 'channel'
            };
            const results = pf.getFromAnnotations("slack", spec, {}, {});
            expect(results.channel).to.eq(undefined);
        });

        it('should work not fetch when not annotations', function () {
            const pf = new ParamFetcher();
            const annotations = {
                'serval.dev/slack-channel': "#tekton-dev"
            };
            const spec = {
                sources: [],
                name: 'webhookUrl'
            };
            const results = pf.getFromAnnotations("slack", spec, {}, annotations);
            expect(results.channel).to.eq(undefined);
        });
    });

    describe('getFromSecret', function () {
        it('should work normally', function () {
            const pf = new ParamFetcher();
            const secret = {
                'slack-channel': "#tekton-dev"
            };
            const spec = {
                sources: ['namespace-secret'],
                name: 'channel'
            };
            const results = pf.getFromSecret("slack", spec, {}, secret)
            expect(results.channel).to.eq("#tekton-dev");
        });

        it('should work not fetch when not annotations', function () {
            const pf = new ParamFetcher();
            const secret = {
                'slack-channel': "#tekton-dev"
            };
            const spec = {
                sources: [],
                name: 'channel'
            };
            const results = pf.getFromSecret("slack", spec, {}, secret)
            expect(results.channel).to.eq(undefined);
        });

        it('should work for extra prefixes prefer original prefix', function () {
            const pf = new ParamFetcher();
            const secret = {
                'github-installation-id': "123",
                'github-pullrequest-installation-id': "456"
            };
            const spec = {
                sources: ['namespace-secret'],
                name: 'installation-id'
            };
            const results = pf.getFromSecret("github-pullrequest", spec, {}, secret, ['github'])
            expect(results['installation-id']).to.eq("456");
        });

        it('should work for extra prefixes', function () {
            const pf = new ParamFetcher();
            const secret = {
                'github-installation-id': "123"
            };
            const spec = {
                sources: ['namespace-secret'],
                name: 'installation-id'
            };
            const results = pf.getFromSecret("github-pullrequest", spec, {}, secret, ['github'])
            expect(results['installation-id']).to.eq("123");
        });
    });

    describe('getFromPipelineRunParameters', function () {
        it('should work normally', function () {
            const pf = new ParamFetcher();
            const spec = {
                sources: ['pipelinerun'],
                name: 'channel'
            };
            const results = pf.getFromPipelineRunParameters("slack", spec, {}, {
                params: [ { name: 'serval-dev-slack-channel', value: '#serval' } ]
            })
            expect(results.channel).to.eq("#serval");
        });

        it('should work without params', function () {
            const pf = new ParamFetcher();
            const spec = {
                sources: ['pipelinerun'],
                name: 'channel'
            };
            const results = pf.getFromPipelineRunParameters("slack", spec, {}, { })
            expect(results.channel).to.eq(undefined);
        });

        it('should work with prefixes', function () {
            const pf = new ParamFetcher();
            const spec = {
                sources: ['pipelinerun'],
                name: 'channel'
            };
            const results = pf.getFromPipelineRunParameters("slack", spec, {}, {
                params: [ { name: 'serval-dev-slack-extra-channel', value: '#serval' } ]
            }, ['slack-extra']);
            expect(results.channel).to.eq("#serval");
        });
    });

    describe('getParam', function () {
        it('should create defaults', function () {
            const pf = new ParamFetcher();
            const spec = {
                sources: [],
                name: 'channel',
                default: 'abc'
            };
            const results = pf.getParam('slack', spec, {}, {}, {}, {});
            expect(results.channel).to.eq("abc");
        });

        it('should prefer secret above env', function () {
            const pf = new ParamFetcher();
            process.env.SLACK_CHANNEL = 'abc';
            const secret = {
                'slack-channel': "#tekton-dev"
            };
            const spec = {
                sources: ['env', 'namespace-secret'],
                name: 'channel'
            };
            const results = pf.getParam('slack', spec, {}, secret, {}, {});
            expect(results.channel).to.eq("#tekton-dev");
        });

        it('should prefer annotations above secret', function () {
            const pf = new ParamFetcher();
            const secret = {
                'slack-channel': "#tekton-dev"
            };
            const annotations = {
                'serval.dev/slack-channel': "#tekton-dev2"
            };
            const spec = {
                sources: ['env', 'namespace-secret', 'pipelinerun'],
                name: 'channel'
            };
            const results = pf.getParam('slack', spec, {}, secret, { annotations: annotations }, {});
            expect(results.channel).to.eq("#tekton-dev2");
        });

        it('should prefer pipeline params above annotations', function () {
            const pf = new ParamFetcher();
            const annotations = {
                'serval.dev/slack-channel': "#tekton-dev2"
            };
            const spec = {
                sources: ['env', 'namespace-secret', 'pipelinerun'],
                name: 'channel'
            };
            const results = pf.getParam('slack', spec, {}, {}, { annotations: annotations }, {
                params: [ { name: 'serval-dev-slack-channel', value: '#serval' } ] 
            });
            expect(results.channel).to.eq("#serval");
        });
    });
});