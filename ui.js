function renderHistory() {
    const container = document.getElementById('historyList');
    const dropdown = document.getElementById('historyFilter');
    const filterId = dropdown.value || 'all'; // Remember what was selected

    // 1. Always rebuild the dropdown to reflect name changes or new players
    dropdown.innerHTML = '<option value="all">All Players</option>';
    players.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.innerText = p.name;
        dropdown.appendChild(opt);
    });
    
    // Restore the user's previous selection
    dropdown.value = filterId;

    // 2. Filter by Mode (v1 vs v2)
    let filtered = history.filter(m => m.mode === currentMode);

    // 3. Filter by Player
    if (filterId !== 'all') {
        filtered = filtered.filter(m => 
            m.teamA.some(p => p.id == filterId) || m.teamB.some(p => p.id == filterId)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">No games found.</p>`;
        return;
    }

    // 4. Render last 10 games
    container.innerHTML = filtered.slice(0, 10).map(m => `
        <div class="history-row">
            <div class="history-date">
                <span>${m.timestamp}</span>
                <div>
                    <span style="color: var(--primary); cursor: pointer; margin-right: 10px;" onclick="editGame(${m.id})">Edit</span>
                    <span style="color: var(--accent); cursor: pointer;" onclick="deleteGame(${m.id})">Delete</span>
                </div>
            </div>
            <div style="${m.winner === 'A' ? 'color: var(--success); font-weight: bold;' : ''}">
                ${m.teamA.map(p => p.name).join(' & ')}
            </div>
            <div class="history-score">${m.scoreA} - ${m.scoreB}</div>
            <div style="${m.winner === 'B' ? 'color: var(--success); font-weight: bold;' : ''}">
                ${m.teamB.map(p => p.name).join(' & ')}
            </div>
        </div>
    `).join('');
}

function updateLeaderboard() {
    const tbody = document.querySelector('#leaderboard tbody');
    const headerRow = document.querySelector('#leaderboard thead tr');
    if (!tbody) return;

    // 1. Update Table Headers for the new columns
    headerRow.innerHTML = `
        <th>Player</th><th>P</th><th>W</th>
        <th class="col-pf">PF</th><th class="col-pa">PA</th><th>PD</th>
        <th>W%</th><th class="col-wilw">WilW</th><th class="col-wilp">WilP</th>
        <th>Wilson</th>
    `;

    // 2. Map players to their calculated stats
    const leaderboardData = players
        .filter(p => p[currentMode].actualGames > 0 || p.isChecked)
        .map(p => {
            const stats = {
                name: p.name,
                p: 0, w: 0, pf: 0, pa: 0, pd: 0,
                wilW: 0, wilP: 0, finalWilson: 0, winRate: 0
            };

            // Calculate points and wins from history
            history.filter(m => m.mode === currentMode).forEach(m => {
                const onTeamA = m.teamA.some(player => player.id === p.id);
                const onTeamB = m.teamB.some(player => player.id === p.id);

                if (onTeamA || onTeamB) {
                    stats.p++;
                    const myScore = onTeamA ? m.scoreA : m.scoreB;
                    const oppScore = onTeamA ? m.scoreB : m.scoreA;
                    const won = (onTeamA && m.winner === 'A') || (onTeamB && m.winner === 'B');

                    if (won) stats.w++;
                    stats.pf += myScore;
                    stats.pa += oppScore;
                }
            });

            stats.pd = stats.pf - stats.pa;
            stats.winRate = stats.p ? (stats.w / stats.p) : 0;

            // Calculate Hybrid Wilson
            // Wilson Wins: Wins / Total Games
            stats.wilW = getWilsonScore(stats.w, stats.p);
            // Wilson Points: Points For / Total Points Played (PF + PA)
            stats.wilP = getWilsonScore(stats.pf, (stats.pf + stats.pa));
            
            stats.finalWilson = (0.8 * stats.wilW) + (0.2 * stats.wilP);

            return stats;
        });

    // 3. Sorting Hierarchy
    leaderboardData.sort((a, b) => {
        if (b.finalWilson !== a.finalWilson) return b.finalWilson - a.finalWilson;
        if (b.wilW !== a.wilW) return b.wilW - a.wilW;
        if (b.pd !== a.pd) return b.pd - a.pd;
        return b.winRate - a.winRate;
    });

    // 4. Render Row
    tbody.innerHTML = leaderboardData.map(s => `
        <tr>
            <td>${s.name}</td>
            <td>${s.p}</td>
            <td>${s.w}</td>
            <td class="col-pf">${s.pf}</td>
            <td class="col-pa">${s.pa}</td>
            <td>${s.pd > 0 ? '+' + s.pd : s.pd}</td>
            <td>${Math.round(s.winRate * 100)}%</td>
            <td class="col-wilw">${s.wilW.toFixed(1)}</td>
            <td class="col-wilp">${s.wilP.toFixed(1)}</td>
            <td style="font-weight:bold; color:var(--primary)">${s.finalWilson.toFixed(1)}</td>
        </tr>
    `).join('');

    if (currentMode === 'v2') updatePairsLeaderboard();
}

