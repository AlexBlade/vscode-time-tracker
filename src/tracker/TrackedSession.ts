import { Moment } from 'moment';
import moment from 'moment';

moment.fn.toJSON = function () { return this.format() };

export interface ISessionInfo {
    begin: Moment;
    end: Moment;
    duration: number;
}

export class TrackedSession {
    private _begin: Moment = moment(new Date());
    public get begin() {
        return this._begin;
    }

    private _end: Moment = this._begin;
    public get end() {
        return this._end;
    }

    private _duration: number = 0;
    public get duration() {
        return this._duration;
    }

    constructor(start: boolean = true) {
        if (start) {
            this._begin = moment(new Date());
        }
    }

    public start() {
        this._begin = moment(new Date());
        this._end = this._begin;
    }

    public stop() {
        this._end = moment(new Date());
        this._duration = this._end.diff(this._begin, 's');
    }

    public currentDuration() {
        return moment(new Date()).diff(this._begin, 's');
    }

    public export(): ISessionInfo {
        return {
            begin: this.begin,
            end: this.end,
            duration: this.duration
        };
    }
}
