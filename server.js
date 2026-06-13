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

// ==================== ROBLOX API ====================

async function resolveShareLink(shareLink) {
    try {
        console.log('🔍 Löse Share Link auf:', shareLink);
        
        const response = await fetch(shareLink, {
            redirect: 'follow',
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const finalUrl = response.url;
        const body = await response.text();
        
        console.log('📄 Final URL:', finalUrl);
        
        // Versuche Place ID aus der finalen URL zu extrahieren
        let placeId = null;
        
        // Methode 1: /games/PLACE_ID/...
        const match1 = finalUrl.match(/\/games\/(\d+)/);
        if (match1) placeId = parseInt(match1[1]);
        
        // Methode 2: placeId= in URL
        if (!placeId) {
            const match2 = finalUrl.match(/placeId=(\d+)/);
            if (match2) placeId = parseInt(match2[1]);
        }
        
        // Methode 3: Suche im HTML Body nach placeId
        if (!placeId) {
            const match3 = body.match(/"placeId":(\d+)/);
            if (match3) placeId = parseInt(match3[1]);
        }
        
        // Methode 4: Suche nach universeId
        if (!placeId) {
            const match4 = body.match(/"universeId":(\d+)/);
            if (match4) {
                // Wenn wir universeId haben, können wir die Place ID später finden
                console.log('📊 Universe ID aus HTML:', match4[1]);
            }
        }
        
        console.log('✅ Place ID gefunden:', placeId);
        return placeId;
        
    } catch (error) {
        console.error('❌ Fehler beim Auflösen:', error);
        return null;
    }
}

async function getUniverseId(placeId) {
    try {
        console.log('🔍 Hole Universe ID für Place:', placeId);
        const response = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
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
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const gameData = data.data[0];
            console.log('✅ Spieler online:', gameData.playing);
            console.log('✅ Max Spieler:', gameData.maxPlayers);
            console.log('✅ Besuche:', gameData.visits);
            return {
                playing: gameData.playing || 0,
                maxPlayers: gameData.maxPlayers || 30,
                visits: gameData.visits || 0
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
        console.log('🔑 Server Code:', SERVER_CODE);
        
        // Schritt 1: Share Link auflösen
        const placeId = await resolveShareLink(SHARE_LINK);
        if (!placeId) {
            console.log('❌ Keine Place ID gefunden!');
            return res.json({
                success: false,
                error: 'Konnte Place ID nicht finden. Bitte überprüfe den Share Link.'
            });
        }
        
        // Schritt 2: Universe ID holen
        const universeId = await getUniverseId(placeId);
        if (!universeId) {
            return res.json({
                success: false,
                error: 'Konnte Universe ID nicht finden'
            });
        }
        
        // Schritt 3: Spieleranzahl abrufen
        const playerData = await getPlayerCount(universeId);
        if (!playerData) {
            return res.json({
                success: false,
                error: 'Konnte Spielerdaten nicht abrufen'
            });
        }
        
        console.log('✅ ===== ERFOLGREICH =====\n');
        
        res.json({
            success: true,
            serverCode: SERVER_CODE,
            placeId: placeId,
            universeId: universeId,
            playerCount: playerData.playing,
            maxPlayers: playerData.maxPlayers,
            visits: playerData.visits,
            shareLink: SHARE_LINK,
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
    console.log('📊 Spieleranzahl Monitor');
    console.log('========================================');
    console.log(`🌐 Server läuft auf Port ${PORT}`);
    console.log(`🔑 Server Code: ${SERVER_CODE}`);
    console.log(`🔗 Share Link: ${SHARE_LINK}`);
    console.log('========================================\n');
});
