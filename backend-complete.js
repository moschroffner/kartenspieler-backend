import React, { useState, useEffect, useRef } from 'react';

export default function CardGameApp() {
  const [screen, setScreen] = useState('home');
  const [gameType, setGameType] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [gameState, setGameState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedSuit, setSelectedSuit] = useState(null);
  const wsRef = useRef(null);

  // Initialize WebSocket
  useEffect(() => {
    const pid = Math.random().toString(36).substr(2, 9);
    setPlayerId(pid);

    const ws = new WebSocket('wss://your-backend-url.com/ws');

    ws.onopen = () => {
      console.log('Connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'gameState') {
        setGameState(message.state);
      }
      if (message.type === 'roomCreated') {
        setRoomCode(message.roomCode);
        setGameState(message.state);
        setScreen(gameType === 'watten' ? 'watten' : 'schnellen');
      }
    };

    ws.onerror = (err) => console.error('WS Error:', err);
    wsRef.current = ws;

    return () => ws.close();
  }, []);

  const sendMessage = (type, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          playerId,
          roomCode,
          ...data
        })
      );
    }
  };

  const createRoom = () => {
    sendMessage('createRoom', { gameType });
  };

  const joinRoom = () => {
    if (inputCode.trim()) {
      sendMessage('joinRoom', { roomCode: inputCode.toUpperCase() });
      setRoomCode(inputCode.toUpperCase());
      setScreen(gameType === 'watten' ? 'watten' : 'schnellen');
    }
  };

  // ============ HOME SCREEN ============
  if (screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <h1 className="text-5xl font-bold text-white mb-2">🎴</h1>
          <h1 className="text-4xl font-bold text-white mb-8">Kartenspieler</h1>
          <p className="text-gray-400 mb-8">Watten & Schnellen</p>
          <button
            onClick={() => {
              setGameType('watten');
              setScreen('gameSelect');
            }}
            className="w-full mb-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-lg text-lg transition transform hover:scale-105"
          >
            🎴 Watten
          </button>
          <button
            onClick={() => {
              setGameType('schnellen');
              setScreen('gameSelect');
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg text-lg transition transform hover:scale-105"
          >
            ⚡ Schnellen
          </button>
        </div>
      </div>
    );
  }

  // ============ GAME SELECT SCREEN ============
  if (screen === 'gameSelect') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            {gameType === 'watten' ? '🎴 Watten' : '⚡ Schnellen'}
          </h2>
          <button
            onClick={createRoom}
            className="w-full mb-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-lg text-lg transition transform hover:scale-105"
          >
            ➕ Neues Spiel
          </button>
          <div className="mb-4 text-gray-400 text-center">— oder —</div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Code eingeben..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength="6"
              className="w-full px-4 py-3 rounded-lg text-lg uppercase text-center font-mono bg-slate-700 text-white border-2 border-slate-600 focus:border-blue-500 outline-none"
            />
            <button
              onClick={joinRoom}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg text-lg transition transform hover:scale-105"
            >
              ✅ Beitreten
            </button>
          </div>
          <button
            onClick={() => {
              setScreen('home');
              setGameType(null);
              setInputCode('');
            }}
            className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            ← Zurück
          </button>
        </div>
      </div>
    );
  }

  // ============ WATTEN GAME ============
  if (screen === 'watten' && gameState?.type === 'watten') {
    const currentPlayer = gameState.players.find((p) => p.id === playerId);

    if (!currentPlayer) {
      return (
        <div className="min-h-screen bg-green-900 flex items-center justify-center">
          <div className="text-white text-center">
            <p className="mb-4">Warte auf Spieler...</p>
            <div className="animate-spin text-3xl">🎴</div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-800 p-4">
        <div className="max-w-2xl mx-auto">
          {/* HEADER */}
          <div className="text-center mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-white text-sm">Room: <span className="font-mono font-bold">{roomCode}</span></div>
              <div className="text-white text-sm">Runde {gameState.round}</div>
            </div>
          </div>

          {/* TEAM SCORES */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-600 rounded-lg p-4 text-center">
              <p className="text-blue-100 text-xs mb-1">🔵 Team 1</p>
              <p className="text-white text-3xl font-bold">{gameState.teams[0].score}</p>
            </div>
            <div className="bg-red-600 rounded-lg p-4 text-center">
              <p className="text-red-100 text-xs mb-1">🔴 Team 2</p>
              <p className="text-white text-3xl font-bold">{gameState.teams[1].score}</p>
            </div>
          </div>

          {/* CURRENT PLAY */}
          {gameState.currentRound && (gameState.currentRound.suit || gameState.currentRound.rank) && (
            <div className="bg-yellow-500 rounded-lg p-6 mb-6 text-center shadow-lg">
              <p className="text-white text-sm mb-2 font-semibold">Aktuelle Runde:</p>
              <div className="text-4xl font-bold text-white">
                {gameState.currentRound.rank} {gameState.currentRound.suit}
              </div>
              {gameState.currentRound.raisedTo === 3 && (
                <p className="text-white text-sm mt-2 font-bold">⬆️ Erhöht auf 3 Punkte!</p>
              )}
            </div>
          )}

          {/* OPPONENT CARDS DISPLAY */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {gameState.players
              .filter((p) => p.id !== playerId)
              .map((player) => (
                <div key={player.id} className="bg-slate-700 rounded-lg p-3 text-center">
                  <p className="text-gray-300 text-xs mb-1">{player.name}</p>
                  <p className="text-white text-lg font-bold">🂠 × {player.hand.length}</p>
                  <p className="text-gray-400 text-xs mt-1">Team {player.team + 1}</p>
                </div>
              ))}
          </div>

          {/* PLAYER'S HAND */}
          <div className="mb-6">
            <p className="text-white text-sm mb-3 font-semibold">Deine Hand ({currentPlayer.hand.length}):</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {currentPlayer.hand.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (gameState.status === 'playing' || gameState.status === 'announcing_suit') {
                      sendMessage('playCard', { cardIndex: idx });
                    } else if (gameState.status === 'announcing_suit') {
                      setSelectedCards([idx]);
                      setScreen('watten_announce');
                    }
                  }}
                  className={`w-16 h-24 rounded-lg font-bold text-center flex flex-col items-center justify-center transition transform hover:scale-110 ${
                    selectedCards.includes(idx)
                      ? 'bg-yellow-500 border-2 border-yellow-300'
                      : 'bg-gradient-to-br from-white to-gray-100 border-2 border-gray-300'
                  } shadow-lg`}
                >
                  <span className="text-xs">{card.rank}</span>
                  <span className="text-2xl">{card.suit}</span>
                </button>
              ))}
            </div>
          </div>

          {/* RAISE BUTTON */}
          {gameState.status === 'announcing_suit' && gameState.currentRound.canRaise && (
            <button
              onClick={() => sendMessage('raisePoints')}
              className="w-full mb-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition transform hover:scale-105"
            >
              🔼 Auf 3 Punkte erhöhen!
            </button>
          )}

          {/* GAME STATUS */}
          <div className="bg-slate-800 rounded-lg p-3 text-center text-gray-300 text-sm">
            <p>{gameState.status}</p>
          </div>
        </div>
      </div>
    );
  }

  // ============ SCHNELLEN GAME ============
  if (screen === 'schnellen' && gameState?.type === 'schnellen') {
    const currentPlayer = gameState.players.find((p) => p.id === playerId);

    if (!currentPlayer) {
      return (
        <div className="min-h-screen bg-blue-900 flex items-center justify-center">
          <div className="text-white text-center">
            <p className="mb-4">Warte auf Spieler...</p>
            <div className="animate-spin text-3xl">⚡</div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-800 p-4">
        <div className="max-w-2xl mx-auto">
          {/* HEADER */}
          <div className="text-center mb-4">
            <div className="flex justify-between items-center">
              <div className="text-white text-sm">Room: <span className="font-mono font-bold">{roomCode}</span></div>
              <div className={`text-sm font-bold px-3 py-1 rounded ${gameState.doublePoints ? 'bg-red-600 text-white' : 'text-gray-400'}`}>
                {gameState.doublePoints ? '🔴 Doppelte Punkte' : 'Einfach'}
              </div>
            </div>
          </div>

          {/* CURRENT SUIT */}
          {gameState.currentSuit && (
            <div className="bg-yellow-500 rounded-lg p-6 mb-6 text-center shadow-lg">
              <p className="text-white text-sm mb-2 font-semibold">Aktuelle Farbe:</p>
              <p className="text-5xl">{gameState.currentSuit}</p>
            </div>
          )}

          {/* PLAYER SCORES */}
          <div className="mb-6 space-y-2">
            <p className="text-white text-sm font-semibold">Punktestand:</p>
            {gameState.players.map((player) => (
              <div
                key={player.id}
                className={`flex justify-between items-center p-3 rounded-lg transition ${
                  player.id === playerId
                    ? 'bg-blue-600 border-2 border-blue-400'
                    : 'bg-slate-700'
                } ${player.spanisch ? 'border-orange-400 border-2' : ''}`}
              >
                <div className="flex-1">
                  <span className="text-white font-semibold">{player.name}</span>
                  {player.isDealer && <span className="text-yellow-300 text-xs ml-2">🎰 Dealer</span>}
                  {player.spanisch && <span className="text-orange-300 text-xs ml-2">📍 Gespannt</span>}
                </div>
                <span className={`text-2xl font-bold ${player.points === 0 ? 'text-green-400' : 'text-white'}`}>
                  {player.points}
                </span>
              </div>
            ))}
          </div>

          {/* PLAYER'S HAND */}
          <div className="mb-6">
            <p className="text-white text-sm mb-3 font-semibold">Deine Hand ({currentPlayer.hand.length}):</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {currentPlayer.hand.map((card, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (gameState.currentPhase === 'playing') {
                      sendMessage('playCard', { cardIndex: idx });
                    } else if (gameState.currentPhase === 'exchange') {
                      if (selectedCards.includes(idx)) {
                        setSelectedCards(selectedCards.filter(i => i !== idx));
                      } else if (selectedCards.length < 4) {
                        setSelectedCards([...selectedCards, idx]);
                      }
                    }
                  }}
                  className={`w-16 h-24 rounded-lg font-bold text-center flex flex-col items-center justify-center transition transform hover:scale-110 ${
                    selectedCards.includes(idx)
                      ? 'bg-yellow-500 border-2 border-yellow-300'
                      : 'bg-gradient-to-br from-white to-gray-100 border-2 border-gray-300'
                  } shadow-lg`}
                >
                  <span className="text-xs">{card.rank}</span>
                  <span className="text-2xl">{card.suit}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ACTION BUTTONS - ANNOUNCEMENT PHASE */}
          {gameState.currentPhase === 'announcement' && !currentPlayer.announced && (
            <div className="space-y-2 mb-4">
              <p className="text-white text-sm font-semibold text-center">Wie viele Stiche?</p>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2, 3, 4, 5].map((tricks) => (
                  <button
                    key={tricks}
                    onClick={() => sendMessage('announceTricks', { tricks })}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition"
                  >
                    {tricks}
                  </button>
                ))}
              </div>
              {currentPlayer.isDealer && (
                <button
                  onClick={() => sendMessage('sayBeiMir')}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg transition"
                >
                  🎰 Bei mir!
                </button>
              )}
            </div>
          )}

          {/* ACTION BUTTONS - SUIT SELECTION */}
          {gameState.currentPhase === 'choosing_suit' && gameState.highestAnnouncer === playerId && (
            <div className="space-y-2 mb-4">
              <p className="text-white text-sm font-semibold text-center">Wähle die Farbe:</p>
              <div className="grid grid-cols-4 gap-2">
                {['♥', '♦', '♣', '♠'].map((suit) => (
                  <button
                    key={suit}
                    onClick={() => sendMessage('chooseSuit', { suit })}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg text-2xl transition"
                  >
                    {suit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ACTION BUTTONS - EXCHANGE PHASE */}
          {gameState.currentPhase === 'exchange' && (
            <div className="space-y-2 mb-4">
              <p className="text-white text-sm font-semibold text-center">Wähle bis zu 4 Karten zum Tauschen:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => sendMessage('exchangeCards', { cardIndices: selectedCards })}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
                >
                  ✅ {selectedCards.length > 0 ? `${selectedCards.length} tauschen` : 'Fertig'}
                </button>
                <button
                  onClick={() => {
                    sendMessage('passExchange');
                    setSelectedCards([]);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition"
                >
                  ❌ Gehen (+2)
                </button>
              </div>
            </div>
          )}

          {/* GAME STATUS */}
          <div className="bg-slate-800 rounded-lg p-3 text-center text-gray-300 text-sm">
            <p>{gameState.status}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white text-center">
        <p className="mb-4">Verbindung wird hergestellt...</p>
        <div className="animate-spin text-3xl">🔄</div>
      </div>
    </div>
  );
}
