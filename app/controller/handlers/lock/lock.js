const CustomTaskHandler = require('../../lib/customTaskHandler');
const PipelineRunHandler = require('../../lib/pipelineRunHandler');

const Interval = require('./interval');
const Viewer = require('./viewer');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {

    const interval = new Interval();

    // only check every 20 secs if the lock should 
    // still be there. reduces stress on api server.
    // needs to be optimized based on events triggering
    // currently only new tasks and unlocks trigger it
    interval.timer(20);

    interval.attach(() => {

        runHandlers.getRunsPerNamespace((runs, namespace) => {
            if ( runs.length == 0 ) {
                return; // no runs over here
            }

            const viewer = new Viewer(runs.filter(run => run.runStatus == 'started'))
            viewer.getLockNames().forEach(name => {
                if ( !viewer.isLockedFor(name) ) {
                    const oldest = viewer.getNextToLock(name);
                    if ( oldest != undefined ) {
                        handlers.patchCustomTaskResource(namespace, oldest.id, handlers.getSuccessPatch([]));
                    }
                }
            });
        // filter on Lock and Unlock
        }, ['Lock', 'Unlock']);
    });
    interval.start();

    handlers.addHandler('Lock', params => {
        logger.info("received lock %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        interval.activate();

        return Promise.resolve(false);
    }, [
        { name: 'name' }
    ], 'lock');

    handlers.addHandler('Unlock', params => {
        logger.info("received unlock %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        interval.activate();
        return Promise.resolve({}); // can be done instantly
    }, [
        { name: 'name' }
    ], 'lock');
};