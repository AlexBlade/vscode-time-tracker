import fs from 'fs';
import moment from 'moment';
import * as vscode from 'vscode';
import { ISessionInfo, TrackedSession } from './TrackedSession';

export class TrackedData {
    private readonly _storageFile: string;

    public get storageFile() {
        return this._storageFile;
    }

    private _sessions: ISessionInfo[];
    public get sessions() {
        return this._sessions;
    }

    private _totalTime: number;
    public get totalTime() {
        return this._totalTime;
    }

    private _activeSession?: ISessionInfo;

    constructor(storageFile: string) {
        this._storageFile = storageFile;
        this._sessions = [];
        this._totalTime = 0;
        this.load();
    }

    private updateTotalTime() {
        this._totalTime = this._sessions.reduce((total, session) => total + session.duration, 0);
    }

    public recomputeTotalTime() {
        this.load();
        this._sessions.forEach(it => {
            it.duration = it.end.diff(it.begin, 's');
        });
        this.updateTotalTime();
        this.save();
    }

    public addSession(session: TrackedSession) {
        // Reload data from disk because file could be changed (for example .timetracker was retrieved from GIT during pull)
        this.load();
        this._activeSession = undefined;
        this._sessions.push(session.export());
        this.updateTotalTime();
        this.save();
    }

    public updateActiveSession(session: TrackedSession) {
        this._activeSession = session.checkpoint();
        this.save();
    }

    public recoverActiveSession(): boolean {
        this.load();
        if (!this._activeSession) {
            return false;
        }
        this._sessions.push(this._activeSession);
        this._activeSession = undefined;
        this.updateTotalTime();
        this.save();
        return true;
    }

    public load() {
        if (fs.existsSync(this._storageFile)) {
            try {
                const dataString = fs.readFileSync(this._storageFile).toString();
                const data: unknown = JSON.parse(dataString);
                if (!this.isStoredData(data)) {
                    throw new Error('invalid .timetracker structure');
                }
                this._sessions = data.sessions.map(session => ({
                    begin: moment(session.begin),
                    end: moment(session.end),
                    duration: session.duration
                }));
                this._totalTime = data.total;
                this._activeSession = data.activeSession ? {
                    begin: moment(data.activeSession.begin),
                    end: moment(data.activeSession.end),
                    duration: data.activeSession.duration
                } : undefined;
            } catch (error) {
                this._sessions = [];
                this._totalTime = 0;
                this._activeSession = undefined;
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Unable to read stored time tracking data: ${message}`);
            }
        } else {
            this._sessions = [];
            this._totalTime = 0;
            this._activeSession = undefined;
        }
    }

    public save() {
        try {
            const temporaryFile = `${this._storageFile}.tmp`;
            fs.writeFileSync(temporaryFile, JSON.stringify({
                total: this._totalTime,
                sessions: this._sessions,
                activeSession: this._activeSession,
            }, null, vscode.workspace.getConfiguration('timetracker').dotTimeTrackerIndent), {
                encoding: 'utf-8'
            });
            try {
                fs.renameSync(temporaryFile, this._storageFile);
            } catch (renameError) {
                // Windows does not replace an existing file with renameSync.
                fs.copyFileSync(temporaryFile, this._storageFile);
                fs.unlinkSync(temporaryFile);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Unable to store time tracking data: ${message}`);
        }
    }

    private isStoredData(data: unknown): data is { total: number; sessions: Array<{ begin: string; end: string; duration: number }>; activeSession?: { begin: string; end: string; duration: number } } {
        if (!data || typeof data !== 'object') {
            return false;
        }
        const value = data as { total?: unknown; sessions?: unknown; activeSession?: unknown };
        if (typeof value.total !== 'number' || !Array.isArray(value.sessions)) {
            return false;
        }
        const isValidSession = (session: unknown) => {
            if (!session || typeof session !== 'object') {
                return false;
            }
            const item = session as { begin?: unknown; end?: unknown; duration?: unknown };
            return typeof item.begin === 'string' && typeof item.end === 'string'
                && typeof item.duration === 'number'
                && moment(item.begin).isValid() && moment(item.end).isValid()
                && item.duration >= 0;
        };
        return value.sessions.every(isValidSession)
            && (value.activeSession === undefined || isValidSession(value.activeSession));
    }
}
