const express = require('express');
const {
    getAllMatches,
    getMatchById,
    createMatch,
    updateMatch,
    deleteMatch,
    getBattingStatsByMatch,
    getBowlingStatsByMatch,
    insertBattingStats,
    insertBowlingStats,
    deleteBattingStatsByMatch,
    deleteBowlingStatsByMatch
} = require('../database/db');

const router = express.Router();

// GET /api/matches - Get all matches
router.get('/', (req, res) => {
    try {
        const matches = getAllMatches();
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/matches/:id - Get match by id
router.get('/:id', (req, res) => {
    try {
        const match = getMatchById(parseInt(req.params.id));
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(match);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/matches/:id/stats - Get batting and bowling stats for a match
router.get('/:id/stats', (req, res) => {
    try {
        const matchId = parseInt(req.params.id);
        const match = getMatchById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const battingStats = getBattingStatsByMatch(matchId);
        const bowlingStats = getBowlingStatsByMatch(matchId);
        res.json({
            match,
            batting: battingStats,
            bowling: bowlingStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/matches - Create new match with stats
router.post('/', (req, res) => {
    try {
        const { match_date, match_name, batting_stats, bowling_stats } = req.body;
        
        if (!match_date) {
            return res.status(400).json({ error: 'Match date is required' });
        }

        // Create match
        const matchResult = createMatch(match_date, match_name || null);
        const matchId = matchResult.lastInsertRowid;

        // Insert batting stats
        if (batting_stats && Array.isArray(batting_stats)) {
            for (const stat of batting_stats) {
                if (stat.player_id && stat.runs !== undefined) {
                    insertBattingStats(
                        matchId,
                        stat.player_id,
                        stat.runs || 0,
                        stat.balls_faced || 0,
                        stat.fours || 0,
                        stat.sixes || 0
                    );
                }
            }
        }

        // Insert bowling stats
        if (bowling_stats && Array.isArray(bowling_stats)) {
            for (const stat of bowling_stats) {
                if (stat.player_id && stat.wickets !== undefined) {
                    insertBowlingStats(
                        matchId,
                        stat.player_id,
                        stat.wickets || 0,
                        stat.runs_conceded || 0,
                        stat.overs || 0
                    );
                }
            }
        }

        res.status(201).json({ id: matchId, message: 'Match created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/matches/:id - Update match and stats
router.put('/:id', (req, res) => {
    try {
        const matchId = parseInt(req.params.id);
        const match = getMatchById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        const { match_date, match_name, batting_stats, bowling_stats } = req.body;
        
        if (!match_date) {
            return res.status(400).json({ error: 'Match date is required' });
        }

        // Update match
        updateMatch(matchId, match_date, match_name || null);

        // Delete existing stats
        deleteBattingStatsByMatch(matchId);
        deleteBowlingStatsByMatch(matchId);

        // Insert new batting stats
        if (batting_stats && Array.isArray(batting_stats)) {
            for (const stat of batting_stats) {
                if (stat.player_id && stat.runs !== undefined) {
                    insertBattingStats(
                        matchId,
                        stat.player_id,
                        stat.runs || 0,
                        stat.balls_faced || 0,
                        stat.fours || 0,
                        stat.sixes || 0
                    );
                }
            }
        }

        // Insert new bowling stats
        if (bowling_stats && Array.isArray(bowling_stats)) {
            for (const stat of bowling_stats) {
                if (stat.player_id && stat.wickets !== undefined) {
                    insertBowlingStats(
                        matchId,
                        stat.player_id,
                        stat.wickets || 0,
                        stat.runs_conceded || 0,
                        stat.overs || 0
                    );
                }
            }
        }

        res.json({ message: 'Match updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/matches/:id - Delete match (cascade deletes stats)
router.delete('/:id', (req, res) => {
    try {
        const matchId = parseInt(req.params.id);
        const match = getMatchById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        deleteMatch(matchId);
        res.json({ message: 'Match deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

