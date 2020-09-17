# Time Tracker
<img src="res/icon.png" style="float: left; margin-right: 20px"/>The <span style="font-weight: bold; color: #00cccc">Time Tracker</span> extenstion will track your time spent during coding in the **Visual Studio Code**. Just start it in the beginning of your work using `Ctrl+Shift+P` and selecting `Time Tracker:Start`.

All time of activity which was spent on your work will be saved in `.timetracking` dot-file. You can push it to the GIT repo with your code to track time on all your devices.

Time Tracker will stop count the time after 2 minutes of inactivity and will move to the `Paused` state. Just begin edit code, switch editor tabs or open files and Time Tracker will resume work.

The Time Tracker visualizes its work on the status bar and displays info is described below:

![](res/status-bar-panel.png)

* Activity states
    * `Active` - The Time Tracker is active and counting time
    * `Inactive` - The Time Tracker is stopped and is not counting time. It will not start after edtiing or openning file
    * `Paused` - The Time Tracker is paused and is not counting time but will start just with beginning of your activity.
* Total time is spent on the project
* Current session time: The time since the last pause or since `Time tracking:Start` performing.

## Commands

Use `Ctrl+Shift+P` to execute Time Tracker commands.
* `Time Tracker: Start` - Activate time tracking
* `Time Tracker: Pause` - Pause time tracking
* `Time Tracker: Stop` - Deactivate time tracking

## Configuration

Configuration will be provided in the next releases. Currently planned and developed configuration items:
* Idle time configuration to enable set up inactivity time before time tracking pausing
* Exclusions to make possible to do not track some files editing