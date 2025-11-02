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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/players', playersRoutes);
app.use('/api/matches', matchesRoutes);

// Catch all handler: send back React's index.html file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

