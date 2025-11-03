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
- **Database**: PostgreSQL (via `pg`)
- **File Upload**: Multer

## Local Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Create a `.env` file (for local dev):
```bash
DATABASE_URL=postgres://user:password@host:5432/dbname
NODE_ENV=development
PORT=3000
```

3. Start the server:
```bash
npm start
```

4. Open your browser:
```
http://localhost:3000
```

The database schema is created automatically at startup.

## Render Deployment

1. Create a **PostgreSQL** database on Render (Free tier works)
2. Copy the `Internal Database URL` (preferred) or `External Database URL`
3. In your Web Service on Render, add Environment Variables:
   - `DATABASE_URL` = your Postgres URL
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render sets `PORT`; Node will pick it up, but setting is harmless)

No persistent SQLite file is used; the app uses your Postgres database, so data survives restarts/redeploys.

## Usage

### Adding Players
- Go to "Add Match" page
- When adding batting/bowling stats, select a player
- If the player doesn't exist, use the "Add New Player" button in the form

### Creating a Match
1. Click "Add Match"
2. Enter match date and name
3. Add batting stats for players (runs, balls, fours, sixes)
4. Add bowling stats for players (wickets, runs conceded, overs)
5. Save

### Viewing Leaderboards
- Main page shows batting leaderboard
- Switch to bowling tab for bowling stats
- Click a player to view their history and upload a photo

### Editing/Deleting Matches
- Click "Matches" in the header to see all matches
- Use ✏️ Edit or 🗑️ Delete actions

## API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player with stats
- `GET /api/players/leaderboard/batting` - Batting leaderboard
- `GET /api/players/leaderboard/bowling` - Bowling leaderboard
- `POST /api/players` - Create player
- `POST /api/players/:id/image` - Upload player image

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/:id` - Get match
- `GET /api/matches/:id/stats` - Get match batting/bowling
- `POST /api/matches` - Create match (with stats)
- `PUT /api/matches/:id` - Update match (and stats)
- `DELETE /api/matches/:id` - Delete match

## Points Calculation

### Batting Points
- Base: 1 point per run
- Fours: +1 per four
- Sixes: +2 per six
- Formula: `Points = Runs + (Fours × 1) + (Sixes × 2)`

### Bowling Points
- Base: 10 points per wicket
- Economy Bonus:
  - Economy < 4: +20
  - Economy 4-6: +10
  - Economy 6-8: +5
  - Economy ≥ 8: +0

## Project Structure
```
cricket-leaderboard-app/
├── server/
│   ├── server.js           # Express server
│   ├── routes/
│   │   ├── players.js       # Player API routes
│   │   └── matches.js       # Match API routes
│   ├── database/
│   │   └── db.js           # PostgreSQL pool, schema, and queries
│   └── uploads/            # Player images
├── public/
│   ├── index.html          # Leaderboard
│   ├── matches.html        # Matches list (edit/delete)
│   ├── add-match.html      # Add/edit match
│   ├── player-detail.html  # Player statistics + image upload
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js         # Leaderboard logic
│   │   ├── matches.js      # Matches list logic
│   │   ├── match-form.js   # Match CRUD logic
│   │   └── player-detail.js# Player detail + image upload
│   └── images/
│       └── default-avatar.svg
├── package.json
└── README.md
```

## Notes
- Player images are stored in `server/uploads/`
- Database uses `DATABASE_URL`; schema auto-creates on startup
- Default port is 3000 locally
- Image upload limit is 5MB

