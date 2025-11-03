const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
	getAllPlayers,
	getPlayerById,
	createPlayer,
	updatePlayerImage,
	getPlayerWithStats,
	getBattingLeaderboard,
	getBowlingLeaderboard
} = require('../database/db');

const router = express.Router();

// Configure multer for image uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
		cb(null, 'player-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
	}
});

const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024 // 5MB limit
	},
	fileFilter: (req, file, cb) => {
		const allowedTypes = /jpeg|jpg|png|gif/;
		const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
		const mimetype = allowedTypes.test(file.mimetype);
		if (extname && mimetype) {
			return cb(null, true);
		}
		cb(new Error('Only image files are allowed!'));
	}
});

// GET /api/players - Get all players
router.get('/', async (req, res) => {
	try {
		const players = await getAllPlayers();
		res.json(players);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// GET /api/players/leaderboard/batting - Get batting leaderboard
router.get('/leaderboard/batting', async (req, res) => {
	try {
		const leaderboard = await getBattingLeaderboard();
		res.json(leaderboard);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// GET /api/players/leaderboard/bowling - Get bowling leaderboard
router.get('/leaderboard/bowling', async (req, res) => {
	try {
		const leaderboard = await getBowlingLeaderboard();
		res.json(leaderboard);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// GET /api/players/:id - Get player with stats
router.get('/:id', async (req, res) => {
	try {
		const player = await getPlayerWithStats(parseInt(req.params.id));
		if (!player) {
			return res.status(404).json({ error: 'Player not found' });
		}
		res.json(player);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// POST /api/players - Create new player
router.post('/', async (req, res) => {
	try {
		const { name } = req.body;
		if (!name || name.trim() === '') {
			return res.status(400).json({ error: 'Player name is required' });
		}
		const result = await createPlayer(name.trim());
		res.status(201).json({ id: result.lastInsertRowid, name: name.trim() });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// POST /api/players/:id/image - Upload player image
router.post('/:id/image', upload.single('image'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No image file provided' });
		}
		const playerId = parseInt(req.params.id);
		const player = await getPlayerById(playerId);
		if (!player) {
			// Delete uploaded file if player doesn't exist
			fs.unlinkSync(req.file.path);
			return res.status(404).json({ error: 'Player not found' });
		}
		
		// Delete old image if exists (ensure absolute path resolves correctly)
		if (player.image_path) {
			const rel = player.image_path.replace(/^\/+/, ''); // remove leading slash
			const absoluteOldPath = path.join(__dirname, '..', rel);
			if (fs.existsSync(absoluteOldPath)) {
				try { fs.unlinkSync(absoluteOldPath); } catch (_) {}
			}
		}
		
		const imagePath = `/uploads/${req.file.filename}`;
		await updatePlayerImage(playerId, imagePath);
		res.json({ image_path: imagePath });
	} catch (error) {
		// Delete uploaded file on error
		if (req.file && fs.existsSync(req.file.path)) {
			try { fs.unlinkSync(req.file.path); } catch (_) {}
		}
		res.status(500).json({ error: error.message });
	}
});

module.exports = router;

