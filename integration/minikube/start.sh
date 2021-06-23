#!/bin/bash

set -e exit

minikube -p tekton-serval start --memory=4096 --cpus=2 --vm=true

kubectl create namespace pipelines
kubectl apply --filename https://storage.googleapis.com/tekton-releases/pipeline/latest/release.yaml

kubectl apply --filename ../feature.yaml