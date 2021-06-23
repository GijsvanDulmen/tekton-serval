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
            
        it('should not process completed runs', function () {
            expect(cth.isServalCustomTaskToProcess({ status: { completionTime: '123' } })).to.eq(false);
        });

        it('should process not completed runs', function () {
            expect(cth.isServalCustomTaskToProcess({ spec: { ref: { apiVersion: 'serval.dev/v1' } } })).to.eq(true);
        });

        it('should not process other runs', function () {
            expect(cth.isServalCustomTaskToProcess({ spec: { ref: { apiVersion: 'tekton.dev/v1' } } })).to.eq(false);
        });
    });

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
});