const CustomTaskHandler = require('../lib/customTaskHandler');
const PipelineRunHandler = require('../lib/pipelineRunHandler');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {

    let vars = {};

    handlers.addHandler('SetVar', params => {
        logger.info("setting var %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        vars[params.runNamespace+"-"+params.name] = params.value;
        return Promise.resolve();
    }, [
        { name: 'name' }, { name: 'value' }
    ], 'vars');

    handlers.addHandler('GetVar', params => {
        logger.info("getting var %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        if ( vars[params.runNamespace+"-"+params.name] != undefined ) {
            return Promise.resolve({ output: vars[params.runNamespace+"-"+params.name] });
        } else {
            return Promise.reject("no variable available for: " + params.name)
        }
    }, [
        { name: 'name' }
    ], 'vars');
};