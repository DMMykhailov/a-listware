@echo off
REM Windows wrapper – delegates to the cross-platform Node.js simulator.
node "%~dp0simulate-job.js" %*
