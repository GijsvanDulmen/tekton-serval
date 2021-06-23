# Microsoft Teams - Incoming Webhook URL
This is a single webhook URL per teams channel to send messages.

You would probably setup a secret like this:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: serval
  namespace: team-namespace
type: Opaque
stringData:
  microsoft-teams-webhookUrl: 'https://??.webhook.office.com/....'
```

From there on you can specify it in your task params like this:

```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: slack-run
  namespace: team-namespace
spec:
  pipelineSpec:
    tasks:
    - name: teams-notification
      taskRef:
        apiVersion: serval.dev/v1
        kind: TeamsNotification
      params:
      - name: message
        value: "Hello world!"
```