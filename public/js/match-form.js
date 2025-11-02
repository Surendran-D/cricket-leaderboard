const API_BASE = '/api';

let players = [];
let battingStats = [];
let bowlingStats = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadPlayers();
    
    // Check if editing existing match
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('id');
    if (matchId) {
        await loadMatch(matchId);
        document.getElementById('delete-btn').style.display = 'inline-block';
    }

    document.getElementById('match-form').addEventListener('submit', handleSubmit);
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('match-date').value = today;
});

async function loadPlayers() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        players = await response.json();
        updatePlayerSelects();
    } catch (error) {
        console.error('Error loading players:', error);
        alert('Error loading players. Please refresh the page.');
    }
}

async function loadMatch(matchId) {
    try {
        const response = await fetch(`${API_BASE}/matches/${matchId}/stats`);
        const data = await response.json();
        
        document.getElementById('match-id').value = matchId;
        document.getElementById('match-date').value = data.match.match_date;
        document.getElementById('match-name').value = data.match.match_name || '';
        
        // Load batting stats
        battingStats = data.batting || [];
        const battingContainer = document.getElementById('batting-stats-container');
        battingContainer.innerHTML = '';
        battingStats.forEach((stat, index) => {
            addBattingPlayerRow(stat, index);
        });
        
        // Load bowling stats
        bowlingStats = data.bowling || [];
        const bowlingContainer = document.getElementById('bowling-stats-container');
        bowlingContainer.innerHTML = '';
        bowlingStats.forEach((stat, index) => {
            addBowlingPlayerRow(stat, index);
        });
    } catch (error) {
        console.error('Error loading match:', error);
        alert('Error loading match data.');
    }
}

