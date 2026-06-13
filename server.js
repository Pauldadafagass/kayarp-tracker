const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== ROBLOX API PROXY ====================

// Share Link auflösen und Place ID finden
async function resolveShareLink(shareLink) {
    try {
        const response = await fetch(shareLink, {
            redirect: 'follow',
            method: 'HEAD',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const finalUrl = response.url;
        console.log('Final URL:', finalUrl);

        // Extrahiere Place ID aus der URL
        const placeIdMatch = finalUrl.match(/\/games\/(\d+)/);
        if (placeIdMatch) {
            return parseInt(placeIdMatch[1]);
        }

        // Alternative: Suche nach Place ID in der URL
        const placeIdMatch2 = finalUrl.match(/placeId=(\d+)/);
        if (placeIdMatch2) {
            return parseInt(placeIdMatch2[1]);
        }

        return null;
    } catch (error) {
        console.error('Fehler beim Auflösen des Links:', error);
        return null;
    }
}

// Universe ID von Place ID bekommen
async function getUniverseId(placeId) {
    try {
        const response = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        const data = await response.json();
        return data.universeId;
    } catch (error) {
        console.error('Fehler bei Universe ID:', error);
        return null;
    }
}

// Spieleranzahl abrufen
async function getPlayerCount(universeId) {
    try {
        const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
        const data = await response.json();

        if (data.data && data.data.length > 0) {
            return {
                playing: data.data[0].playing || 0,
                maxPlayers: data.data[0].maxPlayers || 30,
                visits: data.data[0].visits || 0
            };
        }
        return null;
    } catch (error) {
        console.error('Fehler bei Spieleranzahl:', error);
        return null;
    }
}

// Haupt-API Endpoint
app.get('/api/player-count', async (req, res) => {
    try {
        const shareCode = req.query.code || '5ihdm3h6org3g7';
        const shareLink = `https://www.roblox.com/share?v=v2&code=${shareCode}`;

        console.log('Rufe Spieleranzahl ab für Code:', shareCode);

        // 1. Share Link auflösen
        const placeId = await resolveShareLink(shareLink);
        if (!placeId) {
            return res.json({
                success: false,
                error: 'Konnte Place ID nicht finden',
                code: shareCode
            });
        }

        console.log('Place ID:', placeId);

        // 2. Universe ID holen
        const universeId = await getUniverseId(placeId);
        if (!universeId) {
            return res.json({
                success: false,
                error: 'Konnte Universe ID nicht finden',
                placeId: placeId
            });
        }

        console.log('Universe ID:', universeId);

        // 3. Spieleranzahl abrufen
        const playerData = await getPlayerCount(universeId);
        if (!playerData) {
            return res.json({
                success: false,
                error: 'Konnte Spielerdaten nicht abrufen',
                universeId: universeId
            });
        }

        console.log('Spielerdaten:', playerData);

        // Erfolgreiche Antwort
        res.json({
            success: true,
            code: shareCode,
            placeId: placeId,
            universeId: universeId,
            playerCount: playerData.playing,
            maxPlayers: playerData.maxPlayers,
            visits: playerData.visits,
            shareLink: shareLink,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Server Fehler:', error);
        res.json({
            success: false,
            error: error.message
        });
    }
});

// ==================== FRONTEND ====================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== SERVER STARTEN ====================

app.listen(PORT, () => {
    console.log('🚨 KayaRP - Spieleranzahl Monitor');
    console.log(`🌐 Server läuft auf Port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/player-count?code=DEIN_CODE`);
});