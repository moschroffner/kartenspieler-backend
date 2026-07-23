const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

const rooms = new Map();

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kartenspieler</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: #1a1a2e; color: white; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .container { max-width: 500px; width: 90%; padding: 20px; }
    .screen { display: none; }
    .screen.active { display: block; }
    h1 { text-align: center; margin-bottom: 30px; font-size: 32px; }
    button { width: 100%; padding: 15px; margin: 10px 0; background: #2196F3; color: white; border: none; border-radius: 5px; font-size: 16px; cursor: pointer; }
    button:hover { background: #1976D2; }
    input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #444; border-radius: 5px; background: #2a2a2a; color: white; }
    .code { font-size: 24px; font-weight: bold; text-align: center; background: #ffeb3b; color: black; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .status { text-align: center; color: #aaa; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="screen active" id="home">
      <h1>🎴 Kartenspieler</h1>
      <button onclick="startGame('watten')">🎴 Watten</button>
      <button onclick="startGame('schnellen')">⚡ Schnellen</button>
    </div>

    <div class="screen" id="game">
      <h1 id="gameTitle">Spiel</h1>
      <button onclick="createRoom()" class="btn-green">➕ Neues Spiel</button>
      <div style="text-align: center; margin: 20px 0;">— oder —</div>
      <input type="text" id="code" placeholder="Code eingeben..." maxlength="6">
      <button onclick="joinRoom()">✅ Beitreten</button>
      <button onclick="goHome()">← Zurück</button>
    </div>

    <div class="screen" id="playing">
      <h1 id="playingTitle">Spielen</h1>
      <div class="code" id="roomCode">ABC123</div>
      <div class="status" id="status">Warte auf Spieler...</div>
      <button onclick="goHome()">← Zurück</button>
    </div>
  </div>

  <script>
    let gameType = null;
    let roomCode = null;
    let playerId = Math.random().toString(36).substr(2, 9);
    let ws = null;

    function showScreen(id) {
      document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }

    function startGame(type) {
      gameType = type;
      document.getElementById('gameTitle').textContent = type === 'watten' ? '🎴 Watten' : '⚡ Schnellen';
      showScreen('game');
    }

    function goHome() {
      gameType = null;
      roomCode = null;
      document.getElementById('code').value = '';
      showScreen('home');
      if (ws) ws.close();
    }

    function connectWS() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      ws = new WebSocket(protocol + '//' + host + '/ws');

      ws.onopen = () => {
        console.log('Verbunden!');
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === 'roomCreated') {
          roomCode = msg.roomCode;
          document.getElementById('roomCode').textContent = roomCode;
          document.getElementById('playingTitle').textContent = gameType === 'watten' ? '🎴 Watten' : '⚡ Schnellen';
          showScreen('playing');
          document.getElementById('status').textContent = 'Code: ' + roomCode + ' - Warte auf Spieler...';
        }
        if (msg.type === 'joinedRoom') {
          roomCode = msg.roomCode;
          document.getElementById('roomCode').textContent = roomCode;
          document.getElementById('playingTitle').textContent = gameType === 'watten' ? '🎴 Watten' : '⚡ Schnellen';
          showScreen('playing');
          document.getElementById('status').textContent = 'Beigetreten! ✅';
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket Error:', e);
        document.getElementById('status').textContent = 'Fehler: Keine Verbindung';
      };
    }

    function createRoom() {
      connectWS();
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'createRoom', playerId, gameType }));
        }
      }, 200);
    }

    function joinRoom() {
      const code = document.getElementById('code').value.toUpperCase();
      if (!code) {
        alert('Code eingeben!');
        return;
      }
      roomCode = code;
      connectWS();
      setTimeout(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'joinRoom', playerId, roomCode: code, gameType }));
        }
      }, 200);
    }
  </script>
</body>
</html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

wss.on('connection', (ws) => {
  console.log('Player connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      const { type, playerId, gameType, roomCode } = msg;

      if (type === 'createRoom') {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        rooms.set(code, { code, gameType, players: [{ id: playerId, ws }] });
        console.log('Room created:', code);
        ws.send(JSON.stringify({ type: 'roomCreated', roomCode: code }));
      }

      if (type === 'joinRoom') {
        const room = rooms.get(roomCode);
        if (room && room.players.length < 4) {
          room.players.push({ id: playerId, ws });
          console.log('Player joined:', roomCode);
          ws.send(JSON.stringify({ type: 'joinedRoom', roomCode }));
        } else {
          ws.send(JSON.stringify({ type: 'error', msg: 'Room voll oder nicht vorhanden' }));
        }
      }
    } catch (e) {
      console.error('Error:', e);
    }
  });

  ws.on('close', () => console.log('Player disconnected'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('Server running on port', PORT);
});
