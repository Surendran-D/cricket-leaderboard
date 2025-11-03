const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create PG pool (Render provides DATABASE_URL)
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function withClient(fn) {
	const client = await pool.connect();
	try {
		return await fn(client);
	} finally {
		client.release();
	}
}

// Initialize database schema
async function initializeDatabase() {
	await withClient(async (client) => {
		await client.query('BEGIN');
		try {
			await client.query(`
				CREATE TABLE IF NOT EXISTS players (
					id SERIAL PRIMARY KEY,
					name TEXT NOT NULL,
					image_path TEXT,
					created_at TIMESTAMPTZ DEFAULT NOW()
				);
			`);

			await client.query(`
				CREATE TABLE IF NOT EXISTS matches (
					id SERIAL PRIMARY KEY,
					match_date DATE NOT NULL,
					match_name TEXT,
					created_at TIMESTAMPTZ DEFAULT NOW()
				);
			`);

			await client.query(`
				CREATE TABLE IF NOT EXISTS batting_stats (
					id SERIAL PRIMARY KEY,
					match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
					player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
					runs INTEGER NOT NULL DEFAULT 0,
					balls_faced INTEGER DEFAULT 0,
					fours INTEGER DEFAULT 0,
					sixes INTEGER DEFAULT 0,
					points INTEGER DEFAULT 0,
					UNIQUE (match_id, player_id)
				);
			`);

			await client.query(`
				CREATE TABLE IF NOT EXISTS bowling_stats (
					id SERIAL PRIMARY KEY,
					match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
					player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
					wickets INTEGER NOT NULL DEFAULT 0,
					runs_conceded INTEGER DEFAULT 0,
					overs NUMERIC(5,1) DEFAULT 0,
					points INTEGER DEFAULT 0,
					UNIQUE (match_id, player_id)
				);
			`);

			await client.query(`CREATE INDEX IF NOT EXISTS idx_batting_match ON batting_stats(match_id);`);
			await client.query(`CREATE INDEX IF NOT EXISTS idx_batting_player ON batting_stats(player_id);`);
			await client.query(`CREATE INDEX IF NOT EXISTS idx_bowling_match ON bowling_stats(match_id);`);
			await client.query(`CREATE INDEX IF NOT EXISTS idx_bowling_player ON bowling_stats(player_id);`);

			await client.query('COMMIT');
		} catch (e) {
			await client.query('ROLLBACK');
			throw e;
		}
	});
}

// Calculate batting points: runs + (fours * 1) + (sixes * 2)
function calculateBattingPoints(runs, fours, sixes) {
	return (runs || 0) + (fours || 0) + ((sixes || 0) * 2);
}

// Calculate bowling points: wickets * 10 + economy bonus
function calculateBowlingPoints(wickets, runsConceded, overs) {
	const basePoints = (wickets || 0) * 10;
	if (overs > 0 && runsConceded > 0) {
		const economy = runsConceded / overs;
		let bonus = 0;
		if (economy < 4) bonus = 20;
		else if (economy < 6) bonus = 10;
		else if (economy < 8) bonus = 5;
		return basePoints + bonus;
	}
	return basePoints;
}

// Player queries
async function getAllPlayers() {
	const { rows } = await pool.query('SELECT * FROM players ORDER BY name');
	return rows;
}

async function getPlayerById(id) {
	const { rows } = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
	return rows[0];
}

async function createPlayer(name, imagePath = null) {
	const { rows } = await pool.query(
		'INSERT INTO players (name, image_path) VALUES ($1, $2) RETURNING id',
		[name, imagePath]
	);
	return { lastInsertRowid: rows[0].id };
}

async function updatePlayerImage(id, imagePath) {
	await pool.query('UPDATE players SET image_path = $1 WHERE id = $2', [imagePath, id]);
	return { changes: 1 };
}

// Match queries
async function getAllMatches() {
	const { rows } = await pool.query('SELECT * FROM matches ORDER BY match_date DESC');
	return rows;
}

