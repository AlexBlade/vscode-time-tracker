import { TimeTracker } from "./TimeTracker";

export type TAction<T> = (subject: T) => void;
export type TTimeTrackerAction = TAction<TimeTracker>;