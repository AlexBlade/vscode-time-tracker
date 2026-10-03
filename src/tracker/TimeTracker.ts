import path from 'path';
import * as vscode from 'vscode';
import { TimeTrackerState } from './TimeTrackerState';
import { TrackedData } from './TrackedData';
import { TrackedSession } from './TrackedSession';
import { TTimeTrackerAction } from './Types';

export class TimeTracker {
    public readonly dataFileName = '.timetracker';
    private _maxIdleTimeBeforeCloseSession: number = 120;
    set maxIdleTimeBeforeCloseSession(value: number) {
        this._maxIdleTimeBeforeCloseSession = value;
    }
    get maxIdleTimeBeforeCloseSession() {
        return this._maxIdleTimeBeforeCloseSession;
    }

    private _state: TimeTrackerState;
    get state(): TimeTrackerState {
        return this._state;
    }
    private _trackedData?: TrackedData;
    public get trackedData() {
        return this._trackedData;
    }

    private _currentSession?: TrackedSession;
    public get currentSession() {
        return this._currentSession;
    }

    private _idleTime: number = 0;
    public get idleTime() {
        return this._idleTime;
    }

    private _onActiveStateTick?: TTimeTrackerAction;

    private _tickTimer?: NodeJS.Timeout;
    private _checkpointTicks = 0;

    constructor() {
        this._state = TimeTrackerState.Stopped;
    }

    private getWorkspaceFilePath(): string | undefined {
        const folder = vscode.workspace.workspaceFolders?.[0];
        return folder ? path.join(folder.uri.fsPath, this.dataFileName) : undefined;
    }

    private ensureTrackedData(): boolean {
        const filePath = this.getWorkspaceFilePath();
        if (!filePath) {
            return false;
        }
        if (!this._trackedData || this._trackedData.storageFile !== filePath) {
            this._trackedData = new TrackedData(filePath);
        }
        return true;
    }

    public refreshWorkspace() {
        if (this._state === TimeTrackerState.Stopped) {
            this._trackedData = undefined;
        }
    }

    private startTickTimer() {
        this.stopTickTimer();
        this._tickTimer = setInterval(() => {
            this._checkpointTicks++;
            if (this._currentSession && this._checkpointTicks >= 5) {
                this._trackedData?.updateActiveSession(this._currentSession);
                this._checkpointTicks = 0;
            }
            if (this._onActiveStateTick) {
                this._onActiveStateTick(this);
            }
            if (this._maxIdleTimeBeforeCloseSession > 0) {
                this._idleTime++;
            }
            if (this._maxIdleTimeBeforeCloseSession > 0 && this.idleTime >= this._maxIdleTimeBeforeCloseSession) {
                this.pause();
            }
        }, 1000);
    }

    private stopTickTimer() {
        if (this._tickTimer) {
            clearInterval(this._tickTimer);
        }
    }

    public start(action?: TTimeTrackerAction): boolean {
        if (this._currentSession && this._state === TimeTrackerState.Started) {
            vscode.window.showInformationMessage('Another time tracking session is already active, stop previous to start the new one');
            return false;
        }

        if (!this.ensureTrackedData()) {
            vscode.window.showWarningMessage('Open a workspace folder before starting time tracking.');
            return false;
        }
        this._trackedData?.recoverActiveSession();
        this._trackedData?.save();
        this._state = TimeTrackerState.Started;

        this._currentSession = new TrackedSession(true);
        this._checkpointTicks = 0;
        this._trackedData?.updateActiveSession(this._currentSession);

        this._onActiveStateTick = action;
        this.startTickTimer();

        return true;
    }

    public pause(): boolean {
        if (this._currentSession && this._state === TimeTrackerState.Started) {
            this._currentSession?.stop();
            this._trackedData?.addSession(this._currentSession);
            delete this._currentSession;
            this._state = TimeTrackerState.Paused;
            this.stopTickTimer();
            this._idleTime = 0;
            if (this._onActiveStateTick) {
                this._onActiveStateTick(this);
            }
            return true;
        } else {
            return false;
        }
    }

    public continue(): boolean {
        if (this._state !== TimeTrackerState.Paused || !this.ensureTrackedData()) {
            return false;
        }
        this._state = TimeTrackerState.Started;
        this._currentSession = new TrackedSession(true);
        this._checkpointTicks = 0;
        this._trackedData?.updateActiveSession(this._currentSession);
        this.startTickTimer();
        return true;
    }

    public stop(): boolean {
        if (this._state === TimeTrackerState.Paused) {
            this._state = TimeTrackerState.Stopped;
            this._idleTime = 0;
            if (this._onActiveStateTick) {
                this._onActiveStateTick(this);
            }
            return true;
        }
        if (this._currentSession && this._state === TimeTrackerState.Started) {
            this._currentSession?.stop();
            this._trackedData?.addSession(this._currentSession);
            delete this._currentSession;
            this._state = TimeTrackerState.Stopped;
            this.stopTickTimer();
            this._idleTime = 0;
            if (this._onActiveStateTick) {
                this._onActiveStateTick(this);
            }
            return true;
        } else {
            vscode.window.showInformationMessage('No tracking session is already active');
            return false;
        }
    }

    public resetIdleTime() {
        this._idleTime = 0;
    }

    public recompute(): boolean {
        this.trackedData?.recomputeTotalTime();
        return true;
    }
}
