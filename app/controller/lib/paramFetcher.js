module.exports = class ParamFetcher {
    /**
     * 
     * @param {string} name 
     * @param {object} paramSpec 
     * @param {object} params 
     * @returns {object}
     */
     getFromEnvironment(name, paramSpec, params) {
        if ( paramSpec.sources.indexOf('env') != -1 ) {
            const envName = name.toUpperCase()+"_"+paramSpec.name.toUpperCase();
            if ( process.env[envName] != undefined ) {
                params[paramSpec.name] = process.env[envName];
            }
        }
        return params;
    }

    getFromAnnotations(prefix, paramSpec, params, metadata, extraPrefixes) {
        if ( paramSpec.sources.indexOf('pipelinerun') != -1 ) {
            if ( metadata.annotations ) {
                const doForPrefix = usePrefix => {
                    Object.keys(metadata.annotations).forEach(key => {
                        if ( key == 'serval.dev/'+usePrefix+"-"+paramSpec.name ) {
                            params[paramSpec.name] = metadata.annotations[key];
                        }
                    });
                };


                if ( extraPrefixes != undefined ) {
                    extraPrefixes.forEach(extraPrefix => doForPrefix(extraPrefix));
                }
                doForPrefix(prefix);
            }
        }
        return params;
    }

    getFromPipelineRunParameters(prefix, paramSpec, params, spec, extraPrefixes) {
        if ( paramSpec.sources.indexOf('pipelinerun') != -1 ) {
            if ( spec && spec.params ) {
                const doForPrefix = usePrefix => {
                    spec.params.forEach(param => {
                        if ( param.name == 'serval-dev-'+usePrefix+"-"+paramSpec.name ) {
                            params[paramSpec.name] = param.value;
                        }
                    })
                };
    
                if ( extraPrefixes != undefined ) {
                    extraPrefixes.forEach(extraPrefix => doForPrefix(extraPrefix));
                }
                doForPrefix(prefix);
            }
        }
        return params;
    }

    getFromSecret(prefix, paramSpec, params, secret, extraPrefixes) {
        if ( paramSpec.sources.indexOf('namespace-secret') != -1 ) {
            const doForPrefix = usePrefix => {
                Object.keys(secret).forEach(key => {
                    if ( key == usePrefix+"-"+paramSpec.name ) {
                        params[paramSpec.name] = secret[key];
                    }
                });
            };

            if ( extraPrefixes != undefined ) {
                extraPrefixes.forEach(extraPrefix => doForPrefix(extraPrefix));
            }
            doForPrefix(prefix);
        }
        return params;
    }

    getParam(prefix, paramSpec, params, secret, metadata, spec) {
        if ( paramSpec.default != undefined ) {
            params[paramSpec.name] = paramSpec.default;
        }

        // get from environment
        params = this.getFromEnvironment(prefix, paramSpec, params);

        // get from environment
        params = this.getFromSecret(prefix, paramSpec, params, secret, paramSpec.extraPrefixes);
        
        // check if there is an annotation
        params = this.getFromAnnotations(prefix, paramSpec, params, metadata, paramSpec.extraPrefixes);

        // check if there is an annotation
        params = this.getFromPipelineRunParameters(prefix, paramSpec, params, spec, paramSpec.extraPrefixes);

        return params;
    }
}