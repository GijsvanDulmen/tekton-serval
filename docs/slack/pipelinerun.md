# Slack - PipelineRun Notifier
This tasks can be helpfull to just simply notify the status of your pipelinerun.
It uses the webhook URL and not the Bot API. It will monitor your pipeline run
and send notifications 

Use it like this:
```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: slack-run
  annotations:
    # this annotation enables notifications
    serval.dev/monitor-run: 'slack'

    # could be in a secret obviously
    serval.dev/slack-channel: "#team-channel"

    # you can optionally alter the notification messages
    # "$name" will be replaced with the name of your pipelinerun
    serval.dev/slack-runStarted: ":alarm_clock: Run $name Started"
    serval.dev/slack-runSucceeded: ":partying_face: Run Succeeded"
    serval.dev/slack-runCancelled: ":boom: Run Cancelled"
    serval.dev/slack-runFailed: ":boom: Run Failed"
spec:
  # your pipeline over here
```