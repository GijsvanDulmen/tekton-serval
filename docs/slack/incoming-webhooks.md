# Slack - Incoming Webhook URL
This is a single webhook URL per channel to send messages.
Ideally suited for teams managing their own slack channel.

You would probably setup a secret like this:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: serval
  namespace: team-namespace
type: Opaque
stringData:
  slack-webhookUrl: 'https://hooks.slack.com/....'
  slack-channel: '#team-channel'

  # Optionally set these for the username of the bot
  # and the icon of the bot
  slack-username: 'TeamBot'
  slack-icon: ':tiger:'
```
And decide on which way you want to specify the channel. The secret above
sets a default in the secret to fallback. Probably this is a good way to go.

By specifying it in the task:
```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: slack-run
  namespace: team-namespace
spec:
  pipelineSpec:
    tasks:
    - name: slack-notification
      taskRef:
        apiVersion: serval.dev/v1
        kind: SlackNotification
      params:
      # override channel per task
      - name: channel
        value: "#tekton-dev"
      - name: message
        value: ":ok_hand: Hello world!"
```

Or in the pipelinerun annotations:
```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: slack-run
  namespace: team-namespace
  annotations:
    serval.dev/slack-channel: "#tekton-dev"
spec:
  pipelineSpec:
    tasks:
    - name: slack-notification
      taskRef:
        apiVersion: serval.dev/v1
        kind: SlackNotification
      params:
      - name: message
        value: ":ok_hand: Hello world!"
```