async function getMatchById(id) {
	const { rows } = await pool.query('SELECT * FROM matches WHERE id = $1', [id]);
	return rows[0];
}

async function createMatch(matchDate, matchName) {
	const { rows } = await pool.query(
		'INSERT INTO matches (match_date, match_name) VALUES ($1, $2) RETURNING id',
		[matchDate, matchName]
	);
	return { lastInsertRowid: rows[0].id };
}

async function updateMatch(id, matchDate, matchName) {
	await pool.query('UPDATE matches SET match_date = $1, match_name = $2 WHERE id = $3', [matchDate, matchName, id]);
	return { changes: 1 };
}

async function deleteMatch(id) {
	await pool.query('DELETE FROM matches WHERE id = $1', [id]);
	return { changes: 1 };
}

// Batting stats queries
async function getBattingStatsByMatch(matchId) {
	const { rows } = await pool.query(`
		SELECT bs.*, p.name as player_name, p.image_path
		FROM batting_stats bs
		JOIN players p ON bs.player_id = p.id
		WHERE bs.match_id = $1
		ORDER BY bs.points DESC
	`, [matchId]);
	return rows;
}

async function insertBattingStats(matchId, playerId, runs, ballsFaced, fours, sixes) {
	const points = calculateBattingPoints(runs, fours, sixes);
	await pool.query(
		`INSERT INTO batting_stats (match_id, player_id, runs, balls_faced, fours, sixes, points)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (match_id, player_id) DO UPDATE SET
			runs = EXCLUDED.runs,
			balls_faced = EXCLUDED.balls_faced,
			fours = EXCLUDED.fours,
			sixes = EXCLUDED.sixes,
			points = EXCLUDED.points`,
		[matchId, playerId, runs || 0, ballsFaced || 0, fours || 0, sixes || 0, points]
	);
	return { changes: 1 };
}

async function deleteBattingStatsByMatch(matchId) {
	await pool.query('DELETE FROM batting_stats WHERE match_id = $1', [matchId]);
	return { changes: 1 };
}

// Bowling stats queries
async function getBowlingStatsByMatch(matchId) {
	const { rows } = await pool.query(`
		SELECT bs.*, p.name as player_name, p.image_path
		FROM bowling_stats bs
		JOIN players p ON bs.player_id = p.id
		WHERE bs.match_id = $1
		ORDER BY bs.points DESC
	`, [matchId]);
	return rows;
}

async function insertBowlingStats(matchId, playerId, wickets, runsConceded, overs) {
	const points = calculateBowlingPoints(wickets, runsConceded, overs);
	await pool.query(
		`INSERT INTO bowling_stats (match_id, player_id, wickets, runs_conceded, overs, points)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (match_id, player_id) DO UPDATE SET
			wickets = EXCLUDED.wickets,
			runs_conceded = EXCLUDED.runs_conceded,
			overs = EXCLUDED.overs,
			points = EXCLUDED.points`,
		[matchId, playerId, wickets || 0, runsConceded || 0, overs || 0, points]
	);
	return { changes: 1 };
}

async function deleteBowlingStatsByMatch(matchId) {
	await pool.query('DELETE FROM bowling_stats WHERE match_id = $1', [matchId]);
	return { changes: 1 };
}

