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
});