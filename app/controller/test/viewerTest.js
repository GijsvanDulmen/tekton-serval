var expect = require('chai').expect;
const Viewer = require('../handlers/lock/viewer');

describe('Viewer', function () {
    
    const completedStatus = {
        completionTime: '2021-06-25T10:14:01Z',
        conditions: [
          {
            lastTransitionTime: '2021-06-25T10:14:01Z',
            message: 'Successfull',
            reason: 'Successfull',
            status: 'True',
            type: 'Succeeded'
          }
        ],
        extraFields: null,
        startTime: '2021-06-25T10:14:01Z'
    };

    const lockA = {
        "name": "lockA"
    };

    // runA
    const notCompletedLock = { "kind": "Lock", "status": {}, "params": lockA, run: "a" };
    const notCompletedUnlock = { "kind": "Unlock", "status": {}, "params": lockA, run: "a" };

    const completedLock = { "kind": "Lock", "status": completedStatus, "params": lockA, run: "a" };
    const completedUnlock = { "kind": "Unlock", "status": completedStatus, "params": lockA, run: "a" };

    // runB
    const notCompletedLockRunB = { "kind": "Lock", "status": {}, "params": lockA, run: "b" };
    const notCompletedUnlockRunB = { "kind": "Unlock", "status": {}, "params": lockA, run: "b" };

    const completedLockRunB = { "kind": "Lock", "status": completedStatus, "params": lockA, run: "b" };
    const completedUnlockRunB = { "kind": "Unlock", "status": completedStatus, "params": lockA, run: "b" };

    const invalidLock = { "kind": "Lock", "status": {}, "params": [] };

    describe('getLockNames', function () {
        it('should produce lock names', function () {
            const v = new Viewer([notCompletedLock, notCompletedUnlock, invalidLock]);
            expect(v.getLockNames().length).to.eq(1);
            expect(v.getLockNames()[0]).to.eq('lockA');
        });
    });

    describe('filterByLockName', function () {
        it('should filter by lock name', function () {
            const v = new Viewer([notCompletedLock, notCompletedUnlock, invalidLock]);
            expect(v.filterByLockName('lockA').length).to.eq(2);
            expect(v.filterByLockName('lockB').length).to.eq(0);
        });
    });

    describe('isLockedFor', function () {
        it('should check if not locked', function () {
            const v = new Viewer([]);
            expect(v.isLockedFor('lockA')).to.eq(false);
        });

        it('should check if not locked', function () {
            const v = new Viewer([notCompletedLock]);
            expect(v.isLockedFor('lockA')).to.eq(false);
        });

        it('should check if locked', function () {
            const v = new Viewer([completedLock, notCompletedUnlock]);
            expect(v.isLockedFor('lockA')).to.eq(true);
        });

        it('should check if locked - wrong order', function () {
            const v = new Viewer([notCompletedUnlock, completedLock]);
            expect(v.isLockedFor('lockA')).to.eq(true);
        });

        it('should check if unlocked after complete lock cycle', function () {
            const v = new Viewer([completedLock, completedUnlock]);
            expect(v.isLockedFor('lockA')).to.eq(false);
        });

        it('should check if locked after complete lock cycle', function () {
            const v = new Viewer([completedLock, completedUnlock, completedLockRunB]);
            expect(v.isLockedFor('lockA')).to.eq(true);
        });

        it('should check if locked after complete lock cycle - wrong order', function () {
            const v = new Viewer([notCompletedLockRunB, completedUnlock, completedLock]);
            expect(v.filterCompletedLockUnlockCycles('lockA').length).to.eq(1);
            expect(v.isLockedFor('lockA')).to.eq(false);
        });

        it('should check if locked after complete lock cycle', function () {
            const v = new Viewer([completedLock, completedUnlock, notCompletedLockRunB]);
            expect(v.isLockedFor('lockA')).to.eq(false);
        });

        it('should check if locked after two complete lock cycle', function () {
            const v = new Viewer([completedLock, completedUnlock, completedLockRunB, completedUnlockRunB]);
            expect(v.isLockedFor('lockA')).to.eq(false);
        });
    });
});