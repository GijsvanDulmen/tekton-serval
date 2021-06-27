var expect = require('chai').expect;
const PipelineRunHandler = require('../lib/pipelineRunHandler');
const { createLogger } = require('winston');

describe('PipelineRunHandler', function () {

    const logger = createLogger({ level: 'info' });
    const kc = require('./fakeKubeConfig');
    
    describe('getEventFromCondition', function () {
        it('should do some safety guards', function () {
            const prh = new PipelineRunHandler(kc, logger);

            expect(prh.getEventFromCondition({  })).to.be.false;
            expect(prh.getEventFromCondition({ reason: '' })).to.be.false;
            expect(prh.getEventFromCondition({ status: '' })).to.be.false;
        });

        it('should work for started', function () {
            const prh = new PipelineRunHandler(kc, logger);
            expect(prh.getEventFromCondition({ status: 'Unknown', reason: 'Running' })).to.eq('started');
        });

        it('should work for succeeded', function () {
            const prh = new PipelineRunHandler(kc, logger);

            expect(prh.getEventFromCondition({ status: 'True', reason: 'Succeeded' })).to.eq('succeeded');
            expect(prh.getEventFromCondition({ status: 'True', reason: 'Completed' })).to.eq('succeeded');
        });
        
        it('should work for failed', function () {
            const prh = new PipelineRunHandler(kc, logger);

            expect(prh.getEventFromCondition({ status: 'False', reason: 'PipelineRunTimeout' })).to.eq('failed');
            expect(prh.getEventFromCondition({ status: 'False', reason: 'Failed' })).to.eq('failed');
            expect(prh.getEventFromCondition({ status: 'False', reason: 'Other' })).to.eq('failed');
        });

        it('should work for cancelled', function () {
            const prh = new PipelineRunHandler(kc, logger);

            expect(prh.getEventFromCondition({ status: 'False', reason: 'PipelineRunCancelled' })).to.eq('cancelled');
        });
    });

    describe('getMonitors', function () {
        it('should do some safety guards', function () {
            const prh = new PipelineRunHandler(kc, logger);
            expect(prh.getMonitors({  }).length).to.eq(0);

            expect(prh.getMonitors({
                metadata: {
                    annotations: { }
                }
            }).length).to.eq(0);

            expect(prh.getMonitors({
                metadata: {
                    annotations: {
                        "serval.dev/monitor-run": '' 
                    }
                }
            }).length).to.eq(0);
        });

        it('should work for a single monitor', function () {
            
            const prh = new PipelineRunHandler(kc, logger);
            const monitors = prh.getMonitors({ 
                metadata: {
                    annotations: {
                        "serval.dev/monitor-run": 'slack'
                    }
                }
            })
            expect(monitors.length).to.eq(1);
            expect(monitors[0]).to.eq('slack');
        });

        it('should work for a single monitor', function () {
            const prh = new PipelineRunHandler(kc, logger);
            const monitors = prh.getMonitors({ 
                metadata: {
                    annotations: {
                        "serval.dev/monitor-run": 'slack,microsoft-teams'
                    }
                }
            })
            expect(monitors.length).to.eq(2);
            expect(monitors[0]).to.eq('slack');
            expect(monitors[1]).to.eq('microsoft-teams');
        });
    });

    describe('processForEachEvent', function () {
        it('should do some safety guards', function () {
            const prh = new PipelineRunHandler(kc, logger);
            
            let matched = false;
            prh.addSucceeded('slack', () => {}, {});
            
            prh.processForEachEvent({
                metadata: {
                    annotations: {

                    }
                },
                status: {
                    conditions: [
                        {
                            type: 'Succeeded',
                            status: 'True',
                            reason:'Succeeded'
                        }
                    ]
                }
            }, (handler,obj) => {
                matched = true;
            });

            expect(matched).to.eq(false);
        });

        it('should work ok', function () {
            const prh = new PipelineRunHandler(kc, logger);
            
            let matched = false;
            prh.addSucceeded('slack', () => {}, {});
            prh.addCancelled('slack', () => {}, {});
            prh.addFailed('slack', () => {}, {});
            prh.addStarted('slack', () => {}, {});
            
            prh.processForEachEvent({
                metadata: {
                    annotations: {
                        "serval.dev/monitor-run": 'slack'
                    }
                },
                status: {
                    conditions: [
                        {
                            type: 'Succeeded',
                            status: 'True',
                            reason:'Succeeded'
                        }
                    ]
                }
            }, (handler,obj) => {
                matched = true;
            });
            
            expect(matched).to.eq(true);
        });

        it('should not work for other events', function () {
            const prh = new PipelineRunHandler(kc, logger);
            
            let matched = false;
            prh.addCancelled('slack', () => {}, {});
            
            prh.processForEachEvent({
                metadata: {
                    annotations: {
                        "serval.dev/monitor-run": 'slack'
                    }
                },
                status: {
                    conditions: [
                        {
                            type: 'Succeeded',
                            status: 'True',
                            reason:'Succeeded'
                        }
                    ]
                }
            }, (handler,obj) => {
                matched = true;
            });
            
            expect(matched).to.eq(false);
        });
    });

    describe('getAnnotationSplitted', function () {
        it('should work for monitor-run', function () {
            const prh = new PipelineRunHandler(kc, logger);

            const results = prh.getMonitors({
                metadata: {
                    annotations: {
                        "serval.dev/monitor-run": 'slack,teams'
                    }
                }
            });
            expect(results.length).to.eq(2);
        });

        it('should work for check-run', function () {
            const prh = new PipelineRunHandler(kc, logger);

            const results = prh.getCheckRun({
                metadata: {
                    annotations: {
                        "serval.dev/check-run": 'slack,teams'
                    }
                }
            });
            expect(results.length).to.eq(2);
        });

        it('should work for check-run-tasks', function () {
            const prh = new PipelineRunHandler(kc, logger);

            const results = prh.getCheckRunTasks({
                metadata: {
                    annotations: {
                        "serval.dev/check-run-tasks": 'slack,teams'
                    }
                }
            });
            expect(results.length).to.eq(2);
        });
    });


    describe('convertPipelineRunToTasks', function() {
        it('should work for task spec', function () {
            const prh = new PipelineRunHandler(kc, logger);

            const now = new Date();
            const results = prh.convertPipelineRunToTasks({
                metadata: {
                    name: 'runname'
                },
                status: {
                    startTime: now.toISOString(),
                    conditions: [
                        {
                            status: 'Unknown',
                            reason: 'Running'
                        }
                    ],
                    runs: {
                        'abc': {
                            pipelineTaskName: 'taskname',
                            status: {
                                conditions: [
                                    {
                                        status: "status"
                                    }
                                ]
                            }
                        },
                        'abc2': {
                            pipelineTaskName: 'taskname2',
                            status: {
                                conditions: [
                                    {
                                        status: "status"
                                    }
                                ]
                            }
                        }
                    },
                    pipelineSpec: {
                        tasks: [
                            {
                                name: 'taskname',
                                taskRef: {
                                    apiVersion: 'serval.dev/v1',
                                    kind: 'Wait',
                                    params: [
                                        { name: 'a', value: 'b' }
                                    ]
                                }
                            },
                            {
                                name: 'taskname2',
                                taskSpec: {
                                    apiVersion: 'serval.dev/v1',
                                    kind: 'Wait2',
                                    spec: {
                                        name: 'abc'
                                    }
                                }
                            }
                        ]
                    }
                }
            })

            expect(results.length).to.eq(2);

            expect(results[0].run).to.eq('runname');
            expect(results[0].runStatus).to.eq('started');
            expect(results[0].runStart).to.eq(now.getTime());
            expect(results[0].kind).to.eq('Wait');
            expect(results[0].id).to.eq('abc');
            expect(results[0].status.status).to.eq('status');

            expect(results[1].run).to.eq('runname');
            expect(results[1].runStatus).to.eq('started');
            expect(results[1].runStart).to.eq(now.getTime());
            expect(results[1].kind).to.eq('Wait2');
            expect(results[1].id).to.eq('abc2');
            expect(results[1].status.status).to.eq('status');
        });
    });

    describe('updateRunStatus', function () {
        it('should work updating status', function (done) {
            const prh = new PipelineRunHandler(kc, logger);
            prh.customObjectsApi = {
                patchNamespacedCustomObject: (group, version, ns, type, name, patch, a, b, c, options) => {
                    expect(group).to.eq('tekton.dev');
                    expect(version).to.eq('v1beta1');
                    expect(type).to.eq('pipelineruns');
                    expect(ns).to.eq('ns1');
                    expect(name).to.eq('name1');
                    expect(patch[0].value).to.eq('Cancelled');
                    done();
                }
            }
            prh.updateRunStatus('ns1', 'name1', 'Cancelled');
        });
    });

    describe('getRunsForNamespace', function () {
        it('should work updating status', function (done) {
            const prh = new PipelineRunHandler(kc, logger);
            prh.customObjectsApi = {
                listNamespacedCustomObject: (group, version, ns, type) => {
                    expect(group).to.eq('tekton.dev');
                    expect(version).to.eq('v1beta1');
                    expect(type).to.eq('pipelineruns');
                    expect(ns).to.eq('ns1');
                    return Promise.resolve({
                        body: {
                            items: [
                                { item: 'a' }
                            ]
                        }
                    });
                }
            }
            prh.getRunsForNamespace('ns1', item => {
                expect(item.item).to.eq('a');
                done();
            })
        });
    });

    describe('getRunsPerNamespace', function () {
        it('should work updating status', function (done) {
            const prh = new PipelineRunHandler(kc, logger);
            prh.coreApi = {
                listNamespace: () => {
                    return Promise.resolve({
                        body: {
                            items: [
                                {
                                    metadata: {
                                        name: 'ns1'
                                    }
                                }
                            ]
                        }
                    })
                }
            };
            prh.customObjectsApi = {
                listNamespacedCustomObject: (group, version, ns, type) => {
                    expect(group).to.eq('tekton.dev');
                    expect(version).to.eq('v1beta1');
                    expect(type).to.eq('pipelineruns');
                    expect(ns).to.eq('ns1');

                    return Promise.resolve({
                        body: {
                            items: [
                                {
                                    metadata: {
                                        name: 'run1'
                                    },
                                    status: {
                                        runs: {
                                            'abc': {
                                                pipelineTaskName: 'taskname',
                                                status: {
                                                    conditions: [
                                                        {
                                                            status: "status"
                                                        }
                                                    ]
                                                }
                                            }
                                        },
                                        pipelineSpec: {
                                            tasks: [
                                                {
                                                    name: 'taskname',
                                                    taskRef: {
                                                        apiVersion: 'serval.dev/v1',
                                                        kind: 'Wait',
                                                        params: [
                                                            { name: 'a', value: 'b' }
                                                        ]
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    });
                }
            }
            prh.getRunsPerNamespace(item => {
                expect(item[0].run).to.eq('run1');
                expect(item[0].status.status).to.eq('status');
                expect(item[0].runStatus).to.eq('unknown');
                done();
            }, ['Wait'])
        });
    });
});