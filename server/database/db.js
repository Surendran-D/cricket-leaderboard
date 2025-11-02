const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database path
const dbPath = path.join(__dirname, '../cricket_leaderboard.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
    // Players table
    db.exec(`
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            image_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Matches table
    db.exec(`
        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_date DATE NOT NULL,
            match_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Batting stats table
    db.exec(`
        CREATE TABLE IF NOT EXISTS batting_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            runs INTEGER NOT NULL DEFAULT 0,
            balls_faced INTEGER DEFAULT 0,
            fours INTEGER DEFAULT 0,
            sixes INTEGER DEFAULT 0,
            points INTEGER DEFAULT 0,
            FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
            UNIQUE(match_id, player_id)
        )
    `);

    // Bowling stats table
    db.exec(`
        CREATE TABLE IF NOT EXISTS bowling_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            wickets INTEGER NOT NULL DEFAULT 0,
            runs_conceded INTEGER DEFAULT 0,
            overs REAL DEFAULT 0,
            points INTEGER DEFAULT 0,
            FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
            UNIQUE(match_id, player_id)
        )
    `);

    // Create indexes for better query performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_batting_match ON batting_stats(match_id);
        CREATE INDEX IF NOT EXISTS idx_batting_player ON batting_stats(player_id);
        CREATE INDEX IF NOT EXISTS idx_bowling_match ON bowling_stats(match_id);
        CREATE INDEX IF NOT EXISTS idx_bowling_player ON bowling_stats(player_id);
    `);
}

// Calculate batting points: runs + (fours * 1) + (sixes * 2)
function calculateBattingPoints(runs, fours, sixes) {
    return runs + (fours || 0) + ((sixes || 0) * 2);
}

// Calculate bowling points: wickets * 10 + economy bonus
function calculateBowlingPoints(wickets, runsConceded, overs) {
    const basePoints = (wickets || 0) * 10;
    if (overs > 0 && runsConceded > 0) {
        const economy = runsConceded / overs;
        let bonus = 0;
        if (economy < 4) bonus = 20; // Excellent economy
        else if (economy < 6) bonus = 10; // Good economy
        else if (economy < 8) bonus = 5; // Decent economy
        return basePoints + bonus;
    }
    return basePoints;
}

// Player queries
function getAllPlayers() {
    return db.prepare('SELECT * FROM players ORDER BY name').all();
}

function getPlayerById(id) {
    return db.prepare('SELECT * FROM players WHERE id = ?').get(id);
}

function createPlayer(name, imagePath = null) {
    const stmt = db.prepare('INSERT INTO players (name, image_path) VALUES (?, ?)');
    return stmt.run(name, imagePath);
}

function updatePlayerImage(id, imagePath) {
    const stmt = db.prepare('UPDATE players SET image_path = ? WHERE id = ?');
    return stmt.run(imagePath, id);
}

// Match queries
function getAllMatches() {
    return db.prepare('SELECT * FROM matches ORDER BY match_date DESC').all();
}

function getMatchById(id) {
    return db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
}

function createMatch(matchDate, matchName) {
    const stmt = db.prepare('INSERT INTO matches (match_date, match_name) VALUES (?, ?)');
    return stmt.run(matchDate, matchName);
}

function updateMatch(id, matchDate, matchName) {
    const stmt = db.prepare('UPDATE matches SET match_date = ?, match_name = ? WHERE id = ?');
    return stmt.run(matchDate, matchName, id);
}

function deleteMatch(id) {
    // Foreign key constraints will cascade delete batting_stats and bowling_stats
    const stmt = db.prepare('DELETE FROM matches WHERE id = ?');
    return stmt.run(id);
}

// Batting stats queries
function getBattingStatsByMatch(matchId) {
    return db.prepare(`
        SELECT bs.*, p.name as player_name, p.image_path
        FROM batting_stats bs
        JOIN players p ON bs.player_id = p.id
        WHERE bs.match_id = ?
        ORDER BY bs.points DESC
    `).all(matchId);
}

function insertBattingStats(matchId, playerId, runs, ballsFaced, fours, sixes) {
    const points = calculateBattingPoints(runs, fours, sixes);
    const stmt = db.prepare(`
        INSERT INTO batting_stats (match_id, player_id, runs, balls_faced, fours, sixes, points)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(match_id, player_id) DO UPDATE SET
            runs = excluded.runs,
            balls_faced = excluded.balls_faced,
            fours = excluded.fours,
            sixes = excluded.sixes,
            points = excluded.points
    `);
    return stmt.run(matchId, playerId, runs, ballsFaced, fours, sixes, points);
}

function deleteBattingStatsByMatch(matchId) {
    const stmt = db.prepare('DELETE FROM batting_stats WHERE match_id = ?');
    return stmt.run(matchId);
}

// Bowling stats queries
function getBowlingStatsByMatch(matchId) {
    return db.prepare(`
        SELECT bs.*, p.name as player_name, p.image_path
        FROM bowling_stats bs
        JOIN players p ON bs.player_id = p.id
        WHERE bs.match_id = ?
        ORDER BY bs.points DESC
    `).all(matchId);
}

function insertBowlingStats(matchId, playerId, wickets, runsConceded, overs) {
    const points = calculateBowlingPoints(wickets, runsConceded, overs);
    const stmt = db.prepare(`
        INSERT INTO bowling_stats (match_id, player_id, wickets, runs_conceded, overs, points)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(match_id, player_id) DO UPDATE SET
            wickets = excluded.wickets,
            runs_conceded = excluded.runs_conceded,
            overs = excluded.overs,
            points = excluded.points
    `);
    return stmt.run(matchId, playerId, wickets, runsConceded, overs, points);
}

function deleteBowlingStatsByMatch(matchId) {
    const stmt = db.prepare('DELETE FROM bowling_stats WHERE match_id = ?');
    return stmt.run(matchId);
}

// Get player with aggregated stats and match history
function getPlayerWithStats(playerId) {
    const player = getPlayerById(playerId);
    if (!player) return null;

    const battingHistory = db.prepare(`
        SELECT bs.*, m.match_date, m.match_name
        FROM batting_stats bs
        JOIN matches m ON bs.match_id = m.id
        WHERE bs.player_id = ?
        ORDER BY m.match_date DESC
    `).all(playerId);

    const bowlingHistory = db.prepare(`
        SELECT bs.*, m.match_date, m.match_name
        FROM bowling_stats bs
        JOIN matches m ON bs.match_id = m.id
        WHERE bs.player_id = ?
        ORDER BY m.match_date DESC
    `).all(playerId);

    const battingTotals = db.prepare(`
        SELECT 
            SUM(runs) as total_runs,
            SUM(balls_faced) as total_balls,
            SUM(fours) as total_fours,
            SUM(sixes) as total_sixes,
            SUM(points) as total_points,
            COUNT(*) as matches_played
        FROM batting_stats
        WHERE player_id = ?
    `).get(playerId);

    const bowlingTotals = db.prepare(`
        SELECT 
            SUM(wickets) as total_wickets,
            SUM(runs_conceded) as total_runs_conceded,
            SUM(overs) as total_overs,
            SUM(points) as total_points,
            COUNT(*) as matches_played
        FROM bowling_stats
        WHERE player_id = ?
    `).get(playerId);

    return {
        ...player,
        batting: {
            history: battingHistory,
            totals: battingTotals || {
                total_runs: 0,
                total_balls: 0,
                total_fours: 0,
                total_sixes: 0,
                total_points: 0,
                matches_played: 0
            }
        },
        bowling: {
            history: bowlingHistory,
            totals: bowlingTotals || {
                total_wickets: 0,
                total_runs_conceded: 0,
                total_overs: 0,
                total_points: 0,
                matches_played: 0
            }
        }
    };
}

// Get leaderboard for batting
function getBattingLeaderboard() {
    return db.prepare(`
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
        HAVING total_points > 0 OR matches_played = 0
        ORDER BY total_points DESC, total_runs DESC
    `).all();
}

// Get leaderboard for bowling
function getBowlingLeaderboard() {
    return db.prepare(`
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
        HAVING total_points > 0 OR matches_played = 0
        ORDER BY total_points DESC, total_wickets DESC
    `).all();
}

// Initialize database on module load
initializeDatabase();

module.exports = {
    db,
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
    calculateBowlingPoints
};