// Get player with aggregated stats and match history
async function getPlayerWithStats(playerId) {
	const player = await getPlayerById(playerId);
	if (!player) return null;

	const { rows: battingHistory } = await pool.query(`
		SELECT bs.*, m.match_date, m.match_name
		FROM batting_stats bs
		JOIN matches m ON bs.match_id = m.id
		WHERE bs.player_id = $1
		ORDER BY m.match_date DESC
	`, [playerId]);

	const { rows: bowlingHistory } = await pool.query(`
		SELECT bs.*, m.match_date, m.match_name
		FROM bowling_stats bs
		JOIN matches m ON bs.match_id = m.id
		WHERE bs.player_id = $1
		ORDER BY m.match_date DESC
	`, [playerId]);

	const { rows: battingTotalsRows } = await pool.query(`
		SELECT 
			COALESCE(SUM(runs), 0) as total_runs,
			COALESCE(SUM(balls_faced), 0) as total_balls,
			COALESCE(SUM(fours), 0) as total_fours,
			COALESCE(SUM(sixes), 0) as total_sixes,
			COALESCE(SUM(points), 0) as total_points,
			COUNT(*) as matches_played
		FROM batting_stats
		WHERE player_id = $1
	`, [playerId]);

	const battingTotals = battingTotalsRows[0] || {
		total_runs: 0,
		total_balls: 0,
		total_fours: 0,
		total_sixes: 0,
		total_points: 0,
		matches_played: 0,
	};

	const { rows: bowlingTotalsRows } = await pool.query(`
		SELECT 
			COALESCE(SUM(wickets), 0) as total_wickets,
			COALESCE(SUM(runs_conceded), 0) as total_runs_conceded,
			COALESCE(SUM(overs), 0) as total_overs,
			COALESCE(SUM(points), 0) as total_points,
			COUNT(*) as matches_played
		FROM bowling_stats
		WHERE player_id = $1
	`, [playerId]);

	const bowlingTotals = bowlingTotalsRows[0] || {
		total_wickets: 0,
		total_runs_conceded: 0,
		total_overs: 0,
		total_points: 0,
		matches_played: 0,
	};

	return {
		...player,
		batting: {
			history: battingHistory,
			totals: battingTotals,
		},
		bowling: {
			history: bowlingHistory,
			totals: bowlingTotals,
		},
	};
}

// Leaderboards
async function getBattingLeaderboard() {
	const { rows } = await pool.query(`
		SELECT 
			p.id,
			p.name,
			p.image_path,
			COALESCE(SUM(bs.points), 0) as total_points,
			COALESCE(SUM(bs.runs), 0) as total_runs,
			COALESCE(SUM(bs.fours), 0) as total_fours,
			COALESCE(SUM(bs.sixes), 0) as total_sixes,
			COUNT(DISTINCT bs.match_id) as matches_played
		FROM players p
		LEFT JOIN batting_stats bs ON p.id = bs.player_id
		GROUP BY p.id, p.name, p.image_path
		HAVING COALESCE(SUM(bs.points), 0) > 0 OR COUNT(DISTINCT bs.match_id) = 0
		ORDER BY total_points DESC, total_runs DESC
	`);
	return rows;
}

async function getBowlingLeaderboard() {
	const { rows } = await pool.query(`
		SELECT 
			p.id,
			p.name,
			p.image_path,
			COALESCE(SUM(bws.points), 0) as total_points,
			COALESCE(SUM(bws.wickets), 0) as total_wickets,
			COALESCE(SUM(bws.runs_conceded), 0) as total_runs_conceded,
			COALESCE(SUM(bws.overs), 0) as total_overs,
			COUNT(DISTINCT bws.match_id) as matches_played
		FROM players p
		LEFT JOIN bowling_stats bws ON p.id = bws.player_id
		GROUP BY p.id, p.name, p.image_path
		HAVING COALESCE(SUM(bws.points), 0) > 0 OR COUNT(DISTINCT bws.match_id) = 0
		ORDER BY total_points DESC, total_wickets DESC
	`);
	return rows;
}

// Initialize database on module load
initializeDatabase().catch((e) => {
	console.error('Failed to initialize database', e);
	process.exit(1);
});

module.exports = {
	pool,
	getAllPlayers,
	getPlayerById,
	createPlayer,
	updatePlayerImage,
	getAllMatches,
	getMatchById,
	createMatch,
	updateMatch,
	deleteMatch,
	getBattingStatsByMatch,
	insertBattingStats,
	deleteBattingStatsByMatch,
	getBowlingStatsByMatch,
	insertBowlingStats,
	deleteBowlingStatsByMatch,
	getPlayerWithStats,
	getBattingLeaderboard,
	getBowlingLeaderboard,
	calculateBattingPoints,
	calculateBowlingPoints,
};