function updatePairsLeaderboard() {
    const pairsTabBtn = document.getElementById('pairsTabBtn');
    
    // Only show the Pairs tab if we are in 2v2 mode
    if (currentMode !== 'v2') {
        pairsTabBtn.style.display = 'none';
        if (document.getElementById('tab-pairs').classList.contains('active')) openTab('indiv');
        return;
    }
    pairsTabBtn.style.display = 'block';

    const pairs = {};
    history.filter(m => m.mode === 'v2').forEach(m => {
        ['teamA', 'teamB'].forEach(tKey => {
            const teamNames = m[tKey].map(p => p.name).sort(); // SORTING ensures P2&P3 == P3&P2
            const pairKey = teamNames.join(" & ");
            if (!pairs[pairKey]) pairs[pairKey] = { wins: 0, games: 0 };
            pairs[pairKey].games++;
            if ((tKey === 'teamA' && m.winner === 'A') || (tKey === 'teamB' && m.winner === 'B')) {
                pairs[pairKey].wins++;
            }
        });
    });

    const sortedPairs = Object.entries(pairs).sort((a, b) => (b[1].wins / b[1].games) - (a[1].wins / a[1].games));

    document.querySelector('#pairsLeaderboard tbody').innerHTML = sortedPairs.map(([names, stats]) => {
        const winRate = ((stats.wins / stats.games) * 100).toFixed(0);
        return `<tr>
            <td>${names}</td>
            <td>${stats.games}</td> <!-- Played -->
            <td>${stats.wins}</td>  <!-- Won -->
            <td>${winRate}%</td>    <!-- Win % -->
        </tr>`;
    }).join('');
}

function openTab(tabId) {
    // Switch button highlight
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Switch content visibility
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    // Refresh the specific data
    if(tabId === 'pairs') updatePairsLeaderboard();
    if(tabId === 'history') renderHistory();
}

function displayMatch() {
    const shuffleBtn = document.getElementById('shuffleBtn');
    shuffleBtn.style.display = (currentMode === 'v2') ? 'block' : 'none';

    if (currentMode === 'v2') {
        document.getElementById('teamA').innerHTML = `<div class="player-name">${currentMatch.teamA[0].name}</div><div class="ampersand">&</div><div class="player-name">${currentMatch.teamA[1].name}</div>`;
        document.getElementById('teamB').innerHTML = `<div class="player-name">${currentMatch.teamB[0].name}</div><div class="ampersand">&</div><div class="player-name">${currentMatch.teamB[1].name}</div>`;
    } else {
        document.getElementById('teamA').innerHTML = `<div class="player-name">${currentMatch.teamA[0].name}</div>`;
        document.getElementById('teamB').innerHTML = `<div class="player-name">${currentMatch.teamB[0].name}</div>`;
    }
}

function setMode(mode) {
    if (mode === currentMode) return;
    if (confirm(`Switch to ${mode === 'v1' ? '1 vs 1' : '2 vs 2'}? This resets 'L' priority badges.`)) {
        currentMode = mode;
        players.forEach(p => { p.logicGames = 0; });
        document.getElementById('btnV1').classList.toggle('active', mode === 'v1');
        document.getElementById('btnV2').classList.toggle('active', mode === 'v2');
        document.getElementById('leaderboardTitle').innerText = mode === 'v1' ? '1v1 Leaderboard' : '2v2 Leaderboard';
        document.getElementById('currentMatchArea').style.display = 'none';
        save(); renderInputs(); updateLeaderboard();
    }
}

function renderInputs() {
    const container = document.getElementById('playerInputs');
    container.innerHTML = '';
    players.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'player-row';
        div.innerHTML = `
            <input type="checkbox" ${p.isChecked ? 'checked' : ''} onchange="togglePlayer(${p.id})">
            <input type="text" value="${p.name}" onchange="updateName(${p.id}, this.value)">
            <span class="badge">L:${p.logicGames || 0}</span>
        `;
        container.appendChild(div);
    });
}

function addPlayer() {
    const newPlayer = {
        id: Date.now(), // Creates a unique ID based on the exact millisecond
        name: `New Player`,
        isChecked: false, 
        logicGames: 0,
        v2: { actualGames: 0, wins: 0 },
        v1: { actualGames: 0, wins: 0 }
    };
    players.push(newPlayer);
    save();
    renderInputs();
}

