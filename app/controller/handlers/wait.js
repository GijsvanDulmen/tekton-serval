module.exports = handlers => {
    handlers.addHandler('Wait', params => {
        return new Promise((res, rej) => {
            let timeout;
    
            params.forEach(param => {
                if ( param.name == 'waitFor' ) {
                    timeout = parseFloat(param.value)*1000;
                }
            })
    
            if ( timeout != undefined ) {
                setTimeout(() => res(true), timeout);
            } else {
                rej("No wait for parameter");
            }
        });
    });
};