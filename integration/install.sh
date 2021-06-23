#!/bin/bash
kubectl apply -f feature.yaml # tekton config
kubectl apply -f serval.yaml
kubectl apply -f rbac.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets/
./install-serval-context.sh