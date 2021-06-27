var expect = require('chai').expect;
const CustomTaskHandler = require('../lib/customTaskHandler');
const { createLogger } = require('winston');

describe('CustomTaskHandler', function () {

    const logger = createLogger({ level: 'info' });
    const kc = require('./fakeKubeConfig');
    
    describe('keyValueToNameValue', function () {
        it('should convert empty results', function () {
            const cth = new CustomTaskHandler(kc, logger);
            const res = cth.keyValueToNameValue(undefined);
            expect(res.length).to.eq(0);
        });

        it('should convert results', function () {
            const cth = new CustomTaskHandler(kc, logger);
            const res = cth.keyValueToNameValue({
                field1: 'value1',
                field2: 'value2'
            });
            expect(res.length).to.eq(2);
            expect(res[0].name).to.eq('field1');
            expect(res[0].value).to.eq('value1');
            expect(res[1].name).to.eq('field2');
            expect(res[1].value).to.eq('value2');
        });
    });

    describe('isServalCustomTaskToProcess', function () {
        const cth = new CustomTaskHandler(kc, logger);
            
        // task ref
        it('should not process completed runs', function () {
            expect(cth.isServalCustomTaskToProcess({ status: { completionTime: '123' } })).to.eq(false);
        });

        it('should process not completed runs', function () {
            expect(cth.isServalCustomTaskToProcess({ spec: { ref: { apiVersion: 'serval.dev/v1' } } })).to.eq(true);
        });

        it('should not process other runs', function () {
            expect(cth.isServalCustomTaskToProcess({ spec: { ref: { apiVersion: 'tekton.dev/v1' } } })).to.eq(false);
        });

        // task spec
        it('should process not completed task spec runs', function () {
            expect(cth.isServalCustomTaskToProcess({ spec: { spec: { apiVersion: 'serval.dev/v1' } } })).to.eq(true);
        });

        it('should not process other runs', function () {
            expect(cth.isServalCustomTaskToProcess({ spec: { spec: { apiVersion: 'tekton.dev/v1' } } })).to.eq(false);
        });
    });

    describe('generifyCustomTask', function() {
        const cth = new CustomTaskHandler(kc, logger);
            
        it('should generify task by spec', function () {
            const generified = cth.generifyCustomTask({
                metadata: {
                    labels: {
                        "tekton.dev/pipelineRun": "runA"
                    }
                },
                "spec": {
                    "serviceAccountName": "default",
                    "spec": {
                        "apiVersion": "serval.dev/v1",
                        "kind": "Wait",
                        "metadata": {},
                        "spec": {
                            "waitFor": "2"
                        }
                    }
                },
                "status": {
                    completionTime: '2021-06-25T10:14:01Z',
                    conditions: [
                      {
                        lastTransitionTime: '2021-06-25T10:14:01Z',
                        message: 'Successfull',
                        reason: 'Successfull',
                        status: 'True',
                        type: 'Succeeded'
                      }
                    ],
                    extraFields: null,
                    startTime: '2021-06-25T10:14:01Z'
                }
            })
            expect(generified.kind).to.eq('Wait');
            expect(generified.params[0].name).to.eq('waitFor');
            expect(generified.params[0].value).to.eq("2");
            expect(generified.status.reason).to.eq("Successfull");
            expect(generified.run).to.eq("runA");
        });

        it('should generify nothing', function () {
            const generified = cth.generifyCustomTask({})
            expect(Object.keys(generified).length).to.eq(0)
        });

        it('should work without status part', function () {
            const metadata = {
                labels: {
                    "tekton.dev/pipelineRun": "runA"
                }
            };
            const spec = {
                "serviceAccountName": "default",
                "spec": {
                    "apiVersion": "serval.dev/v1",
                    "kind": "Wait",
                    "metadata": {},
                    "spec": {
                        "waitFor": "2"
                    }
                }
            };

            expect(Object.keys(cth.generifyCustomTask({ metadata: metadata, spec: spec }).status).length).to.eq(0);
            expect(Object.keys(cth.generifyCustomTask({ metadata: metadata, spec: spec, status: {} }).status).length).to.eq(0);
            expect(Object.keys(cth.generifyCustomTask({ metadata: metadata, spec: spec, status: { conditions: [] } }).status).length).to.eq(0);
        });

        it('should throw exception on invalid data', function () {
            const spec = {
                "serviceAccountName": "default",
                "spec": {
                    "apiVersion": "serval.dev/v1",
                    "kind": "Wait",
                    "metadata": {},
                    "spec": {
                        "waitFor": 2
                    }
                }
            };

            try {
                cth.generifyCustomTask({
                    metadata: {
                        labels: {
                            "tekton.dev/pipelineRun": "runA"
                        }
                    },
                    spec: spec
                });
                expect(false).to.eq(true);
            } catch(err) {
                expect(true).to.eq(true);
            }
        });

        it('should generify task by ref', function () {
            const generified = cth.generifyCustomTask({
                metadata: {
                    labels: {
                        "tekton.dev/pipelineRun": "runA"
                    }
                },
                "spec": {
                    "params": [
                        {
                            "name": "waitFor",
                            "value": "2"
                        }
                    ],
                    "ref": {
                        "apiVersion": "serval.dev/v1",
                        "kind": "Wait"
                    },
                    "serviceAccountName": "default"
                },
                "status": {
                    completionTime: '2021-06-25T10:14:01Z',
                    conditions: [
                      {
                        lastTransitionTime: '2021-06-25T10:14:01Z',
                        message: 'Successfull',
                        reason: 'Successfull',
                        status: 'True',
                        type: 'Succeeded'
                      }
                    ],
                    extraFields: null,
                    startTime: '2021-06-25T10:14:01Z'
                }
            })
            expect(generified.kind).to.eq('Wait');
            expect(generified.params[0].name).to.eq('waitFor');
            expect(generified.params[0].value).to.eq("2");
            expect(generified.status.reason).to.eq("Successfull");
            expect(generified.run).to.eq("runA");
        });
    })

    describe('getFromTaskSpec', function () {
        const cth = new CustomTaskHandler(kc, logger);
            
        it('should fetch from task specs', function () {
            const spec = {
                sources: ['taskparam'],
                name: 'webhookUrl'
            };
            const results = cth.getFromTaskSpec(spec, {}, {
                params: [
                    { name: 'webhookUrl', value: 'url2' }
                ]
            });
            expect(results.webhookUrl).to.eq('url2');
        });

        it('should not fetch from task specs if not as source', function () {
            const spec = {
                sources: [],
                name: 'webhookUrl'
            };
            const results = cth.getFromTaskSpec(spec, {}, {
                params: [
                    { name: 'webhookUrl', value: 'url2' }
                ]
            });
            expect(results.webhookUrl).to.eq(undefined);
        });

        it('should not fetch from task specs if not available', function () {
            const spec = {
                sources: ['taskparam'],
                name: 'webhookUrl'
            };
            const results = cth.getFromTaskSpec(spec, {}, {
                params: []
            });
            expect(results.webhookUrl).to.eq(undefined);
        });
    });

    describe('getSuccessPatch', function () {
        const cth = new CustomTaskHandler(kc, logger);

        it('should create success patch', function () {
            const patch = cth.getSuccessPatch({ a: "b" });
            expect(patch[0].value.conditions[0].message).to.eq('Successfull');
            expect(patch[0].value.conditions[0].reason).to.eq('Successfull');
            expect(patch[0].value.conditions[0].status).to.eq('True');
            expect(patch[0].value.conditions[0].type).to.eq("Succeeded");
            expect(patch[0].value.results.a).to.eq("b");
        });
    });

    describe('getFailurePatch', function () {
        const cth = new CustomTaskHandler(kc, logger);

        it('should create success patch', function () {
            const patch = cth.getFailurePatch("failezz");
            expect(patch[0].value.conditions[0].message).to.eq('failezz');
            expect(patch[0].value.conditions[0].reason).to.eq('failezz');
            expect(patch[0].value.conditions[0].status).to.eq('False');
            expect(patch[0].value.conditions[0].type).to.eq("Succeeded");
            expect(Object.keys(patch[0].value.results).length).to.eq(0);
        });
    });

    describe('getPatch', function () {
        const cth = new CustomTaskHandler(kc, logger);

        it('should create patch', function () {
            const patch = cth.getFailurePatch("failezz");
            expect(patch[0].op).to.eq('replace');
            expect(patch[0].path).to.eq('/status');
        });
    });

    describe('addHandler', function () {
        const cth = new CustomTaskHandler(kc, logger);

        it('should add handler', function () {
            cth.addHandler('name', () => {}, {}, 'prefix');
        });
    });

    describe('formatMissingTaskMessage', function() {
        
        it('should format message correctly', function () {
            const cth = new CustomTaskHandler(kc, logger);
            cth.addHandler('slack', () => {}, [
                { name: 'item' }
            ], 'prefix');
            const output = cth.formatMissingTaskMessage('slack', {});
            expect(output).to.eq('Parameters [item] missing, consult documentation')
        });

        it('should format message correctly', function () {
            const cth = new CustomTaskHandler(kc, logger);
            cth.addHandler('slack', () => {}, [
                { name: 'item' }, { name: 'item2' },
            ], 'prefix');
            const output = cth.formatMissingTaskMessage('slack', {});
            expect(output).to.eq('Parameters [item, item2] missing, consult documentation')
        });
    });

    describe('getParameters', function() {
        it('should get parameters correctly', function(done) {
            const cth = new CustomTaskHandler(kc, logger);
            cth.fetchSecretIfNeeded = (paramSpecs, ns1) => Promise.resolve({});

            cth.addHandler('slack', () => {}, [
                { name: 'item', sources: ['namespace-secret', 'taskparam', 'pipelinerun'] }
            ], 'slack');

            cth.getParameters('slack', 'slack', {
                run: {

                }
            }, {
                metadata: {
                    name: 'run1',
                    namespace: 'ns1',
                    annotations: {
                        'serval.dev/slack-item': 'abc'
                    }
                }
            }, params => {
                expect(params.item).to.eq('abc');
                expect(params.runNamespace).to.eq('ns1');
                expect(params.runName).to.eq('run1');
                done();
            }).catch(err => {
                expect(true).to.eq(false);
                done();
            })
        });

        it('should default to pipelinerun params', function(done) {
            const cth = new CustomTaskHandler(kc, logger);
            cth.fetchSecretIfNeeded = (paramSpecs, ns1) => Promise.resolve({});

            cth.addHandler('slack', () => {}, [
                { name: 'item', replace: true }
            ], 'slack');

            cth.getParameters('slack', 'slack', {
                run: {

                }
            }, {
                metadata: {
                    name: 'run1',
                    namespace: 'ns1',
                    annotations: {
                        'serval.dev/slack-item': 'abc'
                    }
                }
            }, params => {
                expect(params.item).to.eq('abc');
                expect(params.runNamespace).to.eq('ns1');
                expect(params.runName).to.eq('run1');
                done();
            }).catch(err => {
                expect(true).to.eq(false);
                done();
            })
        });

        it('should not process missing params', function(done) {
            const cth = new CustomTaskHandler(kc, logger);
            cth.fetchSecretIfNeeded = (paramSpecs, ns1) => Promise.resolve({});

            cth.addHandler('slack', () => {}, [
                { name: 'item', replace: true }
            ], 'slack');

            cth.getParameters('slack', 'slack', {
                run: {

                }
            }, {
                metadata: {
                    name: 'run1',
                    namespace: 'ns1'
                }
            }, params => {
                expect(true).to.eq(false);
                done();
            }).catch(err => {
                console.log(err);
                done();
            })
        });
    });


    describe('updateCustomTaskWithErrorMessage', function() {
        it('should work with obj', function(done) {
            const cth = new CustomTaskHandler(kc, logger);
            cth.patchCustomTaskResource = (ns, name, patch) => {
                expect(ns).to.eq('ns1');
                expect(name).to.eq('name1');
                expect(patch[0].value.conditions[0].message).to.eq('err1');
                done();
            };
            cth.updateCustomTaskWithErrorMessageWithObj({
                metadata: {
                    namespace: 'ns1',
                    name: 'name1'
                }
            }, 'err1')
        });

        it('should work without obj', function(done) {
            const cth = new CustomTaskHandler(kc, logger);
            cth.patchCustomTaskResource = (ns, name, patch) => {
                expect(ns).to.eq('ns1');
                expect(name).to.eq('name1');
                expect(patch[0].value.conditions[0].message).to.eq('err1');
                done();
            };
            cth.updateCustomTaskWithErrorMessage('ns1', 'name1', 'err1')
        });
    });
});
