module.exports = handlers => {
    handlers.addHandler('Wait', params => {
        return new Promise((res, rej) => {
            setTimeout(() => res(true), parseFloat(param.waitFor)*1000);
        });
    }, [
        { name: 'waitFor' }
    ], 'wait');
};