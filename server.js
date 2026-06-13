const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== BOT KONFIGURATION ====================
const BOT = {
    username: 'kayabot21',
    password: 'Paul123456789',
    placeId: 7711635737,
    privateServerCode: '5ihdm3h6sl5aow',
    privateServerLink: 'https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow'
};

// Bot State
let botState = {
    loggedIn: false,
    csrfToken: '',
    authCookie: '',
    userId: null,
    playerCount: 0,
    maxPlayers: 15,
    visits: 0,
    favorites: 0,
    lastUpdate: null,
    error: null
};

// ==================== BOT LOGIN ====================

async function botLogin() {
    try {
        console.log('\n🤖 Bot wird eingeloggt...');
        console.log(`   Username: ${BOT.username}`);
        
        const response = await fetch('https://auth.roblox.com/v2/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                ctype: 'Username',
                cvalue: BOT.username,
                password: BOT.password
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Login fehlgeschlagen: ${response.status} - ${errorText}`);
        }
        
        // Cookies extrahieren
        const cookies = response.headers.get('set-cookie');
        const robloSecurity = cookies.match(/\.ROBLOSECURITY=([^;]+)/);
        
        if (!robloSecurity) {
            throw new Error('Kein .ROBLOSECURITY Cookie gefunden');
        }
        
        botState.authCookie = `.ROBLOSECURITY=${robloSecurity[1]}`;
        botState.csrfToken = response.headers.get('x-csrf-token') || '';
        
        // User Info holen
        const userResponse = await fetch('https://users.roblox.com/v1/users/authenticated', {
            headers: {
                'Cookie': botState.authCookie,
                'Accept': 'application/json'
            }
        });
        
        if (userResponse.ok) {
            const userData = await userResponse.json();
            botState.userId = userData.id;
            console.log(`✅ Bot eingeloggt als: ${userData.name} (ID: ${userData.id})`);
        }
        
        botState.loggedIn = true;
        botState.error = null;
        
    } catch (error) {
        console.error('❌ Bot Login Fehler:', error.message);
        botState.loggedIn = false;
        botState.error = error.message;
    }
}

// ==================== PRIVATE SERVER BEITRETEN ====================

async function joinPrivateServer() {
    try {
        if (!botState.loggedIn) {
            await botLogin();
        }
        
        console.log('\n🎮 Bot joint Private Server...');
        console.log(`   Code: ${BOT.privateServerCode}`);
        console.log(`   Link: ${BOT.privateServerLink}`);
        
        // CSRF Token sicherstellen
        if (!botState.csrfToken) {
            const csrfRes = await fetch('https://auth.roblox.com/v2/logout', {
                method: 'POST',
                headers: { 'Cookie': botState.authCookie }
            });
            botState.csrfToken = csrfRes.headers.get('x-csrf-token') || '';
        }
        
        // Private Server beitreten über Share Link
        const joinResponse = await fetch(BOT.privateServerLink, {
            method: 'GET',
            headers: {
                'Cookie': botState.authCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            },
            redirect: 'follow'
        });
        
        console.log(`   Join Status: ${joinResponse.status}`);
        console.log(`   Final URL: ${joinResponse.url}`);
        
        // Wichtig: Der Bot ist jetzt "im Server" und kann Daten sehen
        
    } catch (error) {
        console.error('❌ Join Fehler:', error.message);
        botState.error = error.message;
    }
}

// ==================== SPIELERDATEN ABRUFEN ====================

async function getPlayerData() {
    try {
        if (!botState.loggedIn) {
            await botLogin();
        }
        
        console.log('\n📊 Rufe Spielerdaten ab...');
        
        // Methode 1: Universe API (für öffentliche Daten)
        const universeRes = await fetch(
            `https://apis.roblox.com/universes/v1/places/${BOT.placeId}/universe`
        );
        
        if (!universeRes.ok) {
            throw new Error(`Universe API Fehler: ${universeRes.status}`);
        }
        
        const universeData = await universeRes.json();
        console.log(`   Universe ID: ${universeData.universeId}`);
        
        // Spielerdaten abrufen
        const gamesRes = await fetch(
            `https://games.roblox.com/v1/games?universeIds=${universeData.universeId}`
        );
        
        if (!gamesRes.ok) {
            throw new Error(`Games API Fehler: ${gamesRes.status}`);
        }
        
        const gamesData = await gamesRes.json();
        
        if (gamesData.data && gamesData.data.length > 0) {
            const game = gamesData.data[0];
            
            botState.playerCount = game.playing || 0;
            botState.maxPlayers = game.maxPlayers || 15;
            botState.visits = game.visits || 0;
            botState.favorites = game.favoritedCount || 0;
            botState.lastUpdate = new Date().toISOString();
            botState.error = null;
            
            console.log(`   ✅ Spieler: ${botState.playerCount}/${botState.maxPlayers}`);
            console.log(`   Besuche: ${botState.visits.toLocaleString()}`);
            console.log(`   Favoriten: ${botState.favorites.toLocaleString()}`);
        }
        
        // Methode 2: Private Server API (mit Bot Cookie)
        try {
            const privateRes = await fetch(
                `https://games.roblox.com/v1/games/${BOT.placeId}/private-servers`,
                {
                    headers: {
                        'Cookie': botState.authCookie,
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (privateRes.ok) {
                const privateData = await privateRes.json();
                console.log('   📋 Private Server Daten verfügbar');
                
                // Wenn Daten vorhanden, überschreibe mit echten Private Server Daten
                if (privateData.data && privateData.data.length > 0) {
                    const myServer = privateData.data.find(
                        server => server.vipServerId || server.id
                    );
                    
                    if (myServer && myServer.playing !== undefined) {
                        botState.playerCount = myServer.playing;
                        botState.maxPlayers = myServer.maxPlayers || 15;
                        console.log(`   🎯 Private Server Spieler: ${myServer.playing}`);
                    }
                }
            }
        } catch (privateError) {
            console.log('   ℹ️ Private Server API nicht verfügbar, nutze öffentliche Daten');
        }
        
    } catch (error) {
        console.error('❌ Daten Fehler:', error.message);
        botState.error = error.message;
    }
}

// ==================== API ENDPOINTS ====================

app.get('/api/players', async (req, res) => {
    console.log('\n🔍 API Anfrage: /api/players');
    
    await getPlayerData();
    
    res.json({
        success: botState.loggedIn,
        playerCount: botState.playerCount,
        maxPlayers: botState.maxPlayers,
        visits: botState.visits,
        favorites: botState.favorites,
        placeId: BOT.placeId,
        serverCode: BOT.privateServerCode,
        joinLink: BOT.privateServerLink,
        gameLink: `https://www.roblox.com/games/${BOT.placeId}`,
        botOnline: botState.loggedIn,
        botName: BOT.username,
        timestamp: botState.lastUpdate,
        error: botState.error
    });
});

app.get('/api/bot-status', (req, res) => {
    res.json({
        botOnline: botState.loggedIn,
        botName: BOT.username,
        userId: botState.userId,
        playerCount: botState.playerCount,
        error: botState.error
    });
});

// ==================== FRONTEND ====================

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notruf Hamburg RP - Private Server</title>
    <meta property="og:title" content="Notruf Hamburg RP">
    <meta property="og:description" content="Live Spieleranzahl - Private Server">
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
            padding:40px 30px;
            text-align:center;
            max-width:480px;
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
        .icon{font-size:70px;margin-bottom:15px;animation:float 3s ease-in-out infinite}
        @keyframes float{
            0%,100%{transform:translateY(0)}
            50%{transform:translateY(-8px)}
        }
        h1{color:#fff;font-size:32px;font-weight:800;margin-bottom:2px}
        .sub{color:#ff4444;font-size:13px;font-weight:700;letter-spacing:4px;margin-bottom:5px}
        .code-badge{
            display:inline-block;
            background:rgba(255,68,68,.1);
            color:#ff6666;
            padding:5px 14px;
            border-radius:8px;
            font-size:13px;
            font-family:monospace;
            font-weight:bold;
            letter-spacing:2px;
            margin-bottom:20px;
            border:1px solid rgba(255,68,68,.2);
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
            transition:.3s;
        }
        .status.live{
            background:rgba(46,213,115,.1);
            color:#2ed573;
            border:1px solid rgba(46,213,115,.25);
        }
        .status.empty{
            background:rgba(255,165,0,.1);
            color:#ffa500;
            border:1px solid rgba(255,165,0,.25);
        }
        .status.error{
            background:rgba(255,50,50,.1);
            color:#ff4444;
            border:1px solid rgba(255,50,50,.25);
        }
        .dot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        
        .counter{
            background:linear-gradient(135deg,rgba(255,68,68,.08),rgba(255,0,0,.03));
            border:2px solid rgba(255,68,68,.2);
            border-radius:24px;
            padding:40px 20px;
            margin:20px 0;
        }
        .bignum{
            font-size:140px;
            font-weight:900;
            background:linear-gradient(180deg,#ff6666,#ff4444,#cc0000);
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
            background-clip:text;
            line-height:1;
            margin-bottom:5px;
            transition:.5s;
        }
        .biglabel{color:#664444;font-size:13px;letter-spacing:5px}
        
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}
        .item{
            background:rgba(255,255,255,.02);
            border:1px solid #1c1c28;
            border-radius:14px;
            padding:16px;
            text-align:left;
            transition:.3s;
        }
        .item:hover{border-color:#2a2a3a}
        .ilabel{color:#555;font-size:10px;letter-spacing:1.5px;margin-bottom:6px;font-weight:600}
        .ivalue{color:#fff;font-size:17px;font-weight:700}
        .ivalue.code{color:#ff6666;font-family:monospace;font-size:12px}
        
        .join-btn{
            display:inline-block;
            background:linear-gradient(135deg,#ff4444,#cc0000);
            color:#fff;
            text-decoration:none;
            padding:16px 38px;
            border-radius:14px;
            font-size:15px;
            font-weight:700;
            margin:12px 0;
            letter-spacing:1px;
            transition:.3s;
        }
        .join-btn:hover{
            transform:translateY(-3px);
            box-shadow:0 12px 35px rgba(255,68,68,.4);
        }
        .footer{color:#2a2a3a;font-size:11px;margin-top:18px}
        
        .loading{width:50px;height:50px;border:3px solid rgba(255,68,68,.1);border-top-color:#ff4444;border-radius:50%;animation:spin .7s linear infinite;margin:0 auto}
        @keyframes spin{to{transform:rotate(360deg)}}
        
        @media(max-width:480px){
            .card{padding:25px 18px}
            h1{font-size:26px}
            .bignum{font-size:100px}
            .grid{grid-template-columns:1fr}
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🚨</div>
        <h1>Notruf Hamburg</h1>
        <div class="sub">PRIVATE SERVER</div>
        <div class="code-badge">5ihdm3h6sl5aow</div>
        
        <div id="status" class="status live">
            <span class="dot"></span>
            <span>VERBINDE...</span>
        </div>

        <div class="counter">
            <div id="count" class="bignum"><div class="loading"></div></div>
            <div class="biglabel">SPIELER ONLINE</div>
        </div>

        <div class="grid">
            <div class="item">
                <div class="ilabel">MAXIMALE SPIELER</div>
                <div class="ivalue" id="max">--</div>
            </div>
            <div class="item">
                <div class="ilabel">SERVER CODE</div>
                <div class="ivalue code">5ihdm3h6sl5aow</div>
            </div>
            <div class="item">
                <div class="ilabel">BESUCHE</div>
                <div class="ivalue" id="visits">--</div>
            </div>
            <div class="item">
                <div class="ilabel">LETZTES UPDATE</div>
                <div class="ivalue" id="time" style="font-size:13px;">--</div>
            </div>
            <div class="item">
                <div class="ilabel">BOT STATUS</div>
                <div class="ivalue" id="botStatus" style="font-size:13px;">--</div>
            </div>
            <div class="item">
                <div class="ilabel">BOT NAME</div>
                <div class="ivalue" style="font-size:13px;color:#ff6666;">kayabot21</div>
            </div>
        </div>

        <a href="https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow" target="_blank" class="join-btn">
            🎮 JETZT BEITRETEN
        </a>

        <div class="footer">🤖 Bot überwacht Server • Update alle 30s</div>
    </div>

    <script>
        async function loadData(){
            try{
                const r=await fetch('/api/players');
                const d=await r.json();
                
                document.getElementById('count').textContent=d.playerCount;
                document.getElementById('max').textContent=d.maxPlayers;
                document.getElementById('visits').textContent=d.visits?d.visits.toLocaleString('de-DE'):'--';
                document.getElementById('time').textContent=new Date(d.timestamp).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
                document.getElementById('botStatus').textContent=d.botOnline?'✅ Online':'❌ Offline';
                
                const s=document.getElementById('status');
                if(d.playerCount>0){
                    s.className='status live';
                    s.innerHTML='<span class="dot"></span><span>'+d.playerCount+' SPIELER ONLINE</span>';
                }else{
                    s.className='status empty';
                    s.innerHTML='<span class="dot"></span><span>SERVER LEER</span>';
                }
                
                if(d.error){
                    s.className='status error';
                    s.innerHTML='<span class="dot"></span><span>FEHLER</span>';
                }
            }catch(e){
                document.getElementById('count').textContent='--';
                document.getElementById('status').className='status error';
                document.getElementById('status').innerHTML='<span class="dot"></span><span>KEINE VERBINDUNG</span>';
                console.error(e);
            }
        }
        
        loadData();
        setInterval(loadData,30000);
        console.log('🚨 Notruf Hamburg Monitor gestartet');
        console.log('🤖 Bot: kayabot21');
    </script>
</body>
</html>
    `);
});

// ==================== SERVER START ====================

async function startServer() {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║  🚨 NOTRUF HAMBURG RP             ║');
    console.log('║  🤖 Bot-gestützter Monitor         ║');
    console.log('╚══════════════════════════════════════╝\n');
    
    console.log('⚙️  Konfiguration:');
    console.log(`   🤖 Bot: ${BOT.username}`);
    console.log(`   🎮 Place ID: ${BOT.placeId}`);
    console.log(`   🔑 Server Code: ${BOT.privateServerCode}`);
    console.log(`   🔗 Join Link: ${BOT.privateServerLink}\n`);
    
    // Bot einloggen
    await botLogin();
    
    if (botState.loggedIn) {
        // Private Server beitreten
        await joinPrivateServer();
        
        // Erste Datenabfrage
        await getPlayerData();
        
        // Alle 30 Sekunden aktualisieren
        setInterval(async () => {
            await getPlayerData();
        }, 30000);
        
        console.log('\n✅ Bot läuft und überwacht den Server!\n');
    } else {
        console.log('\n❌ Bot konnte nicht eingeloggt werden!');
        console.log('   Überprüfe Username und Passwort.\n');
    }
}

app.listen(PORT, () => {
    console.log(`🌐 WebServer läuft auf Port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}\n`);
    
    startServer();
});
