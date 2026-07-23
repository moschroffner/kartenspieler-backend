const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const rooms = new Map();
const playerWebSockets = new Map();

// Serve HTML
const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kartenspieler</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { max-width: 600px; width: 100%; padding: 20px; }
        .screen { display: none; }
        .screen.active { display: block; animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .home { text-align: center; }
        .home h1 { font-size: 48px; margin-bottom: 10px; }
        .home h2 { color: #94a3b8; font-size: 24px; margin-bottom: 40px; }
        button {
            width: 100%;
            padding: 16px;
            margin-bottom: 16px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
            color: white;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        .btn-watten { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); }
        .btn-schnellen { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); }
        .btn-primary { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); }
        .btn-secondary { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            margin-bottom: 12px;
            border: 2px solid #334155;
            border-radius: 8px;
            font-size: 16px;
            text-align: center;
            text-transform: uppercase;
            font-family: monospace;
            background: #1e293b;
            color: white;
        }
        .divider { text-align: center; color: #64748b; margin: 20px 0; }
        .game-header { text-align: center; margin-bottom: 20px; }
        .game-header h1 { font-size: 36px; color: white; margin-bottom: 10px; }
        .room-code { font-size: 12px; color: #94a3b8; font-family: monospace; font-weight: bold; }
        .scores { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .score-card { padding: 20px; border-radius: 8px; text-align: center; color: white; }
        .score-card-1 { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); }
        .score-card-2 { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); }
        .score-card-label { font-size: 12px; opacity: 0.8; margin-bottom: 8px; }
        .score-card-value { font-size: 32px; font-weight: bold; }
        .status-box { background: #1e293b; border: 2px solid #334155; border-radius: 8px; padding: 16px; text-align: center; color: #cbd5e1; margin-bottom: 20px; }
        .current-play { background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px; color: white; }
        .current-play-label { font-size: 12px; opacity: 0.9; margin-bottom: 8px; }
        .current-play-value { font-size: 36px; font-weight: bold; }
        .waiting { text-align: center; color: #94a3b8; }
        .waiting-spinner { font-size: 48px; animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="screen active" id="home">
            <div class="home">
                <h1>🎴</h1>
                <h2>Kartenspieler</h2>
                <button class="btn-watten" onclick="selectGame('watten')">🎴 Watten</button>
                <button class="btn-schnellen" onclick="selectGame('schnellen')">⚡ Schnellen</button>
            </div>
        </div>

        <div class="screen" id="gameSelect">
            <h2 style="text-align: center; color: white; margin-bottom: 30px;" id="gameSelectTitle">Spiel</h2>
            <button class="btn-primary" onclick="createRoom()">➕ Neues Spiel</button>
            <div class="divider">— oder —</div>
            <input type="text" id="codeInput" placeholder="Code eingeben..." maxlength="6">
            <button class="btn-secondary" onclick="joinRoom()">✅ Beitreten</button>
            <button class="btn-secondary" onclick="goHome()" style="margin-top: 20px;">← Zurück</button>
        </div>

        <div class="screen" id="gameScreen">
            <div class="game-header">
                <h1 id="gameTitle">🎴</h1>
                <div class="room-code">Room: <span id="roomCodeDisplay">---</span></div>
            </div>
            <div class="status-box" id="statusBox">Verbindung wird hergestellt...</div>
            <button class="btn-secondary" onclick="goHome()">← Zurück</button>
        </div>
    </div>

    <script>
        let gameType = null;
        let roomCode = null;
        let playerId = Math.random().toString(36).substr(2, 9);
        let ws = null;

        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
        }

        function selectGame(type) {
            gameType = type;
            document.getElementById('gameSelectTitle').textContent = type === 'watten' ? '🎴 Watten' : '⚡ Schnellen';
            showScreen('gameSelect');
        }

        function goHome() {
            gameType = null;
            roomCode = null;
            document.getElementById('codeInput').value = '';
            showScreen('home');
        }

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + window.location.host + '/ws');

            ws.onopen = () => {
                console.log('Connected');
            };

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'roomCreated') {
                    roomCode = msg.roomCode;
                    showGameScreen();
                    updateStatus('Raum erstellt: ' + roomCode);
                }
                if (msg.type === 'joinedRoom') {
                    showGameScreen();
                    updateStatus('Beigetreten!');
                }
            };

            ws.onerror = (err) => {
                console.error('Error:', err);
                updateStatus('❌ Verbindungsfehler');
            };
        }

        function sendMessage(type, data = {}) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type, playerId, roomCode, ...data }));
            }
        }

        function createRoom() {
            connectWebSocket();
            setTimeout(() => {
                sendMessage('createRoom', { gameType });
            }, 500);
        }

        function joinRoom() {
            const code = document.getElementById('codeInput').value.toUpperCase();
            if (!code) {
                alert('Code eingeben!');
                return;
            }
            roomCode = code;
            connectWebSocket();
            setTimeout(() => {
                sendMessage('joinRoom', { roomCode: code, gameType });
            }, 500);
        }

        function showGameScreen() {
            document.getElementById('gameTitle').textContent = gameType === 'watten' ? '🎴 Watten' : '⚡ Schnellen';
            document.getElementById('roomCodeDisplay').textContent = roomCode;
            showScreen('gameScreen');
        }

        function updateStatus(msg) {
            document.getElementById('statusBox').textContent = msg;
        }

        showScreen('home');
    </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlContent);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

wss.on('connection', (ws) => {
  console.log('New player');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      const { playerId, type, gameType, roomCode } = msg;

      if (type === 'createRoom') {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        const room = { code, gameType, players: [playerId] };
        rooms.set(code, room);
        playerWebSockets.set(playerId, ws);

        ws.send(JSON.stringify({ type: 'roomCreated', roomCode: code }));
      }

      if (type === 'joinRoom') {
        const room = rooms.get(roomCode);
        if (room && room.players.length < 4) {
          room.players.push(playerId);
          playerWebSockets.set(playerId, ws);
          ws.send(JSON.stringify({ type: 'joinedRoom', roomCode }));
        }
      }
    } catch (err) {
      console.error('Error:', err);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});
