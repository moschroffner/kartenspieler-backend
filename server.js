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
const playerWebSockets = new Map();

wss.on('connection', (ws) => {
  console.log('New player connected');

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);
      const { playerId, type, gameType, roomCode } = msg;

      console.log(`Message from ${playerId}: ${type}`);

      if (type === 'createRoom') {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        const room = {
          code,
          gameType,
          players: [playerId],
          createdAt: Date.now()
        };
        rooms.set(code, room);
        playerSessions.set(playerId, code);
        playerWebSockets.set(playerId, ws);

        console.log(`Room created: ${code}`);

        ws.send(JSON.stringify({
          type: 'roomCreated',
          roomCode: code,
          playerId: playerId
        }));
      }

      if (type === 'joinRoom') {
        const room = rooms.get(roomCode);
        if (room && room.players.length < 4) {
          room.players.push(playerId);
          playerSessions.set(playerId, roomCode);
          playerWebSockets.set(playerId, ws);

          console.log(`Player ${playerId} joined room ${roomCode}`);

          ws.send(JSON.stringify({
            type: 'joinedRoom',
            roomCode: roomCode,
            playerId: playerId
          }));

          // Notify others
          room.players.forEach(pid => {
            const playerWs = playerWebSockets.get(pid);
            if (playerWs && playerWs.readyState === WebSocket.OPEN) {
              playerWs.send(JSON.stringify({
                type: 'playerJoined',
                players: room.players,
                roomCode: roomCode
              }));
            }
          });
        }
      }

    } catch (err) {
      console.error('Error:', err);
    }
  });

  ws.on('close', () => {
    console.log('Player disconnected');
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
