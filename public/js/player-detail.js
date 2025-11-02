const API_BASE = '/api';
let currentPlayerId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');
    currentPlayerId = playerId;
    
    if (playerId) {
        loadPlayerDetails(playerId);
    } else {
        document.getElementById('player-profile').innerHTML = 
            '<div class="error">Player ID not provided.</div>';
    }
});

async function loadPlayerDetails(playerId) {
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`);
        const player = await response.json();
        
        if (!player) {
            document.getElementById('player-profile').innerHTML = 
                '<div class="error">Player not found.</div>';
            return;
        }
        
        displayPlayerProfile(player);
        displayBattingHistory(player.batting);
        displayBowlingHistory(player.bowling);
    } catch (error) {
        console.error('Error loading player details:', error);
        document.getElementById('player-profile').innerHTML = 
            '<div class="error">Error loading player details. Please try again.</div>';
    }
}

function displayPlayerProfile(player) {
    const profileContainer = document.getElementById('player-profile');
    const imageSrc = player.image_path || 'images/default-avatar.svg';
    
    profileContainer.innerHTML = `
        <div class="profile-card">
            <div class="profile-image">
                <img id="player-image" src="${imageSrc}" alt="${player.name}" onerror="this.src='images/default-avatar.svg'">
                <button class="btn btn-image-upload" onclick="showImageUpload()" title="Upload/Change Photo">
                    📷
                </button>
            </div>
            <div class="profile-info">
                <h2>${player.name}</h2>
            </div>
        </div>
    `;
    
    // Show upload section
    document.getElementById('image-upload-section').style.display = 'block';
}

function showImageUpload() {
    document.getElementById('image-upload').click();
}

async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.match('image.*')) {
        alert('Please select an image file (JPG, PNG, or GIF)');
        return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
    }
    
    // Show progress
    const progressSection = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    progressSection.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading...';
    
    // Create form data
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch(`${API_BASE}/players/${currentPlayerId}/image`, {
            method: 'POST',
            body: formData
        });
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressFill.style.width = progress + '%';
            if (progress >= 90) {
                clearInterval(interval);
            }
        }, 100);
        
        if (response.ok) {
            const result = await response.json();
            progressFill.style.width = '100%';
            progressText.textContent = 'Upload successful!';
            
            // Update image
            const playerImage = document.getElementById('player-image');
            playerImage.src = result.image_path + '?t=' + Date.now();
            
            // Hide progress after delay
            setTimeout(() => {
                progressSection.style.display = 'none';
                progressFill.style.width = '0%';
            }, 2000);
            
            // Reload player details to refresh all stats
            setTimeout(() => {
                loadPlayerDetails(currentPlayerId);
            }, 500);
        } else {
            const error = await response.json();
            clearInterval(interval);
            progressSection.style.display = 'none';
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        progressSection.style.display = 'none';
        alert('Error uploading image. Please try again.');
    }
}

function displayBattingHistory(batting) {
    // Display totals
    document.getElementById('total-runs').textContent = batting.totals.total_runs || 0;
    document.getElementById('batting-points').textContent = batting.totals.total_points || 0;
    document.getElementById('batting-matches').textContent = batting.totals.matches_played || 0;
    document.getElementById('total-fours').textContent = batting.totals.total_fours || 0;
    document.getElementById('total-sixes').textContent = batting.totals.total_sixes || 0;
    
    // Display history
    const historyContainer = document.getElementById('batting-history');
    
    if (batting.history.length === 0) {
        historyContainer.innerHTML = '<div class="empty-state">No batting records yet.</div>';
        return;
    }
    
    historyContainer.innerHTML = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Match Date</th>
                    <th>Match Name</th>
                    <th>Runs</th>
                    <th>Balls</th>
                    <th>4s</th>
                    <th>6s</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>
                ${batting.history.map(match => `
                    <tr>
                        <td>${formatDate(match.match_date)}</td>
                        <td>${match.match_name || 'N/A'}</td>
                        <td>${match.runs}</td>
                        <td>${match.balls_faced || 0}</td>
                        <td>${match.fours || 0}</td>
                        <td>${match.sixes || 0}</td>
                        <td><strong>${match.points}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayBowlingHistory(bowling) {
    // Display totals
    document.getElementById('total-wickets').textContent = bowling.totals.total_wickets || 0;
    document.getElementById('bowling-points').textContent = bowling.totals.total_points || 0;
    document.getElementById('bowling-matches').textContent = bowling.totals.matches_played || 0;
    document.getElementById('total-overs').textContent = bowling.totals.total_overs ? bowling.totals.total_overs.toFixed(1) : 0;
    document.getElementById('total-runs-conceded').textContent = bowling.totals.total_runs_conceded || 0;
    
    // Display history
    const historyContainer = document.getElementById('bowling-history');
    
    if (bowling.history.length === 0) {
        historyContainer.innerHTML = '<div class="empty-state">No bowling records yet.</div>';
        return;
    }
    
    historyContainer.innerHTML = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Match Date</th>
                    <th>Match Name</th>
                    <th>Wickets</th>
                    <th>Runs Conceded</th>
                    <th>Overs</th>
                    <th>Economy</th>
                    <th>Points</th>
                </tr>
            </thead>
            <tbody>
                ${bowling.history.map(match => {
                    const economy = match.overs > 0 ? (match.runs_conceded / match.overs).toFixed(2) : '0.00';
                    return `
                        <tr>
                            <td>${formatDate(match.match_date)}</td>
                            <td>${match.match_name || 'N/A'}</td>
                            <td>${match.wickets}</td>
                            <td>${match.runs_conceded || 0}</td>
                            <td>${match.overs ? match.overs.toFixed(1) : 0}</td>
                            <td>${economy}</td>
                            <td><strong>${match.points}</strong></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

