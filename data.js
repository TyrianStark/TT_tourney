let players = [];
let currentMode = 'v2';
let currentMatch = null;
let history = [];

function load() {
    const raw = localStorage.getItem('tt_elite_dual_data');
    if (raw) {
        let data = JSON.parse(raw);
        
        if (Array.isArray(data)) data = { players: data };

        players = data.players || [];
        currentMatch = data.currentMatch || null;
        currentMode = data.currentMode || 'v2';
        history = data.history || []; 

        document.getElementById('btnV1').classList.toggle('active', currentMode === 'v1');
        document.getElementById('btnV2').classList.toggle('active', currentMode === 'v2');
        document.getElementById('leaderboardTitle').innerText = currentMode === 'v1' ? '1v1 Leaderboard' : '2v2 Leaderboard';

        if (currentMatch) {
            displayMatch();
            document.getElementById('currentMatchArea').style.display = 'block';
        }
        
        if (typeof renderHistory === 'function') renderHistory();
        if (typeof updateLeaderboard === 'function') updateLeaderboard();
    } else {
        players = [1, 2, 3, 4].map(num => ({
            id: Date.now() + num, 
            name: `Player ${num}`, 
            isChecked: false, 
            logicGames: 0,
            v2: { actualGames: 0, wins: 0 },
            v1: { actualGames: 0, wins: 0 }
        }));
        history = []; // Start fresh
    }
}

function save() { 
    const data = {
        players: players,
        currentMatch: currentMatch,
        currentMode: currentMode,
        history: history 
    };
    localStorage.setItem('tt_elite_dual_data', JSON.stringify(data)); 
}

function getWilsonScore(wins, total) {
    if (total === 0) return 0;
    const z = 1.96; const phat = wins / total;
    const score = (phat + (z * z) / (2 * total) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * total)) / total)) / (1 + (z * z) / total);
    return score * 100;
}

function finishMatch() {
    const sA = parseInt(document.getElementById('scoreA').value) || 0;
    const sB = parseInt(document.getElementById('scoreB').value) || 0;
    
    if (sA === sB) return alert("Please enter a winning and losing score (no ties).");
    if (!currentMatch) return alert("No active match to record.");

    const winner = sA > sB ? 'A' : 'B';
    
    // Identify participants by IDs to avoid object reference issues
    const teamAIds = currentMatch.teamA.map(p => p.id);
    const teamBIds = currentMatch.teamB.map(p => p.id);
    const winningIds = winner === 'A' ? teamAIds : teamBIds;
    
    // 3. Update Player Stats & Logic Games (MATCHING BY ID)
    players.forEach(p => {
        if (teamAIds.includes(p.id) || teamBIds.includes(p.id)) {
            // Use currentMode ('v1' or 'v2') to access the sub-object
            p[currentMode].actualGames++; 
            p.logicGames = (p.logicGames || 0) + 1; 
            if (winningIds.includes(p.id)) {
                p[currentMode].wins++;
            }
        }
    });

    // 4. Create History Entry
    const matchRecord = {
        id: Date.now(),
        mode: currentMode,
        teamA: currentMatch.teamA.map(p => ({id: p.id, name: p.name})),
        teamB: currentMatch.teamB.map(p => ({id: p.id, name: p.name})),
        scoreA: sA,
        scoreB: sB,
        winner: winner,
        timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    
    history.unshift(matchRecord);

    // 5. Cleanup and Save
    currentMatch = null;
    document.getElementById('currentMatchArea').style.display = 'none';
    document.getElementById('scoreA').value = 0;
    document.getElementById('scoreB').value = 0;
    
    save(); 

    // IMPORTANT: You must call these to see the changes on the screen!
    if (typeof renderInputs === 'function') renderInputs();
    if (typeof updateLeaderboard === 'function') updateLeaderboard();
    if (typeof renderHistory === 'function') renderHistory();
}

function editGame(gameId) {
    const m = history.find(h => h.id === gameId);
    if (!m) return;

    if (currentMatch) {
        if (!confirm("An active match is already in progress. Overwrite it with this history record?")) return;
    }

    // 1. Move data back to currentMatch
    currentMatch = {
        teamA: m.teamA,
        teamB: m.teamB
    };
    currentMode = m.mode;

    // 2. Set the UI inputs to the old scores
    document.getElementById('scoreA').value = m.scoreA;
    document.getElementById('scoreB').value = m.scoreB;
    
    // 3. Remove it from history (undoing the stats)
    deleteGame(gameId, true); 

    // 4. Update UI
    displayMatch();
    document.getElementById('currentMatchArea').style.display = 'block';
    document.getElementById('btnV1').classList.toggle('active', currentMode === 'v1');
    document.getElementById('btnV2').classList.toggle('active', currentMode === 'v2');
    
    save();
    if (typeof renderInputs === 'function') renderInputs();
    if (typeof updateLeaderboard === 'function') updateLeaderboard();
    if (typeof renderHistory === 'function') renderHistory();
    // Scroll to top so user sees the "Current Match" area
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteGame(gameId, silent = false) {
    if (!silent && !confirm("Delete this match? Stats will be reverted.")) return;

    const idx = history.findIndex(m => m.id === gameId);
    if (idx === -1) return;

    const m = history[idx];
    const involvedIds = [...m.teamA.map(p => p.id), ...m.teamB.map(p => p.id)];
    const winningIds = (m.winner === 'A' ? m.teamA : m.teamB).map(p => p.id);

    players.forEach(p => {
        if (involvedIds.includes(p.id)) {
            p[m.mode].actualGames = Math.max(0, p[m.mode].actualGames - 1);
            p.logicGames = Math.max(0, (p.logicGames || 0) - 1);
            if (winningIds.includes(p.id)) {
                p[m.mode].wins = Math.max(0, p[m.mode].wins - 1);
            }
        }
    });

    history.splice(idx, 1);
    if (!silent) {
        save();
        if (typeof renderInputs === 'function') renderInputs();
        if (typeof updateLeaderboard === 'function') updateLeaderboard();
        if (typeof renderHistory === 'function') renderHistory();
    }
}
