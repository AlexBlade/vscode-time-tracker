import moment from 'moment';
import 'moment-duration-format';
import path from 'path';
import * as vscode from 'vscode';
import { TimeTracker } from './tracker/TimeTracker';
import { TimeTrackerState } from './tracker/TimeTrackerState';

const tracker: TimeTracker = new TimeTracker();
let statusBarItem: vscode.StatusBarItem;

const ICON_STARTED = '$(debug-start)';
const ICON_STOPPED = '$(debug-stop)';
const ICON_PAUSED = '$(debug-pause)';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('timetracker.start', ( ) => {
			if (tracker.start(updateStatusBarItem)) {
				updateStatusBarItem(tracker);
			}
		}),
		vscode.commands.registerCommand('timetracker.stop', () => {
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
		})
	);

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);

	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(() => {
			reactOnActions();
		}),
		vscode.window.onDidChangeActiveTextEditor (() => {
			reactOnActions();
		}),
		vscode.window.onDidChangeTextEditorSelection ((e) => {
			if (path.basename(e.textEditor.document.fileName) !== tracker.dataFileName) {
				reactOnActions();
			}
		})
	);

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

		const currentSessionTime = moment.duration(currentSessionSeconds, 's').format('hh:mm:ss', {trim: false});
		const totalTime = moment.duration(totalSeconds, 's').format('hh:mm', {trim: false});

		statusBarItem.text = `${icon} ${state}   Total: ${totalTime}   Current session: ${currentSessionTime}`;
	}
}

export function deactivate() {
	tracker.stop();
}
