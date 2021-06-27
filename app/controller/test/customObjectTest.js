var expect = require('chai').expect;
const CustomObject = require('../lib/customObject');
const { createLogger } = require('winston');

describe('CustomTaskHandler', function () {

    const logger = createLogger({ level: 'info' });
    const kc = require('./fakeKubeConfig');
    
    describe('fetchSecretIfNeeded', function () {
        it('should fetch secret', function (done) {
            const co = new CustomObject(kc, logger);
            co.coreApi = {
                readNamespacedSecret: (name, ns) => {
                    return Promise.resolve({
                        body: {
                            data: {
                                name: Buffer.from(name).toString('base64'), ns: Buffer.from(ns).toString('base64')
                            }
                        }
                    });
                }
            };

            const paramSpecs = [
                { sources: ['namespace-secret'] }
            ];

            co.fetchSecretIfNeeded(paramSpecs, 'ns1').then(res => {
                expect(res.name).to.eq('serval');
                expect(res.ns).to.eq('ns1');
                done();
            });
        });

        it('should fetch secret no secret when no param specs', function (done) {
            const co = new CustomObject(kc, logger);
            co.coreApi = {
                readNamespacedSecret: (name, ns) => {
                    expect(true).to.eq(false);
                    return Promise.resolve({ });
                }
            };

            const paramSpecs = [];

            co.fetchSecretIfNeeded(paramSpecs, 'ns1').then(res => {
                expect(Object.keys(res).length).to.eq(0);
                done();
            });
        });

        it('should fetch secret and work with errors', function (done) {
            const co = new CustomObject(kc, logger);
            co.coreApi = {
                readNamespacedSecret: (name, ns) => {
                    return Promise.reject("error!");
                }
            };

            const paramSpecs = [
                { sources: ['namespace-secret'] }
            ];

            co.fetchSecretIfNeeded(paramSpecs, 'ns1').then(res => {
                expect(Object.keys(res).length).to.eq(0);
                done();
            });
        });
    });

    describe('isServalApiVersion', function () {
        it('should match', function () {
            const co = new CustomObject(kc, logger);
            expect(co.isServalApiVersion("serval.dev/v2")).to.eq(false);
            expect(co.isServalApiVersion("serval.dev/v1")).to.eq(true);
        });
    });

    describe('getPatchHeaders', function () {
        it('should be correct', function () {
            const co = new CustomObject(kc, logger);
            expect(co.getPatchHeaders().headers['Content-type']).to.eq('application/json-patch+json');
        });
    });

    describe('replaceCommonVars', function () {
        it('should replace for pipelinerun', function () {
            const co = new CustomObject(kc, logger);

            const pr = {
                kind: 'PipelineRun',
                metadata: {
                    name: 'pr1',
                    namespace: 'ns1'
                }
            };

            expect(co.replaceCommonVars(pr, '$name')).to.eq('pr1');
            expect(co.replaceCommonVars(pr, '$namespace')).to.eq('ns1');

            expect(co.replaceCommonVars(pr, '$pipeline')).to.eq('$pipeline');
        });

        it('should replace for run', function () {
            const co = new CustomObject(kc, logger);

            const run = {
                kind: 'Run',
                metadata: {
                    name: 'pr1',
                    namespace: 'ns1',
                    labels: {
                        'tekton.dev/pipeline': 'p1',
                        'tekton.dev/pipelineRun': 'serval-run-k8mtg',
                        'tekton.dev/pipelineTask': 'slack-notification'
                    },
                }
            };

            expect(co.replaceCommonVars(run, '$name')).to.eq('serval-run-k8mtg');
            expect(co.replaceCommonVars(run, '$namespace')).to.eq('ns1');
            expect(co.replaceCommonVars(run, '$pipeline')).to.eq('p1');
            expect(co.replaceCommonVars(run, '$task')).to.eq('slack-notification');
        });
    });

    describe('patchCustomTaskResource', function () {
        it('should patch custom task resource', function (done) {
            const co = new CustomObject(kc, logger);
            co.customObjectsApi = {
                patchNamespacedCustomObjectStatus: (apiGroup, version, namespace, crdName, name, patch, no1, no2, no3, options ) => {
                    expect(apiGroup).to.eq('tekton.dev');
                    expect(version).to.eq('v1alpha1');
                    expect(namespace).to.eq('ns1');
                    expect(crdName).to.eq('runs');
                    expect(name).to.eq('resource');
                    expect(no1).to.eq(undefined);
                    expect(no2).to.eq(undefined);
                    expect(no3).to.eq(undefined);
                    expect(options.headers["Content-type"], 'application/json-patch+json');
                    done();
                }
            };

            co.patchCustomTaskResource("ns1", "resource", {})
        });

        it('should patch custom task resource and return no error but only log', function (done) {
            const co = new CustomObject(kc, logger);
            co.customObjectsApi = {
                patchNamespacedCustomObjectStatus: (apiGroup, version, namespace, crdName, name, patch, no1, no2, no3, options ) => {
                    return Promise.reject();
                }
            };

            co.patchCustomTaskResource("ns1", "resource", {})
            done();
        });
    });
});