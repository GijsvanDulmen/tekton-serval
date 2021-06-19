#!/bin/bash
kind create cluster --config kind.yaml
kubectl cluster-info --context kind-tekton-serval

kubectl create namespace pipelines
kubectl apply -f https://storage.googleapis.com/tekton-releases/operator/latest/release.yaml

# only pipelines
kubectl apply -f https://raw.githubusercontent.com/tektoncd/operator/main/config/crs/kubernetes/config/lite/operator_v1alpha1_config_cr.yaml