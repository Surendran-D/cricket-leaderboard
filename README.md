# Cricket Leaderboard App

A web application to track and display cricket match statistics with batting and bowling leaderboards.

## Features

- **Batting Leaderboard**: Points calculated as Runs + (Fours × 1) + (Sixes × 2)
- **Bowling Leaderboard**: Points calculated as (Wickets × 10) + Economy Bonus
- **Player Profiles**: Upload custom images or use default avatar
- **Match Management**: Create, read, update, and delete match details
- **Player Statistics**: View detailed match history for each player
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend**: Node.js with Express.js
- **Database**: SQLite (better-sqlite3)
- **File Upload**: Multer

## Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. The database will be automatically created when you start the server.

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Adding Players

1. Go to "Add Match" page
2. When adding batting/bowling stats, select a player
3. If the player doesn't exist, you'll need to create them first via the API or add them when creating a match

### Creating a Match

1. Click "Add Match" button
2. Enter match date and name
3. Add batting stats for players (runs, balls, fours, sixes)
4. Add bowling stats for players (wickets, runs conceded, overs)
5. Click "Save Match"

### Viewing Leaderboards

1. The main page displays batting leaderboard by default
2. Click "Bowling Leaderboard" tab to view bowling stats
3. Click on any player card to view their detailed statistics

### Viewing Player Details

1. Click on any player card from the leaderboard
2. View their complete match history with batting and bowling stats
3. See total statistics across all matches

### Editing/Deleting Matches

1. Click on "Add Match" button
2. Use URL parameter `?id=<match_id>` to edit an existing match
3. Click "Delete Match" button to remove a match (this will also delete all associated stats)

## API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player with stats
- `GET /api/players/leaderboard/batting` - Get batting leaderboard
- `GET /api/players/leaderboard/bowling` - Get bowling leaderboard
- `POST /api/players` - Create new player
- `POST /api/players/:id/image` - Upload player image

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get match details
- `GET /api/matches/:id/stats` - Get match batting/bowling stats
- `POST /api/matches` - Create new match
- `PUT /api/matches/:id` - Update match
- `DELETE /api/matches/:id` - Delete match

## Points Calculation

### Batting Points
- Base: 1 point per run
- Fours: 1 bonus point per four
- Sixes: 2 bonus points per six
- Formula: `Points = Runs + (Fours × 1) + (Sixes × 2)`

### Bowling Points
- Base: 10 points per wicket
- Economy Bonus:
  - Economy < 4: +20 points
  - Economy 4-6: +10 points
  - Economy 6-8: +5 points
  - Economy ≥ 8: No bonus
- Formula: `Points = (Wickets × 10) + Economy Bonus`

## Project Structure

```
cricket-leaderboard-app/
├── server/
│   ├── server.js           # Express server
│   ├── routes/
│   │   ├── players.js       # Player API routes
│   │   └── matches.js       # Match API routes
│   ├── database/
│   │   └── db.js           # Database schema and queries
│   └── uploads/            # Player images
├── public/
│   ├── index.html          # Main leaderboard page
│   ├── add-match.html      # Add/edit match form
│   ├── player-detail.html  # Player statistics page
│   ├── css/
│   │   └── style.css       # Stylesheet
│   ├── js/
│   │   ├── main.js         # Leaderboard logic
│   │   ├── match-form.js   # Match CRUD logic
│   │   └── player-detail.js # Player detail logic
│   └── images/
│       └── default-avatar.png # Default player image
├── package.json
└── README.md
```

## Notes

- Player images are stored in `server/uploads/`
- Database file is created as `server/cricket_leaderboard.db`
- Default port is 3000 (change via PORT environment variable)
- Image upload limit is 5MB per file

