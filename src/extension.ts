import moment from 'moment';
import 'moment-duration-format';
import path from 'path';
import * as vscode from 'vscode';
import { TimeTracker } from './tracker/TimeTracker';
import { TimeTrackerState } from './tracker/TimeTrackerState';
import fs from 'fs';

const dataFileName = '.timetracker';
const tracker: TimeTracker = new TimeTracker(vscode.workspace.workspaceFolders ? vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.path, dataFileName))  : vscode.Uri.file(''));
let statusBarItem: vscode.StatusBarItem;
let fileStatusBarItem: vscode.StatusBarItem;
let useCompactStatusPanel = false;

let ICON_STARTED = '$(debug-start)';
let ICON_STOPPED = '$(debug-stop)';
//const ICON_STARTED = '$(watch)';
//const ICON_STOPPED = '';
let ICON_PAUSED = '$(debug-pause)';

const COMMAND_START = "timetracker.start";
const COMMAND_STOP = "timetracker.stop";
const COMMAND_PAUSE = "timetracker.pause";
const COMMAND_RECOMPUTE = "timetracker.recompute";
const COMMAND_SELECT = "timetracker.select";

const toDisplayPath = (uri: vscode.Uri): string => {
	const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);

	return workspaceFolder ? 
		path.join(workspaceFolder.name, path.relative(workspaceFolder.uri.path, uri.path)) :
		uri.path;
}

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
		vscode.commands.registerCommand(COMMAND_PAUSE, () => {
			if (tracker.state === TimeTrackerState.Started) {
				if (tracker.pause()) {
					updateStatusBarItem(tracker);
				}
			}
		}),
		vscode.commands.registerCommand(COMMAND_RECOMPUTE, () => {
			if (tracker.recompute()) {
				updateStatusBarItem(tracker);
			}  
		}),
		vscode.commands.registerCommand(COMMAND_SELECT, async () => {

			const files = await vscode.workspace.findFiles(`**/${dataFileName}`);

			const currentItem: vscode.QuickPickItem[] = [
				{ label: "Current", kind: vscode.QuickPickItemKind.Separator }, 
				{ label: toDisplayPath(tracker.storageFile), detail: tracker.storageFile.path, description: `(current)` }, 
				{ label: "Options", kind: vscode.QuickPickItemKind.Separator}]

			const pickItems: vscode.QuickPickItem[] = files.map((file) => { 
				const picked = tracker.storageFile.fsPath === file.fsPath;

				return { label: toDisplayPath(file), detail: file.path, picked: picked }
			}).sort((a, b) => (a.label < b.label ? -1 : (a.label > b.label ? 1 : 0)));

			if(pickItems.length <= 0) {
				vscode.window.showInformationMessage(`No timetracker files found! Make one or complete a session first!`);
				return;
			}

			vscode.window.showQuickPick(currentItem.concat(pickItems), { canPickMany: false, placeHolder: 'Select timetracker file'}).then((value) => {
				if(value) {
					const trackerFile = files.find((file) => file.path === value.detail);

					if(trackerFile) {
						vscode.window.showInformationMessage(`Time Tracker will now use ${value.label}.`);

						tracker.setStorageFile(trackerFile);
						updateStatusBarItem(tracker);
						updateFileStatusBarItem(tracker);
					}
					else {
						vscode.window.showErrorMessage(`Failed to match selected value ${value.label} to tracker file.`);
					}
				}
			});

		})
	);

	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	statusBarItem.show();

	fileStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
	fileStatusBarItem.show();

	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(fileStatusBarItem);

	context.subscriptions.push(
		vscode.window.onDidChangeVisibleTextEditors(() => {
			reactOnActions();
		}),
		vscode.window.onDidChangeActiveTextEditor(() => {
			reactOnActions();
		}),
		vscode.window.onDidChangeTextEditorSelection((e) => {
			if (path.basename(e.textEditor.document.fileName) !== dataFileName) {
				reactOnActions();
			}
		})
	);

	const config = vscode.workspace.getConfiguration('timetracker');

	const autoStartTimeTracking = config.autostart.autoStartTimeTracking;
	const autoCreateTimeTrackingFile = config.autostart.autoCreateTimeTrackingFile;
	const askAboutStart = config.autostart.askAboutAutoStart;
	const pauseAfter = config.pauseAfter;
	useCompactStatusPanel = config.useCompactStatusPanel;

	if (useCompactStatusPanel) {
		ICON_STARTED = '$(watch)';
		ICON_STOPPED = '';
	}

	tracker.maxIdleTimeBeforeCloseSession = pauseAfter;

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
			if (tracker.storageFile.path !== tracker.emptyFile) {
				if (fs.existsSync(tracker.storageFile.fsPath)) {
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
	updateFileStatusBarItem(tracker);
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
		const totalTime = moment.duration(totalSeconds, 's').format('hh:mm:ss', { trim: false });

		if (useCompactStatusPanel) {
			statusBarItem.text = `${icon}${totalTime}+${currentSessionTime}`;
			statusBarItem.tooltip = `State: ${state}   Total: ${totalTime}   Current session: ${currentSessionTime}`;
		} else {
			statusBarItem.text = `${icon} ${state}   Total: ${totalTime}   Current session: ${currentSessionTime}`;
		}
		statusBarItem.command = timeTracker.state === TimeTrackerState.Started ? COMMAND_STOP : COMMAND_START;
	}
}

function updateFileStatusBarItem(timeTracker: TimeTracker) {
	const trackerPath = timeTracker.storageFile;

	if(trackerPath.path !== timeTracker.emptyFile) {
		if(useCompactStatusPanel) {
			fileStatusBarItem.text = '$(file) Select';
			fileStatusBarItem.tooltip = `Select Time Tracker File   Current: ${toDisplayPath(trackerPath)}`
		}
		else {
			fileStatusBarItem.text = toDisplayPath(trackerPath);
		}
		
		fileStatusBarItem.command = COMMAND_SELECT;
		fileStatusBarItem.show();
	}
}

export function deactivate() {
	tracker.stop();
}
