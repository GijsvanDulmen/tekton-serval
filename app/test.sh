#!/bin/bash
export NAMESPACE="pipelines"
kubectl -n ${NAMESPACE} apply -f ./custom.yaml
echo 'Starting test build... please wait a few seconds...'
export NAME=`kubectl -n ${NAMESPACE} create -f ./run.yaml -o jsonpath='{.metadata.name}'`
sleep 2
tkn pipelinerun logs ${NAME} -n pipelines -f