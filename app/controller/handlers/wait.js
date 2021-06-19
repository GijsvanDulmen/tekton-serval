const CustomTaskHandler = require('../lib/customTaskHandler')
const PipelineRunHandler = require('../lib/pipelineRunHandler')

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers) => {
    handlers.addHandler('Wait', params => {
        return new Promise((res, rej) => {
            setTimeout(() => res({}), parseFloat(params.waitFor)*1000);
        });
    }, [
        { name: 'waitFor' }
    ], 'wait');
};