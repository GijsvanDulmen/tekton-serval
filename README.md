# Serval - Doing small things a bit faster

So your normal Tekton tasks are doing OK and are long running. But certain tasks are just too much overhead for spinning up an entire container.
Probably they finish within a second or so because they are only calling a single API. This is where Serval comes in and for those types of tasks
it makes it a lot faster. It uses the Custom Tasks functionality of Tekton and is purely meant for those single-shot short-running tasks.

It supports the following tasks, sometimes this includes namespace based authorization for multi tenant setups.

## Slack
Serval provides several ways of interacting with Slack:

- [Incoming webhook URL](./docs/slack/incoming-webhooks.md)
- [PipelineRun Notifier](./docs/slack/pipelinerun.md)
- [Bot Web API - Message](./docs/slack/bot-api.md)
- [Bot Web API - Approval](./docs/slack/approval.md)
## Microsoft Teams
- [Notification through Webhook URL](./docs/teams/message.md)
- [PipelineRun Notifier](./docs/teams/pipelinerun.md)

## Github support through Github App
- [Commit Status Pipeline Run status synchronizer](./integration/tests/tests/github-status-pipelinerun.yaml)
- [Open/Update Pull Request](./integration/tests/tests/github-pullrequest.yaml)
- [Assign reviewers to Pull Request](./integration/tests/tests/github-pullrequest.yaml)
- [Add comment to Pull Request](./integration/tests/tests/github-pullrequest.yaml)
- [Create Deployment](./integration/tests/tests/github-deployments.yaml)
- [Update Deployment Status](./integration/tests/tests/github-status.yaml)
- [Create/Update Checkrun](./integration/tests/tests/github-checkrun.yaml)

Checkout the `integration/tests/tests` directory for some examples on how to configure those tasks.

# Installation
Checkout the `install` directory for installation scripts. It's still in beta though, but usable!
Create your secret from the `secret.template` and apply `rbac.yaml` and `deployment.yaml` after
you applied the secret to your cluster.

# Multiple options for parameters
Besides having parameters added to your task like this:
```yaml
    - name: slack-notification
      taskRef:
        apiVersion: serval.dev/v1
        kind: SlackNotification
      params:
      - name: channel
        value: "#serval"
      - name: message
        value: ":ok_hand: Hi!"
```
Or like this (this doesn't support variable substition):
```yaml
    - name: slack-notification
      taskSpec:
        apiVersion: serval.dev/v1
        kind: SlackWrite
        spec:
          channel: "#serval"
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
    serval.dev/slack-channel: "#serval"
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
  slack-channel: '#serval'
```
Make sure the secret is named `serval`. This is the only secret Serval has acccess to in your namespace.
This is really helpfull when you also want to to configure tokens for Slack. Currently you need to
assign an RBAC rule for this authorization. Checkout [over here](https://github.com/GijsvanDulmen/tekton-serval/blob/main/integration/rbac.yaml).

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
        "your-namespace": ["17456888"]
      },
      "slack.channel.authorization": {
        "your-namespace": ["#serval"]
      }
    } 
```
