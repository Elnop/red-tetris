export interface UserData {
	username: string
	alive: boolean
	color: string
}

export type BoardCell = string | null

export interface GhostData {
	grid: string[];
	color: string;
	timestamp: number;
}