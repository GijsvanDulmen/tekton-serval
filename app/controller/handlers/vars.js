const CustomTaskHandler = require('../lib/customTaskHandler');
const PipelineRunHandler = require('../lib/pipelineRunHandler');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {
    handlers.addHandler('SetVar', params => {
        logger.info("setting var %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        return handlers.patchFieldInConfigmap('serval-vars', params.runNamespace, params.name, params.value)
            .then(() => {});
    }, [
        { name: 'name' }, { name: 'value' }
    ], 'vars');

    handlers.addHandler('GetVar', params => {
        logger.info("getting var %s for %s in ns %s", params.name, params.runName, params.runNamespace);

        return new Promise((res, rej) => {
            handlers.getFieldFromConfigmap('serval-vars', params.runNamespace, params.name)
                .then(value => {
                    res({ output: value })
                })
                .catch(err => {
                    rej("no variable available for: " + params.name);
                })
        });
    }, [
        { name: 'name' }
    ], 'vars');

    numericAdd = (toAdd, params) => {
        return new Promise((res, rej) => {
            handlers.getFieldFromConfigmap('serval-vars', params.runNamespace, params.name)
                .then(value => {
                    const newValue = (parseInt(value)+toAdd).toString();
                    handlers.patchFieldInConfigmap('serval-vars', params.runNamespace, params.name, newValue)
                        .then(() => res({
                            output: newValue
                        }))
                        .catch(err => {
                            rej("could not add to: " + params.name);
                        })
                })
                .catch(err => {
                    rej("no variable available for: " + params.name);
                })
        });
    };

    handlers.addHandler('IncrementVar', params => {
        logger.info("increment var %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        return numericAdd(1, params);
    }, [
        { name: 'name' }
    ], 'vars');

    handlers.addHandler('DecrementVar', params => {
        logger.info("decrement var %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        return numericAdd(-1, params);
    }, [
        { name: 'name' }
    ], 'vars');
};