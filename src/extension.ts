import moment from 'moment';
import 'moment-duration-format';
import path from 'path';
import * as vscode from 'vscode';
import { TimeTracker } from './tracker/TimeTracker';
import { TimeTrackerState } from './tracker/TimeTrackerState';
import fs from 'fs';

const tracker: TimeTracker = new TimeTracker();
let statusBarItem: vscode.StatusBarItem;

const ICON_STARTED = '$(watch)';
const ICON_STOPPED = '';
const ICON_PAUSED = '$(debug-pause)';

const COMMAND_START = "timetracker.start"
const COMMAND_STOP = "timetracker.stop"

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_START, () => {
			if (tracker.start(updateStatusBarItem)) {
				updateStatusBarItem(tracker);
			}
		}),
		vscode.commands.registerCommand(COMMAND_STOP, () => {
			if (tracker.stop()) {
				updateStatusBarItem(tracker);
			}
		}),
		vscode.commands.registerCommand('timetracker.pause', () => {
			if (tracker.state === TimeTrackerState.Started) {
				if (tracker.pause()) {
					updateStatusBarItem(tracker);
				}
			}
		}),
		vscode.commands.registerCommand('timetracker.recompute', () => {
			if (tracker.recompute()) {
				updateStatusBarItem(tracker);
			}
		})
	);

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);

	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(() => {
			reactOnActions();
		}),
		vscode.window.onDidChangeActiveTextEditor(() => {
			reactOnActions();
		}),
		vscode.window.onDidChangeTextEditorSelection((e) => {
			if (path.basename(e.textEditor.document.fileName) !== tracker.dataFileName) {
				reactOnActions();
			}
		})
	);

	const config = vscode.workspace.getConfiguration('timetracker');

	const autoStartTimeTracking = config.autostart.autoStartTimeTracking;
	const autoCreateTimeTrackingFile = config.autostart.autoCreateTimeTrackingFile;
	const askAboutStart = config.autostart.askAboutAutoStart;

	const rootFolder = vscode.workspace.rootPath;

	//vscode.window.showWarningMessage(rootFolder + ' ' + autoStartTimeTracking + ' ' + autoStartTimeTracking);

	if (autoStartTimeTracking) {
		if (autoCreateTimeTrackingFile) {
			if (askAboutStart) {
				vscode.window.showInformationMessage("Do you want to create time tracker storage and start time tracking?", "Yes", "No").then(value => {
					if (value === "Yes") {
						tracker.start(updateStatusBarItem);
					}
				});
			} else {
				tracker.start(updateStatusBarItem);
			}
		} else {
			if (rootFolder) {
				const filePath = path.join(rootFolder, tracker.dataFileName);
				if (fs.existsSync(filePath)) {
					if (askAboutStart) {
						vscode.window.showInformationMessage("Do you want to start time tracking?", "Yes", "No").then(value => {
							if (value === "Yes") {
								tracker.start(updateStatusBarItem);
							}
						});
					} else {
						tracker.start(updateStatusBarItem);
					}
				}
			}
		}
	}

	updateStatusBarItem(tracker);
}

function reactOnActions() {
	switch (tracker.state) {
		case TimeTrackerState.Started:
			tracker.resetIdleTime();
			break;
		case TimeTrackerState.Paused:
			tracker.continue();
			break;
		case TimeTrackerState.Stopped:
			break;
	}
}

function updateStatusBarItem(timeTracker: TimeTracker) {
	const data = timeTracker.trackedData;
	if (data) {
		const currentSessionSeconds = tracker.currentSession?.currentDuration() ?? 0;
		const totalSeconds = data.totalTime + currentSessionSeconds;
		const icon = timeTracker.state === TimeTrackerState.Started ? ICON_STARTED : timeTracker.state === TimeTrackerState.Stopped ? ICON_STOPPED : ICON_PAUSED;
		const state = timeTracker.state === TimeTrackerState.Started ? 'Active' : timeTracker.state === TimeTrackerState.Stopped ? 'Inactive' : 'Paused';

		const currentSessionTime = moment.duration(currentSessionSeconds, 's').format('hh:mm:ss', { trim: false });
		const totalTime = moment.duration(totalSeconds, 's').format('hh:mm', { trim: false });

		statusBarItem.text = `${icon}${totalTime}+${currentSessionTime}`;
		statusBarItem.tooltip = `State: ${state} Total: ${totalTime} Current session: ${currentSessionTime}`;
		statusBarItem.command = timeTracker.state === TimeTrackerState.Started ? COMMAND_STOP : COMMAND_START;
	}
}

export function deactivate() {
	tracker.stop();
}
