export type BoardCell = string | null

export interface GhostData {
	grid: string[];
	color: string;
	timestamp: number;
}