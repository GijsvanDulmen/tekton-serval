module.exports = class Interval {
    constructor() {
        this.callbacks = [];
        
        this.eachSeconds = 5;
        this.next = Date.now();
    }

    attach(callback) {
        this.callbacks.push(callback);
    }

    setNext(secs) {
        this.next = Date.now() + (secs*1000);
    }

    activate() {
        if ( this.next + 1000 > Date.now() ) {
            this.setNext(1);
        }
    }

    timer(eachSeconds) {
        if ( this.next == undefined ) {
            this.setNext(eachSeconds);
        }
        this.eachSeconds = eachSeconds;
    }

    start() {
        this.interval = setInterval(() => {
            if ( this.next < Date.now() ) {
                this.callbacks.forEach(cb => cb());
                this.setNext(this.eachSeconds);
            }
        }, 1000);
    }
}