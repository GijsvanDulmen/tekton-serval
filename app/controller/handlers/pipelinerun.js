const CustomTaskHandler = require('../lib/customTaskHandler');
const PipelineRunHandler = require('../lib/pipelineRunHandler');

/**
 * 
 * @param {CustomTaskHandler} handlers 
 * @param {PipelineRunHandler} runHandlers 
 */
module.exports = (handlers, runHandlers, logger) => {

    const updateStatus = (name, runName, runNamespace, newStatus) => {
        runHandlers.getRunsForNamespace(runNamespace, run => {
            // filter out our own run
            if ( run.metadata.name != runName ) {
                // if already stopped don't process
                if ( run.status && run.status.completionTime ) {
                    return;
                }

                // check annotations
                if ( run.metadata.annotations ) {
                    Object.keys(run.metadata.annotations).forEach(key => {
                        if ( key == 'serval.dev/pipelinerun-name' ) {
                            if ( run.metadata.annotations[key] == name ) {
                                runHandlers.updateRunStatus(runNamespace, run.metadata.name, newStatus).catch(err => {
                                    logger.error("error cancelling pipelinerun in %s on %s", runNamespace, run.metadata.name);
                                    logger.error(err);
                                });
                            }
                        }
                    })
                }
            }
        });
    };


    handlers.addHandler('CancelPipeline', params => {
        logger.info("cancel pipeline %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        updateStatus(params.name, params.runName, params.runNamespace, 'PipelineRunCancelled');
        return Promise.resolve();
    }, [
        { name: 'name' }
    ], 'pipelinerun');

    handlers.addHandler('GracefullyCancelPipeline', params => {
        logger.info("cancel gracefully pipeline %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        updateStatus(params.name, params.runName, params.runNamespace, 'CancelledRunFinally');
        return Promise.resolve();
    }, [
        { name: 'name' }
    ], 'pipelinerun');

    handlers.addHandler('GracefullyStopPipeline', params => {
        logger.info("stopping gracefully pipeline %s for %s in ns %s", params.name, params.runName, params.runNamespace);
        updateStatus(params.name, params.runName, params.runNamespace, 'StoppedRunFinally');
        return Promise.resolve();
    }, [
        { name: 'name' }
    ], 'pipelinerun');
};