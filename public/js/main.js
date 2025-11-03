const API_BASE = '/api';

// Tab switching functionality
document.addEventListener('DOMContentLoaded', () => {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load data for active tab
            if (targetTab === 'batting') {
                loadBattingLeaderboard();
            } else {
                loadBowlingLeaderboard();
            }
        });
    });

    // Load initial data
    loadBattingLeaderboard();
});

async function loadBattingLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/players/leaderboard/batting`);
        const data = await response.json();
        const players = Array.isArray(data) ? data : [];
        displayBattingLeaderboard(players);
    } catch (error) {
        console.error('Error loading batting leaderboard:', error);
        document.getElementById('batting-leaderboard').innerHTML = 
            '<div class="error">Error loading leaderboard. Please try again.</div>';
    }
}

async function loadBowlingLeaderboard() {
    try {
        const response = await fetch(`${API_BASE}/players/leaderboard/bowling`);
        const data = await response.json();
        const players = Array.isArray(data) ? data : [];
        displayBowlingLeaderboard(players);
    } catch (error) {
        console.error('Error loading bowling leaderboard:', error);
        document.getElementById('bowling-leaderboard').innerHTML = 
            '<div class="error">Error loading leaderboard. Please try again.</div>';
    }
}

function displayBattingLeaderboard(players) {
    const container = document.getElementById('batting-leaderboard');
    
    if (!Array.isArray(players) || players.length === 0) {
        container.innerHTML = '<div class="empty-state">No batting records yet. Add a match to get started!</div>';
        return;
    }

    container.innerHTML = players.map((player, index) => {
        const rank = index + 1;
        const imageSrc = player.image_path || 'images/default-avatar.svg';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        
        return `
            <div class="player-card" onclick="viewPlayer(${player.id})">
                <div class="player-rank">${medal} #${rank}</div>
                <div class="player-image">
                    <img src="${imageSrc}" alt="${player.name}" onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="player-info">
                    <h3 class="player-name">${player.name}</h3>
                    <div class="player-stats">
                        <div class="stat-item">
                            <span class="stat-label">Points</span>
                            <span class="stat-value highlight">${player.total_points || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Runs</span>
                            <span class="stat-value">${player.total_runs || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">4s</span>
                            <span class="stat-value">${player.total_fours || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">6s</span>
                            <span class="stat-value">${player.total_sixes || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Matches</span>
                            <span class="stat-value">${player.matches_played || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function displayBowlingLeaderboard(players) {
    const container = document.getElementById('bowling-leaderboard');
    
    if (!Array.isArray(players) || players.length === 0) {
        container.innerHTML = '<div class="empty-state">No bowling records yet. Add a match to get started!</div>';
        return;
    }

    container.innerHTML = players.map((player, index) => {
        const rank = index + 1;
        const imageSrc = player.image_path || 'images/default-avatar.svg';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        const economy = player.total_overs > 0 ? (player.total_runs_conceded / player.total_overs).toFixed(2) : '0.00';
        
        return `
            <div class="player-card" onclick="viewPlayer(${player.id})">
                <div class="player-rank">${medal} #${rank}</div>
                <div class="player-image">
                    <img src="${imageSrc}" alt="${player.name}" onerror="this.src='images/default-avatar.svg'">
                </div>
                <div class="player-info">
                    <h3 class="player-name">${player.name}</h3>
                    <div class="player-stats">
                        <div class="stat-item">
                            <span class="stat-label">Points</span>
                            <span class="stat-value highlight">${player.total_points || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Wickets</span>
                            <span class="stat-value">${player.total_wickets || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Overs</span>
                            <span class="stat-value">${player.total_overs ? player.total_overs.toFixed(1) : 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Economy</span>
                            <span class="stat-value">${economy}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Matches</span>
                            <span class="stat-value">${player.matches_played || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function viewPlayer(playerId) {
    window.location.href = `player-detail.html?id=${playerId}`;
}

