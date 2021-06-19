#!/bin/bash
TOKENNAME=`kubectl -n serval get serviceaccount/serval -o jsonpath='{.secrets[0].name}'`
TOKEN=`kubectl -n serval get secret $TOKENNAME -o jsonpath='{.data.token}'| base64 --decode`
echo ${TOKEN}

kubectl config set-credentials serval --token=${TOKEN}
kubectl config set-context serval-sa --cluster=tekton-serval --user=serval --namespace=serval