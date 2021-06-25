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

    getFromAnnotations(prefix, paramSpec, params, metadata) {
        if ( paramSpec.sources.indexOf('pipelinerun') != -1 ) {
            if ( metadata.annotations ) {
                Object.keys(metadata.annotations).forEach(key => {
                    if ( key == 'serval.dev/'+prefix+"-"+paramSpec.name ) {
                        params[paramSpec.name] = metadata.annotations[key];
                    }
                });
            }
        }
        return params;
    }

    getFromPipelineRunParameters(prefix, paramSpec, params, spec) {
        if ( paramSpec.sources.indexOf('pipelinerun') != -1 ) {
            if ( spec && spec.params ) {
                spec.params.forEach(param => {
                    if ( param.name == 'serval-dev-'+prefix+"-"+paramSpec.name ) {
                        params[paramSpec.name] = param.value;
                    }
                })
            }
        }
        return params;
    }

    getFromSecret(prefix, paramSpec, params, secret) {
        if ( paramSpec.sources.indexOf('namespace-secret') != -1 ) {
            Object.keys(secret).forEach(key => {
                if ( key == prefix+"-"+paramSpec.name ) {
                    params[paramSpec.name] = secret[key];
                }
            });
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
        params = this.getFromSecret(prefix, paramSpec, params, secret);
        
        // check if there is an annotation
        params = this.getFromAnnotations(prefix, paramSpec, params, metadata);

        // check if there is an annotation
        params = this.getFromPipelineRunParameters(prefix, paramSpec, params, spec);

        return params;
    }
}