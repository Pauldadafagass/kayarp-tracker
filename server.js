const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==================== KONFIGURATION ====================
const CONFIG = {
    placeId: 7711635737,
    privateServerCode: 'x1qssipp',
    privateServerLink: 'https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow'
};

let gameData = {
    playerCount: 0,
    maxPlayers: 0,
    visits: 0,
    favorites: 0,
    lastUpdate: null
};

// ==================== ÖFFENTLICHE API ====================

async function fetchGameData() {
    try {
        console.log('\n📊 Rufe Notruf Hamburg Daten ab...');
        
        // Universe ID holen
        const uniRes = await fetch(`https://apis.roblox.com/universes/v1/places/${CONFIG.placeId}/universe`);
        const uniData = await uniRes.json();
        
        // Spielerdaten holen
        const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${uniData.universeId}`);
        const gameDataRes = await gameRes.json();
        
        if (gameDataRes.data && gameDataRes.data.length > 0) {
            const game = gameDataRes.data[0];
            gameData.playerCount = game.playing || 0;
            gameData.maxPlayers = game.maxPlayers || 30;
            gameData.visits = game.visits || 0;
            gameData.favorites = game.favoritedCount || 0;
            gameData.lastUpdate = new Date().toISOString();
            
            console.log(`✅ Spieler: ${gameData.playerCount}/${gameData.maxPlayers}`);
        }
    } catch (error) {
        console.error('❌', error.message);
    }
}

// ==================== API ====================

app.get('/api/players', async (req, res) => {
    await fetchGameData();
    
    res.json({
        success: true,
        playerCount: gameData.playerCount,
        maxPlayers: gameData.maxPlayers,
        visits: gameData.visits,
        favorites: gameData.favorites,
        placeId: CONFIG.placeId,
        serverCode: CONFIG.privateServerCode,
        joinLink: CONFIG.privateServerLink,
        timestamp: gameData.lastUpdate
    });
});

// ==================== FRONTEND ====================

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>x1qssipp - Notruf Hamburg Private Server</title>
    <meta property="og:title" content="x1qssipp - Notruf Hamburg">
    <meta property="og:description" content="Private Server Spieleranzahl Live">
    <meta name="theme-color" content="#ff4444">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{
            font-family:'Segoe UI',Arial,sans-serif;
            background:#060609;
            min-height:100vh;
            display:flex;
            justify-content:center;
            align-items:center;
            padding:20px;
            background-image:radial-gradient(ellipse at top,rgba(255,68,68,.1),transparent 50%);
        }
        .card{
            background:#0d0d14;
            border:1px solid #1a1a28;
            border-radius:24px;
            padding:35px 25px;
            text-align:center;
            max-width:500px;
            width:100%;
            box-shadow:0 20px 60px rgba(0,0,0,.6);
            position:relative;
        }
        .card::before{
            content:'';
            position:absolute;
            top:0;left:30px;right:30px;
            height:2px;
            background:linear-gradient(90deg,transparent,#ff4444,#ff6666,transparent);
        }
        .icon{font-size:65px;margin-bottom:15px;animation:float 3s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        h1{color:#fff;font-size:28px;font-weight:800;margin-bottom:2px}
        .sub{color:#ff4444;font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:5px}
        .code-badge{
            display:inline-block;
            background:rgba(255,68,68,.15);
            color:#ff6666;
            padding:6px 16px;
            border-radius:8px;
            font-size:18px;
            font-family:monospace;
            font-weight:bold;
            letter-spacing:3px;
            margin-bottom:8px;
            border:1px solid rgba(255,68,68,.3);
        }
        .private-badge{
            display:inline-block;
            background:rgba(255,165,0,.15);
            color:#ffa500;
            padding:3px 10px;
            border-radius:6px;
            font-size:10px;
            font-weight:700;
            letter-spacing:2px;
            margin-bottom:20px;
            border:1px solid rgba(255,165,0,.3);
        }
        .status{
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:8px 20px;
            border-radius:50px;
            font-size:13px;
            font-weight:700;
            margin-bottom:25px;
        }
        .status.live{background:rgba(46,213,115,.15);color:#2ed573;border:1px solid rgba(46,213,115,.3)}
        .status.empty{background:rgba(255,165,0,.15);color:#ffa500;border:1px solid rgba(255,165,0,.3)}
        .dot{width:8px;height:8px;border-radius:50%;background:currentColor;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .counter{
            background:linear-gradient(135deg,rgba(255,68,68,.1),rgba(255,0,0,.03));
            border:2px solid rgba(255,68,68,.2);
            border-radius:24px;
            padding:35px 20px;
            margin:20px 0;
        }
        .bignum{
            font-size:130px;
            font-weight:900;
            background:linear-gradient(180deg,#ff6666,#ff4444,#cc0000);
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
            background-clip:text;
            line-height:1;
            margin-bottom:5px;
        }
        .biglabel{color:#664444;font-size:13px;letter-spacing:5px;text-transform:uppercase}
        .info-box{
            background:rgba(255,165,0,.05);
            border:1px solid rgba(255,165,0,.15);
            border-radius:12px;
            padding:12px;
            margin:15px 0;
            color:#ffa500;
            font-size:11px;
            line-height:1.5;
        }
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}
        .item{background:rgba(255,255,255,.02);border:1px solid #1c1c28;border-radius:14px;padding:16px;text-align:left}
        .ilabel{color:#555;font-size:10px;letter-spacing:1.5px;margin-bottom:6px;font-weight:600}
        .ivalue{color:#fff;font-size:17px;font-weight:700}
        .ivalue.code{color:#ff6666;font-family:monospace;font-size:13px}
        .join-btn{
            display:inline-block;
            background:linear-gradient(135deg,#ff4444,#cc0000);
            color:#fff;
            text-decoration:none;
            padding:15px 35px;
            border-radius:14px;
            font-size:15px;
            font-weight:700;
            margin:12px 0;
            letter-spacing:1px;
            transition:.3s;
        }
        .join-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(255,68,68,.4)}
        .footer{color:#2a2a3a;font-size:11px;margin-top:18px}
        @media(max-width:480px){
            .card{padding:25px 18px}
            h1{font-size:24px}
            .bignum{font-size:90px}
            .grid{grid-template-columns:1fr}
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🚨</div>
        <h1>Notruf Hamburg</h1>
        <div class="sub">ROLEPLAY SERVER</div>
        <div class="code-badge">x1qssipp</div>
        <div class="private-badge">🔒 PRIVATE SERVER</div>
        
        <div id="status" class="status empty"><span class="dot"></span><span>LÄDT...</span></div>
        
        <div class="counter">
            <div id="count" class="bignum">--</div>
            <div class="biglabel">Spieler Online</div>
        </div>
        
        <div class="info-box">
            💡 Zeigt alle Spieler auf Notruf Hamburg Servern.<br>
            Tritt deinem Private Server bei um zu sehen wer drauf ist!
        </div>
        
        <div class="grid">
            <div class="item">
                <div class="ilabel">MAX SPIELER</div>
                <div class="ivalue" id="max">--</div>
            </div>
            <div class="item">
                <div class="ilabel">SERVER CODE</div>
                <div class="ivalue code">x1qssipp</div>
            </div>
            <div class="item">
                <div class="ilabel">BESUCHE GESAMT</div>
                <div class="ivalue" id="visits">--</div>
            </div>
            <div class="item">
                <div class="ilabel">LETZTES UPDATE</div>
                <div class="ivalue" id="time" style="font-size:13px;">--</div>
            </div>
        </div>
        
        <a href="https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow" target="_blank" class="join-btn">
            🎮 PRIVATE SERVER BEITRETEN
        </a>
        
        <div class="footer">🔄 Live-Daten • Aktualisiert alle 30 Sekunden</div>
    </div>
    
    <script>
        async function loadData(){
            try{
                const response = await fetch('/api/players');
                const data = await response.json();
                
                document.getElementById('count').textContent = data.playerCount;
                document.getElementById('max').textContent = data.maxPlayers;
                document.getElementById('visits').textContent = data.visits ? data.visits.toLocaleString('de-DE') : '--';
                document.getElementById('time').textContent = new Date(data.timestamp).toLocaleTimeString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
                
                const status = document.getElementById('status');
                if (data.playerCount > 0) {
                    status.className = 'status live';
                    status.innerHTML = '<span class="dot"></span><span>' + data.playerCount + ' SPIELER ONLINE</span>';
                } else {
                    status.className = 'status empty';
                    status.innerHTML = '<span class="dot"></span><span>KEINE SPIELER</span>';
                }
            } catch (error) {
                console.error('Fehler:', error);
                document.getElementById('count').textContent = '--';
            }
        }
        
        // Erster Aufruf
        loadData();
        
        // Alle 30 Sekunden aktualisieren
        setInterval(loadData, 30000);
        
        console.log('🚨 x1qssipp Monitor gestartet');
    </script>
</body>
</html>`);
});

// ==================== START ====================

app.listen(PORT, async () => {
    console.log('\n╔══════════════════════════════════╗');
    console.log('║  🚨 NOTRUF HAMBURG RP         ║');
    console.log('║  🔒 Private Server Monitor    ║');
    console.log('╚══════════════════════════════════╝');
    console.log(`🌐 Server läuft auf Port ${PORT}`);
    console.log(`🎮 Place ID: ${CONFIG.placeId}`);
    console.log(`🔑 Code: ${CONFIG.privateServerCode}`);
    console.log(`🔗 Join: ${CONFIG.privateServerLink}`);
    console.log('✅ Öffentliche API - Kein API Key nötig!\n');
    
    // Erste Abfrage
    await fetchGameData();
    
    // Auto-Update
    setInterval(fetchGameData, 30000);
});
