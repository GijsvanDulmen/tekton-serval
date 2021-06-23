#!/bin/bash
export NAMESPACE=pipelines
tkn -n ${NAMESPACE} hub install task git-clone --version 0.4
tkn -n ${NAMESPACE} hub install task kaniko --version 0.4
tkn -n ${NAMESPACE} hub install task npm --version 0.1
kubectl apply -f ./keys/
kubectl apply -f ./rbac.yaml