## v5 Key Updates

* **Modular Architecture**: Refactored the codebase from a single script into four distinct files (`index.html`, `style.css`, `data.js`, `ui.js`) for better maintainability.
* **Scalable Player Management**: Removed the 15-player cap, allowing for an unlimited number of players in the database.
* **Advanced Scoring**: Integrated full match scoring (Points For/Against) instead of tracking only wins and losses.
* **Hybrid Wilson Score**: Implemented a sophisticated ranking formula ($0.8 \times \text{WilW} + 0.2 \times \text{WilP}$) that balances win rate with scoring dominance.
* **Enhanced Leaderboard**: Added PF, PA, and PD (Points Difference) columns with a multi-tier sorting hierarchy (Wilson > WilW > PD > W%).
* **Responsive UI**: Designed a mobile-friendly leaderboard that dynamically hides non-essential columns on smaller screens.
* **Unified Match Logic**: Standardized match processing and participant detection across both 1v1 and 2v2 modes using unique IDs.
* **Improved Matchmaking**: Refined the `generateNextMatch` algorithm to strictly prioritize players with fewer `logicGames` using a deterministic sorting pool.
* **Robust Data Portability**: Upgraded export/import functions to bundle match history and state into a single JSON file for cross-device syncing.
