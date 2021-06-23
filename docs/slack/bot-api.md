# Slack - Incoming Webhook URL
This is a single bot for all namespaces. This is probably
helpfull when multiple teams are on your cluster but you want to
prevent teams from setting up their own secrets.

# Step 1 - Serval Configmap
Setup the secret within Serval:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: serval
  namespace: serval
type: Opaque
stringData:
  # other settings over here
  SLACK_APP_TOKEN: "app token from slack api"
  SLACK_BOT_TOKEN: "app token from slack api"
```

# Step 2 - Configure which namespace can access which channel
Setup a configmap for Serval where you map each namespace to certain channels:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: serval-authorization
  namespace: serval
data:
  config: |
    {
      "github.installation.authorization": {
        
      },
      "slack.channel.authorization": {
        "team-namespace": ["#team-specific-channel", "#all-teams"]
      }
    } 
```

# Step 3 - Let teams use their tasks
No setting up secrets for the teams right now!
They can obviously choose to set their channel in a secret.
But having it as an annotations like this works as well:

```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: slack
  namespace: team-namespace
  annotations:
    serval.dev/slack-channel: "#team-specific-channel"
spec:
  pipelineSpec:
    tasks:
    - name: slack-notification
      taskRef:
        apiVersion: serval.dev/v1
        kind: SlackWrite
      params:
      - name: message
        value: ":ok_hand: Serval - TaskParam"
```
