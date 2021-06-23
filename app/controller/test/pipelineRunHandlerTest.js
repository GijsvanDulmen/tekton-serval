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
});