import * as vscode from 'vscode';
import { TimeTracker } from './tracker/TimeTracker';
import moment from 'moment';
import 'moment-duration-format';
import { TimeTrackerState } from './tracker/TimeTrackerState';

const tracker: TimeTracker = new TimeTracker();
let statusBarItem: vscode.StatusBarItem;

const ICON_ACTIVE = '$(eye)';
const ICON_INACTIVE = '$(eye-closed)';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('timetracker.start', ( ) => {
			if (tracker.start(updateStatusBarItem)) {
//				vscode.window.showInformationMessage(`TimeTracker started at ${moment().format('DD.MM.YYYY HH:mm:ss')}`);
				updateStatusBarItem(tracker);
			}
		}),
		vscode.commands.registerCommand('timetracker.stop', () => {
			if (tracker.stop()) {
//				vscode.window.showInformationMessage(`TimeTracker stopped at ${moment().format('DD.MM.YYYY HH:mm:ss')}`);
				updateStatusBarItem(tracker);
			}
		})
	);

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	statusBarItem.show();

	context.subscriptions.push(statusBarItem);

	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(() => {
			tracker.resetIdleTime();
		}),
		vscode.window.onDidChangeActiveTextEditor (() => {
			tracker.resetIdleTime();
		}),
		vscode.window.onDidChangeTextEditorSelection (() => {
			tracker.resetIdleTime();
		})
	);

	updateStatusBarItem(tracker);
}

function updateStatusBarItem(timeTracker: TimeTracker) {
	const data = timeTracker.trackedData;
	if (data) {
		const currentSessionSeconds = tracker.currentSession?.currentDuration() ?? 0;
		const totalSeconds = data.totalTime + currentSessionSeconds;
		const icon = timeTracker.state === TimeTrackerState.started ? ICON_ACTIVE : ICON_INACTIVE;
		const state = timeTracker.state === TimeTrackerState.started ? 'Active' : 'Inactive';

		const currentSessionTime = moment.duration(currentSessionSeconds, 's').format('hh:mm:ss', {trim: false});
		const totalTime = moment.duration(totalSeconds, 's').format('hh:mm', {trim: false});

		statusBarItem.text = `${icon} ${state}   Total: ${totalTime}   Current session: ${currentSessionTime}`;
	}
}

export function deactivate() {
	tracker.stop();
}
