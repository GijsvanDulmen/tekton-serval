var expect = require('chai').expect;
const TaskRunMonitor = require('../lib/taskRunMonitor');

describe('TaskRunMonitor', function () {
    describe('isServalApiVersion', function () {
        const trm = new TaskRunMonitor();

        it('should provide unknown', function () {
            expect(trm.getReason({})).to.eq("unknown");
            expect(trm.getReason({ status: {} })).to.eq("unknown");
            expect(trm.getReason({ status: { conditions:[] } })).to.eq("unknown");
            expect(trm.getReason({ status: { conditions:[{}] } })).to.eq("unknown");
        });

        it('should provide running', function () {
            expect(trm.getReason({ status: { conditions:[{ reason: 'Started' }] } })).to.eq("running");
            expect(trm.getReason({ status: { conditions:[{ reason: 'Pending' }] } })).to.eq("running");
            expect(trm.getReason({ status: { conditions:[{ reason: 'Running' }] } })).to.eq("running");
        });

        it('should provide cancelled', function () {
            expect(trm.getReason({ status: { conditions:[{ reason: 'TaskRunCancelled' }] } })).to.eq("cancelled");
        });

        it('should provide failed', function () {
            expect(trm.getReason({ status: { conditions:[{ reason: 'Failed' }] } })).to.eq("failed");
        });

        it('should provide succeeded', function () {
            expect(trm.getReason({ status: { conditions:[{ reason: 'Succeeded' }] } })).to.eq("succeeded");
        });
    });

    describe('processPipelineRun', function () {
        const trm = new TaskRunMonitor();

        it('should emit created', function (done) {
            trm.on('created', () => {
                done();
            });

            expect(trm.processPipelineRun({
                status: {
                    taskRuns: {
                        'abc': {
                            status: {
                                conditions:[{ reason: 'Pending' }]
                            }
                        }
                    }
                }
            }));
        });

        it('should emit updated', function (done) {
            trm.on('updated', () => {
                done();
            });

            expect(trm.processPipelineRun({
                status: {
                    taskRuns: {
                        'abc': {
                            status: {
                                conditions:[{ reason: 'Succeeded' }]
                            }
                        }
                    }
                }
            }));
        });
    });
});