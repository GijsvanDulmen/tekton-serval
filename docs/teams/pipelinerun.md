# Microsoft Teams - PipelineRun Notifier
This tasks can be helpfull to just simply notify the status of your pipelinerun.
It will monitor your pipeline run and send notifications. It assumes you have the
secret setup in the same way as the messaging for Microsoft Teams.

Use it like this:
```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: teams-run
  annotations:
    # this annotation enables notifications
    serval.dev/monitor-run: 'microsoft-teams'

    # you can optionally alter the notification messages
    # "$name" will be replaced with the name of your pipelinerun
    serval.dev/microsoft-teams-runStarted: "Run $name Started"
    serval.dev/microsoft-teams-runSucceeded: "Run Succeeded"
    serval.dev/microsoft-teams-runCancelled: "Run Cancelled"
    serval.dev/microsoft-teams-runFailed: "Run Failed"
spec:
  # your pipeline over here
```