# Serval - Faster  tasks

If Tekton Tasks are too much overhead on your cluster and you want faster tasks handling for API calls like Slack, Microsoft Teams and Github Status.
It uses the Tekton Custom Tasks functionality for speeding up common tasks in pipelines. It supports the following tasks, sometimes this includes
namespace based authorization for multi tenant setups.

## Slack
- Message through Webhook URL
- Message through Web API with bot token
- Approval task (reject/approve)
- Pipeline Run status monitoring

## Microsoft Teams
- Microsoft Teams notification through Webhook URL
- Microsft Teams Pipeline Run status monitoring

## Github support through Github App
- Commit Status Pipeline Run status synchronizer
- Open/Update Pull Request
- Assign reviewers to Pull Request
- Add comment to Pull Request
- Create Deployment
- Update Deployment Status

Checkout the `integration/tests/tests` directory for some examples on how to configure those tasks.

# Multiple options for parameters
Besides having parameters added to your task like this:
```yaml
    - name: slack-notification
      taskRef:
        apiVersion: serval.dev/v1
        kind: SlackNotification
      params:
      - name: channel
        value: "#tekton-dev"
      - name: message
        value: ":ok_hand: Hi!"
```

You can also upgrade to PipelineRun parameters which will be used within all tasks in the pipeline run:
```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: serval
  namespace: pipelines
  annotations:
    serval.dev/slack-channel: "#tekton-dev"
spec:
  timeout: "0h0m10s"
  pipelineSpec:
    tasks:
    - name: slack-notification
      taskRef:
        apiVersion: serval.dev/v1
        kind: SlackNotification
      params:
      - name: message
        value: ":ok_hand: Hi!"
```

If you want to set parameters for all your pipelines. You can even upgrade to a secret like this:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: serval
  namespace: pipelines
type: Opaque
stringData:
  slack-channel: '#tekton-dev'
```
Make sure the secret is named `serval`. This is the only secret Serval has acccess to in your namespace.
This is really helpfull when you also want to to configure tokens for Slack.

If all else fails, for certain parameters you can also add environment variables to the Serval controller deployment.

## Namespace Authorization
Because Slack and Github are using broad scoped tokens and interactions it's possible to configure which namespace
is capable of using which Installation ID (for Github App) or which Slack Channel one can use. To configure namespace
authorization add the following configmap to the `serval` namespace (where the controller also is installed).

```
apiVersion: v1
kind: ConfigMap
metadata:
  name: serval-authorization
  namespace: serval
data:
  config: |
    {
      "github.installation.authorization": {
        "pipelines": ["17456888"]
      },
      "slack.channel.authorization": {
        "pipelines": ["#tekton-dev", "#serval"]
      }
    } 
```

# Installation
Currently it is in development. 
