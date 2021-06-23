#!/bin/bash
export NAMESPACE=pipelines
echo 'Starting build... please wait a few seconds...'
export NAME=`kubectl -n ${NAMESPACE} create -f ./build.yaml -o jsonpath='{.metadata.name}'`
sleep 2
tkn pipelinerun logs ${NAME} -n ${NAMESPACE} -f