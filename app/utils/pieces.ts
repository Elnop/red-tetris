// ----------------------- Types (supporte 4×4 pour la pièce I)
export type Cell = 0 | 1
export type Matrix = Cell[][] // carré N×N (N=3 ou 4 selon la pièce)

export type PieceName = 'I' | 'T' | 'L' | 'J' | 'S' | 'Z' | 'O'

export interface PieceDef {
	name: PieceName
	color: string
	base: Matrix               // orientation 0°
	rotations: Matrix[]        // 0°, 90°, 180°, 270° (dédupliquées)
}

export interface ActivePiece {
	name: PieceName
	color: string
	rotIndex: number           // index dans rotations
	matrix: Matrix
}

// ----------------------- Helpers
export const rotateCW = (m: Matrix): Matrix => {
	const n = m.length
	const r: Matrix = Array.from({ length: n }, () => Array.from({ length: n }, () => 0 as Cell))
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) {
			r[x]![n - 1 - y] = m[y]![x]!
		}
	}
	return r
}

const matrixKey = (m: Matrix) => m.map(row => row.join('')).join('|')

const uniqueRotations = (base: Matrix): Matrix[] => {
	const rots: Matrix[] = []
	const seen = new Set<string>()
	let cur = base
	for (let i = 0; i < 4; i++) {
		const key = matrixKey(cur)
		if (!seen.has(key)) {
			rots.push(cur)
			seen.add(key)
		}
		cur = rotateCW(cur)
	}
	return rots
}

// ----------------------- Définitions (principalement 4×4, padding avec 0)
const defsRaw: Array<{ name: PieceName; color: string; base: Matrix }> = [
	{
		name: 'I',
		color: '#00CED1',
		base: [
			[0, 0, 0, 0],
			[1, 1, 1, 1],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
	{
		name: 'T',
		color: '#8A2BE2',
		base: [
			[0, 1, 0, 0],
			[1, 1, 1, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
	{
		name: 'L',
		color: '#FF8C00',
		base: [
			[0, 0, 1, 0],
			[1, 1, 1, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
	{
		name: 'J',
		color: '#1E90FF',
		base: [
			[1, 0, 0, 0],
			[1, 1, 1, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
	{
		name: 'S',
		color: '#32CD32',
		base: [
			[0, 1, 1, 0],
			[1, 1, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
	{
		name: 'Z',
		color: '#DC143C',
		base: [
			[1, 1, 0, 0],
			[0, 1, 1, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
	{
		name: 'O',
		color: '#FFD700',
		base: [
			[0, 1, 1, 0],
			[0, 1, 1, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		],
	},
] as const

export const PIECES: Record<PieceName, PieceDef> = defsRaw.reduce((acc, d) => {
	acc[d.name] = {
		name: d.name,
		color: d.color,
		base: d.base,
		rotations: uniqueRotations(d.base),
	}
	return acc
}, {} as Record<PieceName, PieceDef>)

// ----------------------- Génération (aléatoire non-déterministe)
export const randomPiece = (): ActivePiece => {
	const names = Object.keys(PIECES) as PieceName[]
	const name = names[Math.floor(Math.random() * names.length)] as PieceName
	const def = PIECES[name]!
	const rotIndex = Math.floor(Math.random() * def.rotations.length)
	return {
		name,
		color: def.color,
		rotIndex,
		matrix: def.rotations[rotIndex]!,
	}
}

export const rotateActiveCW = (p: ActivePiece): ActivePiece => {
	const def = PIECES[p.name]
	const next = (p.rotIndex + 1) % def.rotations.length
	return { ...p, rotIndex: next, matrix: def.rotations[next]! }
}

// ----------------------- Utilitaires
/** Renvoie les coordonnées [x,y] des cellules actives (1) dans la matrice NxN */
export const toCoords = (m: Matrix): Array<[number, number]> => {
	const coords: Array<[number, number]> = []
	const n = m.length
	for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y]![x]!) coords.push([x, y])
		return coords
}

/** Rend la matrice en string (utile pour debug) */
export const renderMatrix = (m: Matrix): string =>
	m.map(r => r.map(c => (c ? '■' : '·')).join(' ')).join('\n')

// ----------------------- Files d'attente
/** Génère une file de pièces aléatoires de longueur donnée */
export const generateQueue = (length: number): ActivePiece[] =>
	Array.from({ length }, () => randomPiece())

// ----------------------- PRNG déterministe + 7-bag
/** PRNG Mulberry32 déterministe */
export const createPRNG = (seed: number) => {
	let s = seed >>> 0
	return () => {
		s += 0x6D2B79F5
		let t = Math.imul(s ^ (s >>> 15), 1 | s)
		t ^= t + Math.imul(t ^ (t >>> 7), 61 | t)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const ALL_NAMES: PieceName[] = ['I', 'T', 'L', 'J', 'S', 'Z', 'O']

const makeShuffledBag = (rand: () => number): PieceName[] => {
	const bag = [...ALL_NAMES]
	// Fisher-Yates
	for (let i = bag.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1))
		;[bag[i]!, bag[j]!] = [bag[j]!, bag[i]!]
	}
	return bag
}

/** Génère une file de pièces déterministe depuis un seed (7-bag) */
export const generateQueueFromSeed = (seed: number, length: number): ActivePiece[] => {
	const rand = createPRNG(seed)
	const names: PieceName[] = []
	while (names.length < length) names.push(...makeShuffledBag(rand))
		const out: ActivePiece[] = []
	for (let i = 0; i < length; i++) {
		const name = names[i]!
		const def = PIECES[name]!
		const rotIndex = Math.floor(rand() * def.rotations.length)
		out.push({ name, color: def.color, rotIndex, matrix: def.rotations[rotIndex]! })
	}
	return out
}
