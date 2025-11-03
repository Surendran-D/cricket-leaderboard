const express = require('express');
const cors = require('cors');
const path = require('path');
const playersRoutes = require('./routes/players');
const matchesRoutes = require('./routes/matches');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images (put this before public to avoid any overlap)
const uploadsAbsolute = path.resolve(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsAbsolute, {
	immutable: true,
	maxAge: '7d',
}));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/players', playersRoutes);
app.use('/api/matches', matchesRoutes);

// Catch all handler: send back index.html file
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
	console.log(`Serving uploads from: ${uploadsAbsolute}`);
});

