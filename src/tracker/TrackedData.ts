import fs from 'fs';
import moment from 'moment';
import vscode from 'vscode';
import { ISessionInfo, TrackedSession } from './TrackedSession';

export class TrackedData {
    private readonly _storageFile: string;

    private _sessions: ISessionInfo[];
    public get sessions() {
        return this._sessions;
    }

    private _totalTime: number;
    public get totalTime() {
        return this._totalTime;
    }

    constructor(storageFile: string) {
        this._storageFile = storageFile;
        this._sessions = [];
        this._totalTime = 0;
        this.load();
    }

    private updateTotalTime() {
        this._totalTime = this._sessions.map(s => s.duration).reduce((acc, d) => acc += d);
    }

    public recomputeTotalTime() {
        this.load();
        this._sessions.forEach(it => {
            if (typeof it.begin === 'string') {
                it.begin = moment(it.begin);
            }
            if (typeof it.end === 'string') {
                it.end = moment(it.end);
            }
            it.duration = it.end.diff(it.begin, 's');
        });
        this.updateTotalTime();
        this.save();
    }

    public addSession(session: TrackedSession) {
        // Reload data from disk because file could be changed (for example .timetracker was retrieved from GIT during pull)
        this.load();
        this._sessions.push(session.export());
        this.updateTotalTime();
        this.save();
    }

    public load() {
        if (fs.existsSync(this._storageFile)) {
            try {
                const dataString = fs.readFileSync(this._storageFile).toString();
                const data = JSON.parse(dataString);
                this._sessions = data.sessions;
                this._totalTime = data.total;
            } catch (error) {
                vscode.window.showErrorMessage(`Unable to read stored time tracking data due to: ${error.message}`);
            }
        } else {
            this._sessions = [];
            this._totalTime = 0;
        }
    }

    public save() {
        try {
            fs.writeFileSync(this._storageFile, JSON.stringify({
                total: this._totalTime,
                sessions: this._sessions,
            }, null, vscode.workspace.getConfiguration('timetracker').dotTimeTrackerIndent), {
                encoding: 'utf-8'
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Unable to store time tracking data due to: ${error.message}`);
        }
    }
}
