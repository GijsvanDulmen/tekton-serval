const EventEmitter = require('events');

module.exports = class TaskRunMonitor extends EventEmitter {
    constructor() {
        super();
        this.taskruns = {};
    }

    getReason(obj) {
        if ( obj.status
            && obj.status.conditions
            && obj.status.conditions[0]
            && obj.status.conditions[0].reason ) {

            if ( obj.status.conditions[0].reason == 'Started'
                || obj.status.conditions[0].reason == 'Pending'
                || obj.status.conditions[0].reason == 'Running' ) {
                return 'running'
            } else if ( obj.status.conditions[0].reason == 'TaskRunCancelled' ) {
                return 'cancelled';
            } else if ( obj.status.conditions[0].reason == 'Failed' ) {
                return 'failed';
            } else if ( obj.status.conditions[0].reason == 'Succeeded' ) {
                return 'succeeded';
            }
        }
        return 'unknown';
    }

    processPipelineRun(obj) {
        if ( obj.status && obj.status.taskRuns ) {
            Object.keys(obj.status.taskRuns).forEach(taskRunKey => {
                if ( this.taskruns[taskRunKey] == undefined ) {
                    this.taskruns[taskRunKey] = obj.status.taskRuns[taskRunKey];
                    this.emit('created', taskRunKey);
                } else {
                    const oldStatus = this.getReason(this.taskruns[taskRunKey]);
                    const newStatus = this.getReason(obj.status.taskRuns[taskRunKey]);
                    if ( oldStatus != newStatus ) {
                        this.taskruns[taskRunKey] = obj.status.taskRuns[taskRunKey];
                        this.emit('updated', taskRunKey, newStatus, obj.status.taskRuns[taskRunKey], obj);
                    }
                }
            });
        }
    }
}