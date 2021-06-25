const { V1beta1RunAsUserStrategyOptions } = require("@kubernetes/client-node");

module.exports = class Viewer {
    constructor(generifiedRuns) {
        this.runs = generifiedRuns;
    }

    getLockNames() {
        let names = [];
        this.runs.forEach(run => {
            if ( run.params.name && names.indexOf(run.params.name) == -1 ) {
                names.push(run.params.name)
            }
        });
        return names;
    }

    filterByLockName(name) {
        let filteredRuns = [];
        this.runs.forEach(run => {
            if ( run.params.name && run.params.name == name ) {
                filteredRuns.push(run);
            }
        });
        return filteredRuns;
    }

    isCompletedRun(run) {
        return run.status
            && Object.keys(run.status).length > 0
            && run.status.completionTime != undefined;
    }

    filterCompletedLockUnlockCycles(name) {
        const sameLocks = this.filterByLockName(name);
        
        // filter out
        const locks = {};
        const unlocks = {};

        // process locks
        sameLocks.forEach(run => {
            if ( run.kind == 'Lock') {
                locks[run.run] = {
                    run: run,
                    completed: this.isCompletedRun(run)
                };
            }
        });

        // process unlocks
        sameLocks.forEach(run => {
            if ( run.kind == 'Unlock' ) {
                if ( this.isCompletedRun(run) ) {
                    if ( locks[run.run] != undefined ) {
                        delete locks[run.run];
                    }
                } else {
                    unlocks[run.run] = {
                        run: run
                    };
                }
            }
        });

        return [...Object.values(locks), ...Object.values(unlocks)].map(r => r.run);
    }

    isLockedFor(name) {
        return this.filterCompletedLockUnlockCycles(name)
            .filter(run => this.isCompletedRun(run)).length > 0;
    }

    // assumes no lock!
    getNextToLock(name) {
        const filtered = this.filterCompletedLockUnlockCycles(name);
        
        // get oldest
        let oldest = undefined;
        filtered.forEach(run => {
            if ( oldest == undefined || oldest.runStart < run.runStart ) {
                oldest = run;
            }
        });
        return oldest;
    }
}