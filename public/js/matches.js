const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadMatches();
});

async function loadMatches() {
    try {
        const response = await fetch(`${API_BASE}/matches`);
        const matches = await response.json();
        displayMatches(matches);
    } catch (error) {
        console.error('Error loading matches:', error);
        document.getElementById('matches-container').innerHTML = 
            '<div class="error">Error loading matches. Please try again.</div>';
    }
}

function displayMatches(matches) {
    const container = document.getElementById('matches-container');
    
    if (matches.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No matches found.</p>
                <button class="btn btn-primary" onclick="window.location.href='add-match.html'">Add First Match</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="matches-grid">
            ${matches.map(match => `
                <div class="match-card">
                    <div class="match-header">
                        <div class="match-date">
                            <span class="date-icon">📅</span>
                            <span>${formatDate(match.match_date)}</span>
                        </div>
                        <div class="match-actions">
                            <button class="btn btn-small btn-primary" onclick="editMatch(${match.id})">✏️ Edit</button>
                            <button class="btn btn-small btn-danger" onclick="deleteMatchConfirm(${match.id})">🗑️ Delete</button>
                        </div>
                    </div>
                    <div class="match-name">
                        <h3>${match.match_name || 'Untitled Match'}</h3>
                    </div>
                    <div class="match-footer">
                        <button class="btn btn-secondary" onclick="viewMatchStats(${match.id})">View Details</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
}

function editMatch(matchId) {
    window.location.href = `add-match.html?id=${matchId}`;
}

function viewMatchStats(matchId) {
    window.location.href = `match-detail.html?id=${matchId}`;
}

async function deleteMatchConfirm(matchId) {
    if (!confirm('Are you sure you want to delete this match? This will also delete all batting and bowling stats for this match. This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/matches/${matchId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            alert('Match deleted successfully!');
            loadMatches();
        } else {
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (error) {
        console.error('Error deleting match:', error);
        alert('Error deleting match. Please try again.');
    }
}

