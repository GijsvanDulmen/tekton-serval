const CustomTaskHandler = require('../lib/customTaskHandler');
const PipelineRunHandler = require('../lib/pipelineRunHandler');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {
    const timers = {};

    handlers.addHandler('StartTiming', params => {
        logger.info("start timing %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        timers[params.runNamespace+"-"+params.name] = Date.now();
        return Promise.resolve({});
    }, [
        { name: 'name' }
    ], 'timing');

    
    handlers.addHandler('GetTiming', params => {
        logger.info("get timing %s for %s in ns %s", params.name, params.runName, params.runNamespace);

        if ( timers[params.runNamespace+"-"+params.name] ) {
            const diff = Math.round((Date.now() - timers[params.runNamespace+"-"+params.name]) / 1000);
            const minutes = Math.floor(diff / 60);
            const seconds = diff - (minutes * 60);

            const results = {
                seconds: (Math.round(diff/60)).toString(),
                output: minutes+"m"+seconds+"s"
            };

            return Promise.resolve(results);
        } else {
            return Promise.reject("no such timing variable");
        }
    }, [
        { name: 'name' }
    ], 'timing');
};