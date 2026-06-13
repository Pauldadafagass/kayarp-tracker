const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== NOTRUF HAMBURG KONFIGURATION ====================
const SERVER_CODE = 'x1qssipp';
const SHARE_LINK = 'https://www.roblox.com/share?v=v2&code=5ihdm3h6iozgyv';
const PLACE_ID = 7711635737; // Notruf Hamburg Place ID

// ==================== ROBLOX API ====================

async function getUniverseId(placeId) {
    try {
        console.log('🔍 Hole Universe ID für Place:', placeId);
        const response = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Universe ID:', data.universeId);
        return data.universeId;
    } catch (error) {
        console.error('❌ Fehler bei Universe ID:', error);
        return null;
    }
}

async function getPlayerCount(universeId) {
    try {
        console.log('👥 Rufe Spieleranzahl ab für Universe:', universeId);
        const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const gameData = data.data[0];
            console.log('✅ Spieler online:', gameData.playing);
            console.log('✅ Max Spieler:', gameData.maxPlayers);
            console.log('✅ Besuche:', gameData.visits);
            
            return {
                playing: gameData.playing || 0,
                maxPlayers: gameData.maxPlayers || 30,
                visits: gameData.visits || 0,
                favorites: gameData.favoritedCount || 0
            };
        }
        return null;
    } catch (error) {
        console.error('❌ Fehler bei Spieleranzahl:', error);
        return null;
    }
}

// API Endpoint für Spieleranzahl
app.get('/api/player-count', async (req, res) => {
    try {
        console.log('\n📊 ===== NEUE ANFRAGE =====');
        console.log('🕐 Zeit:', new Date().toLocaleString('de-DE'));
        console.log('🎮 Place ID:', PLACE_ID);
        console.log('🔑 Server Code:', SERVER_CODE);
        
        // Schritt 1: Universe ID holen
        const universeId = await getUniverseId(PLACE_ID);
        if (!universeId) {
            return res.json({
                success: false,
                error: 'Konnte Universe ID nicht finden'
            });
        }
        
        // Schritt 2: Spieleranzahl abrufen
        const playerData = await getPlayerCount(universeId);
        if (!playerData) {
            return res.json({
                success: false,
                error: 'Konnte Spielerdaten nicht abrufen'
            });
        }
        
        console.log('✅ ===== ERFOLGREICH =====');
        console.log(`👥 ${playerData.playing}/${playerData.maxPlayers} Spieler online\n`);
        
        res.json({
            success: true,
            serverCode: SERVER_CODE,
            placeId: PLACE_ID,
            universeId: universeId,
            playerCount: playerData.playing,
            maxPlayers: playerData.maxPlayers,
            visits: playerData.visits,
            favorites: playerData.favorites,
            shareLink: SHARE_LINK,
            gameLink: `https://www.roblox.com/games/${PLACE_ID}`,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Server Fehler:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        server: 'Notruf Hamburg RP',
        placeId: PLACE_ID,
        code: SERVER_CODE,
        time: new Date().toISOString()
    });
});

// Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log('\n========================================');
    console.log('🚨 NOTRUF HAMBURG RP');
    console.log('📊 Live Spieleranzahl Monitor');
    console.log('========================================');
    console.log(`🌐 Server läuft auf Port ${PORT}`);
    console.log(`🎮 Place ID: ${PLACE_ID}`);
    console.log(`🔑 Server Code: ${SERVER_CODE}`);
    console.log(`🔗 Spiel Link: https://www.roblox.com/games/${PLACE_ID}`);
    console.log('========================================\n');
});