function togglePlayer(id) { 
    const p = players.find(player => player.id === id);
    if (!p) return;

    p.isChecked = !p.isChecked;

    if (p.isChecked) {
        const others = players.filter(pl => pl.isChecked && pl.id !== id);
        if (others.length > 0) {
            const minL = Math.min(...others.map(pl => pl.logicGames || 0));
            p.logicGames = minL;
        } else {
            p.logicGames = 0;
        }
    } else {
        p.logicGames = 0;
    }

    save(); 
    renderInputs(); 
    updateLeaderboard();
}

function updateName(id, val) { 
    const p = players.find(player => player.id === id);
    if (p) {
        p.name = val.trim() || `Player`; 
        save(); 
        updateLeaderboard();
    }
}

function generateNextMatch() {
    const available = players.filter(p => p.isChecked);
    const required = currentMode === 'v1' ? 2 : 4;
    if (available.length < required) return alert(`Need at least ${required} checked players!`);

    // Combine sorting into a single operation
    let pool = [...available].sort((a, b) => {
        const countA = a.logicGames || 0;
        const countB = b.logicGames || 0;

        // Primary Sort: Least logic games first
        if (countA !== countB) {
            return countA - countB;
        }
        
        // Secondary Sort: Random tie-breaker if logic games are equal
        return Math.random() - 0.5;
    });

    const selected = pool.slice(0, required);

    // Balance the teams based on Win Rate
    const getRate = (p) => {
        const s = p[currentMode];
        return s.actualGames === 0 ? 50 : (s.wins / s.actualGames) * 100;
    };
    
    selected.sort((a, b) => getRate(b) - getRate(a));

    if (currentMode === 'v2') {
        // Strongest + Weakest vs Middle two
        currentMatch = { 
            teamA: [selected[0], selected[3]], 
            teamB: [selected[1], selected[2]] 
        };
    } else {
        currentMatch = { teamA: [selected[0]], teamB: [selected[1]] };
    }
    
    displayMatch();
    save();
    document.getElementById('currentMatchArea').style.display = 'block';
}

function shufflePairs() {
    if (!currentMatch || currentMode !== 'v2') return;
    const all = [...currentMatch.teamA, ...currentMatch.teamB].sort(() => Math.random() - 0.5);
    currentMatch.teamA = [all[0], all[1]];
    currentMatch.teamB = [all[2], all[3]];
    displayMatch();
    save();
}

function setQuickScore(team) {
    if (team === 'A') {
        document.getElementById('scoreA').value = 11;
        document.getElementById('scoreB').focus();
        document.getElementById('scoreB').select(); // Highlights the 0 so you can just type over it
    } else {
        document.getElementById('scoreB').value = 11;
        document.getElementById('scoreA').focus();
        document.getElementById('scoreA').select();
    }
}

function exportData() {
    // Create the same bundle used for localStorage
    const data = {
        players: players,
        currentMatch: currentMatch,
        currentMode: currentMode,
        history: history 
    };
    const dataStr = JSON.stringify(data, null, 2); // Export EVERYTHING
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; 
    a.download = `tt_mixer_dual_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            
            // Check if it's the new "bundle" format
            if (imported.players && imported.history) {
                players = imported.players;
                history = imported.history;
                currentMode = imported.currentMode || 'v2';
                currentMatch = imported.currentMatch || null;
                
                save(); // Sync to localStorage
                
                // Refresh all UI parts
                renderInputs(); 
                updateLeaderboard(); 
                renderHistory(); // Ensure history tab updates too
                if (currentMatch) displayMatch(); // Show the match if one was in progress
                
                alert("Full database imported successfully!");
            } else if (Array.isArray(imported)) {
                // Fallback for your old "players only" exports
                players = imported;
                save();
                renderInputs();
                updateLeaderboard();
                alert("Player list imported (History was not found in this file).");
            }
        } catch (err) { 
            alert("Invalid file format."); 
            console.error(err);
        }
    };
    reader.readAsText(file);
}

function resetData() {
    if(confirm("Wipe EVERYTHING?")) { localStorage.removeItem('tt_elite_dual_data'); location.reload(); }
}

function resetSession() {
    if (confirm("Reset 'L' rotation?")) {
        players.forEach(p => { p.logicGames = 0; });
        save(); renderInputs();
    }
}

function resetLeaderboard() {
    if (confirm(`Wipe all ${currentMode} stats?`)) {
        players.forEach(p => { p[currentMode].actualGames = 0; p[currentMode].wins = 0; p.logicGames = 0; });
        save(); renderInputs(); updateLeaderboard();
    }
}

load(); renderInputs(); updateLeaderboard();