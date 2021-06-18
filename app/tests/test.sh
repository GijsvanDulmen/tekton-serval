#!/bin/bash
echo 'Starting test build... please wait a few seconds...'
export NAMESPACE="pipelines"

# export TEST="./run-github-status.yaml";
# export TEST="./run-slack.yaml";
# export TEST="./run-wait.yaml";
# export TEST="./run-microsoft-teams.yaml";

export TEST="./run-pipelinerun-slack.yaml";

export NAME=`kubectl -n ${NAMESPACE} create -f ${TEST} -o jsonpath='{.metadata.name}'`
sleep 2
tkn pipelinerun logs ${NAME} -n pipelines -f