function updatePlayerSelects() {
    const selects = document.querySelectorAll('.player-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Player</option>' +
            players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function addBattingPlayer() {
    const index = battingStats.length;
    battingStats.push({
        player_id: '',
        runs: 0,
        balls_faced: 0,
        fours: 0,
        sixes: 0
    });
    addBattingPlayerRow(battingStats[index], index);
}

function addBattingPlayerRow(stat, index) {
    const container = document.getElementById('batting-stats-container');
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
        <select class="player-select" data-index="${index}" data-type="batting" required>
            <option value="">Select Player</option>
            ${players.map(p => `<option value="${p.id}" ${stat.player_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
        <input type="number" class="stat-input" placeholder="Runs" value="${stat.runs || ''}" min="0" data-index="${index}" data-type="batting" data-field="runs" required>
        <input type="number" class="stat-input" placeholder="Balls" value="${stat.balls_faced || ''}" min="0" data-index="${index}" data-type="batting" data-field="balls_faced">
        <input type="number" class="stat-input" placeholder="4s" value="${stat.fours || ''}" min="0" data-index="${index}" data-type="batting" data-field="fours">
        <input type="number" class="stat-input" placeholder="6s" value="${stat.sixes || ''}" min="0" data-index="${index}" data-type="batting" data-field="sixes">
        <button type="button" class="btn btn-remove" onclick="removeBattingPlayer(${index})">×</button>
    `;
    container.appendChild(row);
    attachEventListeners(row, index, 'batting');
}

function addBowlingPlayer() {
    const index = bowlingStats.length;
    bowlingStats.push({
        player_id: '',
        wickets: 0,
        runs_conceded: 0,
        overs: 0
    });
    addBowlingPlayerRow(bowlingStats[index], index);
}

function addBowlingPlayerRow(stat, index) {
    const container = document.getElementById('bowling-stats-container');
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
        <select class="player-select" data-index="${index}" data-type="bowling" required>
            <option value="">Select Player</option>
            ${players.map(p => `<option value="${p.id}" ${stat.player_id == p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
        <input type="number" class="stat-input" placeholder="Wickets" value="${stat.wickets || ''}" min="0" data-index="${index}" data-type="bowling" data-field="wickets" required>
        <input type="number" class="stat-input" placeholder="Runs Conceded" value="${stat.runs_conceded || ''}" min="0" data-index="${index}" data-type="bowling" data-field="runs_conceded" step="0.1">
        <input type="number" class="stat-input" placeholder="Overs" value="${stat.overs || ''}" min="0" data-index="${index}" data-type="bowling" data-field="overs" step="0.1">
        <button type="button" class="btn btn-remove" onclick="removeBowlingPlayer(${index})">×</button>
    `;
    container.appendChild(row);
    attachEventListeners(row, index, 'bowling');
}

function attachEventListeners(row, index, type) {
    const select = row.querySelector('.player-select');
    select.addEventListener('change', (e) => {
        const statArray = type === 'batting' ? battingStats : bowlingStats;
        statArray[index].player_id = parseInt(e.target.value);
    });

    const inputs = row.querySelectorAll('.stat-input');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const statArray = type === 'batting' ? battingStats : bowlingStats;
            const field = e.target.getAttribute('data-field');
            statArray[index][field] = parseFloat(e.target.value) || 0;
        });
    });
}

function removeBattingPlayer(index) {
    battingStats.splice(index, 1);
    renderBattingStats();
}

function removeBowlingPlayer(index) {
    bowlingStats.splice(index, 1);
    renderBowlingStats();
}

function renderBattingStats() {
    const container = document.getElementById('batting-stats-container');
    container.innerHTML = '';
    battingStats.forEach((stat, index) => {
        addBattingPlayerRow(stat, index);
    });
}

function renderBowlingStats() {
    const container = document.getElementById('bowling-stats-container');
    container.innerHTML = '';
    bowlingStats.forEach((stat, index) => {
        addBowlingPlayerRow(stat, index);
    });
}

async function handleSubmit(e) {
    e.preventDefault();
    
    const matchId = document.getElementById('match-id').value;
    const matchDate = document.getElementById('match-date').value;
    const matchName = document.getElementById('match-name').value;
    
    // Validate form
    if (!matchDate) {
        alert('Please select a match date.');
        return;
    }
    
    // Collect batting stats
    const batting = battingStats.filter(stat => stat.player_id && stat.runs !== undefined);
    
    // Collect bowling stats
    const bowling = bowlingStats.filter(stat => stat.player_id && stat.wickets !== undefined);
    
    if (batting.length === 0 && bowling.length === 0) {
        alert('Please add at least one player with batting or bowling stats.');
        return;
    }
    
    const matchData = {
        match_date: matchDate,
        match_name: matchName || null,
        batting_stats: batting,
        bowling_stats: bowling
    };
    
    try {
        let response;
        if (matchId) {
            // Update existing match
            response = await fetch(`${API_BASE}/matches/${matchId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(matchData)
            });
        } else {
            // Create new match
            response = await fetch(`${API_BASE}/matches`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(matchData)
            });
        }
        
        if (response.ok) {
            alert('Match saved successfully!');
            window.location.href = 'index.html';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error saving match:', error);
        alert('Error saving match. Please try again.');
    }
}

async function deleteMatch() {
    const matchId = document.getElementById('match-id').value;
    if (!matchId) return;
    
    if (!confirm('Are you sure you want to delete this match? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/matches/${matchId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Match deleted successfully!');
            window.location.href = 'index.html';
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error deleting match:', error);
        alert('Error deleting match. Please try again.');
    }
}

function showAddPlayerModal() {
    document.getElementById('add-player-modal').style.display = 'block';
    document.getElementById('new-player-name').focus();
}

function closeAddPlayerModal() {
    document.getElementById('add-player-modal').style.display = 'none';
    document.getElementById('add-player-form').reset();
}

async function createPlayer(event) {
    event.preventDefault();
    
    const playerName = document.getElementById('new-player-name').value.trim();
    
    if (!playerName) {
        alert('Please enter a player name.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: playerName })
        });
        
        if (response.ok) {
            const newPlayer = await response.json();
            players.push({ id: newPlayer.id, name: newPlayer.name });
            updatePlayerSelects();
            closeAddPlayerModal();
            alert(`Player "${playerName}" created successfully!`);
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error creating player:', error);
        alert('Error creating player. Please try again.');
    }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('add-player-modal');
    if (event.target == modal) {
        closeAddPlayerModal();
    }
}

