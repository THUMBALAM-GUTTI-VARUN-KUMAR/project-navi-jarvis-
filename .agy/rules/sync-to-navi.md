# Sync backup to C:\navi

Whenever you make significant code changes or finish a phase/task for the user, you MUST sync the latest updates to `C:\navi`.

Use the following Robocopy command to sync the repository while ignoring `node_modules` and system folders to save time:

```powershell
robocopy C:\Users\varun\antigravity\Navi-2026-07-31-e9a75 C:\navi /MIR /XD node_modules .git .system_generated
```

Note: `robocopy` exit codes under 8 mean success (e.g. 1 means files were copied). Do not be alarmed by a non-zero exit code if it's less than 8.
