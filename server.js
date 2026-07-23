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
const playerSessions = new Map();

const SUITS = ['♥', '♦', '♣', '♠'];
const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

wss.on('connection', (ws) => {
  console.log('New player connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      
      if (msg.type === 'createRoom') {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        rooms.set(code, {
          code,
          players: [msg.playerId],
          gameType: msg.gameType,
          created: Date.now()
        });
        playerSessions.set(msg.playerId, code);
        ws.send(JSON.stringify({ type: 'roomCreated', roomCode: code }));
      }

      if (msg.type === 'joinRoom') {
        const room = rooms.get(msg.roomCode);
        if (room && room.players.length < 4) {
          room.players.push(msg.playerId);
          playerSessions.set(msg.playerId, msg.roomCode);
          ws.send(JSON.stringify({ type: 'joinedRoom', roomCode: msg.roomCode }));
        }
      }

    } catch (err) {
      console.error('Error:', err);
    }
  });

  ws.on('close', () => {
    console.log('Player disconnected');
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
