import path from 'path';
import vscode from 'vscode';
import { TimeTrackerState } from './TimeTrackerState';
import { TrackedData } from './TrackedData';
import { TrackedSession } from './TrackedSession';
import { TTimeTrackerAction } from './Types';

export class TimeTracker {
    public readonly emptyFile = "/";
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
    set state(value: TimeTrackerState) {
        this._state = value;
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

    private _storageFile: vscode.Uri;
    public get storageFile() {
        return this._storageFile;
    }

    private _onActiveStateTick?: TTimeTrackerAction;

    private _tickTimer?: NodeJS.Timeout;

    constructor(storageFile: vscode.Uri) {
        this._state = TimeTrackerState.Stopped;
        this._storageFile = storageFile;
        this._trackedData = storageFile.path !== this.emptyFile ? new TrackedData(storageFile.fsPath) : undefined;
    }

    private startTickTimer() {
        this._tickTimer = setInterval(() => {
            if (this._onActiveStateTick) {
                this._onActiveStateTick(this);
            }
            if (this._maxIdleTimeBeforeCloseSession > 0) {
                this._idleTime++;
            }
            if (this.idleTime > this._maxIdleTimeBeforeCloseSession) {
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

        if (this.storageFile.path === this.emptyFile) {
            //vscode.window.showWarningMessage('A folder should be opened to store time tracking data!');
            return false;
        }

        this._trackedData = this._trackedData ?? new TrackedData(this.storageFile.path);
        this._state = TimeTrackerState.Started;

        this._currentSession = new TrackedSession(true);

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
        this._state = TimeTrackerState.Started;
        this._currentSession = new TrackedSession(true);
        this.startTickTimer();
        return true;
    }

    public stop(): boolean {
        if (this._currentSession && this._state !== TimeTrackerState.Stopped) {
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

    public setStorageFile(storageFile: vscode.Uri) {
        this._storageFile = storageFile;

        if (this._currentSession && this._state !== TimeTrackerState.Stopped) {
            this.stop();
        }
        
        this._trackedData = storageFile.path !== this.emptyFile ? new TrackedData(storageFile.fsPath) : undefined;
    }
}