#!/bin/bash

set -e exit

echo 'Starting test build... please wait a few seconds...'
export NAMESPACE="pipelines"

TESTS="./tests/*"
i=0
for test in $TESTS
do
  echo "Processing ${test} test..."

  export NAME=`kubectl -n ${NAMESPACE} create -f ${test} -o jsonpath='{.metadata.name}'`
  kubectl -n ${NAMESPACE} wait --for=condition=Succeeded --timeout=4s pipelinerun/${NAME}
  kubectl -n ${NAMESPACE} delete pipelinerun/${NAME}
  ((i=i+1))
done

echo "${i} Tests passed!"