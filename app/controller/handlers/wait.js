const CustomTaskHandler = require('../lib/customTaskHandler'); // eslint-disable-line no-unused-vars
const PipelineRunHandler = require('../lib/pipelineRunHandler'); // eslint-disable-line no-unused-vars

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {
    handlers.addHandler('Wait', params => {
        const waitFor = parseFloat(params.waitFor)*1000;
        logger.info("waiting %s seconds for %s in ns %s", waitFor, params.runName, params.runNamespace);

        return new Promise(res => {
            setTimeout(() => res({}), waitFor);
        });
    }, [
        { name: 'waitFor' }
    ], 'wait');
};