const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==================== BOT KONFIGURATION ====================
const BOT = {
    username: 'kayabot21',
    password: 'tYuyi8KBZ97prS6',
    cookie: process.env.ROBLOSECURITY || '', // Cookie als Umgebungsvariable (sicherer)
    placeId: 7711635737,
    privateServerCode: '5ihdm3h6sl5aow',
    privateServerLink: 'https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow'
};

let botState = {
    loggedIn: false,
    csrfToken: '',
    userId: null,
    username: '',
    playerCount: 0,
    maxPlayers: 15,
    visits: 0,
    lastUpdate: null,
    error: null
};

// ==================== HILFSFUNKTIONEN ====================

function getCookie() {
    if (BOT.cookie) {
        return `.ROBLOSECURITY=${BOT.cookie}`;
    }
    return '';
}

async function refreshCSRFToken() {
    try {
        const cookie = getCookie();
        if (!cookie) return;
        
        const res = await fetch('https://auth.roblox.com/v2/logout', {
            method: 'POST',
            headers: { 'Cookie': cookie }
        });
        botState.csrfToken = res.headers.get('x-csrf-token') || '';
        return botState.csrfToken;
    } catch (e) {
        return '';
    }
}

// ==================== BOT LOGIN ====================

async function botLogin() {
    try {
        // Methode 1: Cookie Login (bevorzugt)
        if (BOT.cookie) {
            console.log('🤖 Login mit Cookie...');
            const cookie = getCookie();
            
            const testRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
                headers: {
                    'Cookie': cookie,
                    'Accept': 'application/json'
                }
            });
            
            if (testRes.ok) {
                const userData = await testRes.json();
                botState.userId = userData.id;
                botState.username = userData.name;
                botState.loggedIn = true;
                botState.error = null;
                
                await refreshCSRFToken();
                console.log(`✅ Bot: ${userData.name}`);
                return;
            }
        }
        
        // Methode 2: Passwort Login
        console.log('🤖 Login mit Passwort...');
        console.log(`   Username: ${BOT.username}`);
        
        const loginRes = await fetch('https://auth.roblox.com/v2/login', {
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
        
        if (loginRes.ok) {
            const cookies = loginRes.headers.get('set-cookie');
            const robloSecurity = cookies?.match(/\.ROBLOSECURITY=([^;]+)/);
            
            if (robloSecurity) {
                BOT.cookie = robloSecurity[1];
                botState.csrfToken = loginRes.headers.get('x-csrf-token') || '';
                
                const userRes = await fetch('https://users.roblox.com/v1/users/authenticated', {
                    headers: {
                        'Cookie': `.ROBLOSECURITY=${BOT.cookie}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (userRes.ok) {
                    const userData = await userRes.json();
                    botState.userId = userData.id;
                    botState.username = userData.name;
                    botState.loggedIn = true;
                    botState.error = null;
                    console.log(`✅ Bot: ${userData.name}`);
                    return;
                }
            }
        }
        
        throw new Error('Login fehlgeschlagen - Cookie benötigt');
        
    } catch (error) {
        console.error('❌ Login Fehler:', error.message);
        botState.loggedIn = false;
        botState.error = 'Cookie benötigt! Siehe Anleitung.';
    }
}

// ==================== SPIELERDATEN ====================

async function getPlayerData() {
    try {
        if (!botState.loggedIn) {
            await botLogin();
        }
        
        if (!botState.loggedIn) {
            return;
        }
        
        console.log('📊 Rufe Daten ab...');
        
        // Universe ID
        const uniRes = await fetch(`https://apis.roblox.com/universes/v1/places/${BOT.placeId}/universe`);
        const uniData = await uniRes.json();
        
        // Spielerdaten
        const gameRes = await fetch(`https://games.roblox.com/v1/games?universeIds=${uniData.universeId}`);
        const gameData = await gameRes.json();
        
        if (gameData.data?.[0]) {
            const g = gameData.data[0];
            botState.playerCount = g.playing || 0;
            botState.maxPlayers = g.maxPlayers || 15;
            botState.visits = g.visits || 0;
            botState.lastUpdate = new Date().toISOString();
            botState.error = null;
            
            console.log(`✅ ${botState.playerCount}/${botState.maxPlayers} Spieler`);
        }
        
    } catch (error) {
        console.error('❌', error.message);
        botState.error = error.message;
    }
}

// ==================== API ====================

app.get('/api/players', async (req, res) => {
    await getPlayerData();
    
    res.json({
        success: botState.loggedIn,
        playerCount: botState.playerCount,
        maxPlayers: botState.maxPlayers,
        visits: botState.visits,
        placeId: BOT.placeId,
        serverCode: BOT.privateServerCode,
        joinLink: BOT.privateServerLink,
        gameLink: `https://www.roblox.com/games/${BOT.placeId}`,
        botOnline: botState.loggedIn,
        botName: botState.username || BOT.username,
        timestamp: botState.lastUpdate,
        error: botState.error
    });
});

// ==================== FRONTEND ====================

app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notruf Hamburg RP - Live</title>
    <meta name="theme-color" content="#ff4444">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#060609;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;background-image:radial-gradient(ellipse at top,rgba(255,68,68,.1),transparent 50%)}
        .card{background:#0d0d14;border:1px solid #1a1a28;border-radius:24px;padding:40px 30px;text-align:center;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);position:relative}
        .card::before{content:'';position:absolute;top:0;left:30px;right:30px;height:2px;background:linear-gradient(90deg,transparent,#ff4444,#ff6666,transparent)}
        .icon{font-size:70px;margin-bottom:15px;animation:float 3s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        h1{color:#fff;font-size:32px;font-weight:800;margin-bottom:2px}
        .sub{color:#ff4444;font-size:13px;font-weight:700;letter-spacing:4px;margin-bottom:5px}
        .code-badge{display:inline-block;background:rgba(255,68,68,.1);color:#ff6666;padding:5px 14px;border-radius:8px;font-size:13px;font-family:monospace;letter-spacing:2px;margin-bottom:20px;border:1px solid rgba(255,68,68,.2)}
        .status{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:50px;font-size:13px;font-weight:700;margin-bottom:25px}
        .status.live{background:rgba(46,213,115,.1);color:#2ed573;border:1px solid rgba(46,213,115,.25)}
        .status.empty{background:rgba(255,165,0,.1);color:#ffa500;border:1px solid rgba(255,165,0,.25)}
        .status.error{background:rgba(255,50,50,.1);color:#ff4444;border:1px solid rgba(255,50,50,.25)}
        .dot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .counter{background:linear-gradient(135deg,rgba(255,68,68,.08),rgba(255,0,0,.03));border:2px solid rgba(255,68,68,.2);border-radius:24px;padding:40px 20px;margin:20px 0}
        .bignum{font-size:140px;font-weight:900;background:linear-gradient(180deg,#ff6666,#ff4444,#cc0000);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:5px}
        .biglabel{color:#664444;font-size:13px;letter-spacing:5px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}
        .item{background:rgba(255,255,255,.02);border:1px solid #1c1c28;border-radius:14px;padding:16px;text-align:left}
        .ilabel{color:#555;font-size:10px;letter-spacing:1.5px;margin-bottom:6px;font-weight:600}
        .ivalue{color:#fff;font-size:17px;font-weight:700}
        .ivalue.code{color:#ff6666;font-family:monospace;font-size:12px}
        .join-btn{display:inline-block;background:linear-gradient(135deg,#ff4444,#cc0000);color:#fff;text-decoration:none;padding:16px 38px;border-radius:14px;font-size:15px;font-weight:700;margin:12px 0;letter-spacing:1px;transition:.3s}
        .join-btn:hover{transform:translateY(-3px);box-shadow:0 12px 35px rgba(255,68,68,.4)}
        .footer{color:#2a2a3a;font-size:11px;margin-top:18px}
        @media(max-width:480px){.card{padding:25px 18px}h1{font-size:26px}.bignum{font-size:100px}.grid{grid-template-columns:1fr}}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🚨</div>
        <h1>Notruf Hamburg</h1>
        <div class="sub">PRIVATE SERVER</div>
        <div class="code-badge">5ihdm3h6sl5aow</div>
        <div id="status" class="status live"><span class="dot"></span><span>VERBINDE...</span></div>
        <div class="counter">
            <div id="count" class="bignum">--</div>
            <div class="biglabel">SPIELER ONLINE</div>
        </div>
        <div class="grid">
            <div class="item"><div class="ilabel">MAX SPIELER</div><div class="ivalue" id="max">--</div></div>
            <div class="item"><div class="ilabel">SERVER CODE</div><div class="ivalue code">5ihdm3h6sl5aow</div></div>
            <div class="item"><div class="ilabel">BESUCHE</div><div class="ivalue" id="visits">--</div></div>
            <div class="item"><div class="ilabel">UPDATE</div><div class="ivalue" id="time" style="font-size:13px;">--</div></div>
            <div class="item"><div class="ilabel">BOT</div><div class="ivalue" id="botStatus" style="font-size:13px;">--</div></div>
            <div class="item"><div class="ilabel">BOT NAME</div><div class="ivalue" style="font-size:13px;color:#ff6666;">kayabot21</div></div>
        </div>
        <a href="https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow" target="_blank" class="join-btn">🎮 JETZT BEITRETEN</a>
        <div class="footer">🤖 Bot • Update alle 30s</div>
    </div>
    <script>
        async function load(){
            try{
                const r=await fetch('/api/players');
                const d=await r.json();
                document.getElementById('count').textContent=d.playerCount;
                document.getElementById('max').textContent=d.maxPlayers;
                document.getElementById('visits').textContent=d.visits?d.visits.toLocaleString('de-DE'):'--';
                document.getElementById('time').textContent=new Date(d.timestamp).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
                document.getElementById('botStatus').textContent=d.botOnline?'✅ Online':'❌ Offline';
                const s=document.getElementById('status');
                if(d.playerCount>0){s.className='status live';s.innerHTML='<span class="dot"></span><span>'+d.playerCount+' SPIELER ONLINE</span>'}
                else{s.className='status empty';s.innerHTML='<span class="dot"></span><span>SERVER LEER</span>'}
            }catch(e){
                document.getElementById('count').textContent='--';
                document.getElementById('status').className='status error';
                document.getElementById('status').innerHTML='<span class="dot"></span><span>FEHLER</span>';
            }
        }
        load();setInterval(load,30000);
    </script>
</body>
</html>`);
});

// ==================== START ====================

app.listen(PORT, async () => {
    console.log('\n╔══════════════════════════════════╗');
    console.log('║  🚨 NOTRUF HAMBURG RP         ║');
    console.log('╚══════════════════════════════════╝');
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🤖 Bot: ${BOT.username}`);
    console.log(`🎮 Place: ${BOT.placeId}`);
    console.log(`🔑 Code: ${BOT.privateServerCode}\n`);
    
    await botLogin();
    
    if (botState.loggedIn) {
        await getPlayerData();
        setInterval(getPlayerData, 30000);
        console.log('✅ Bot aktiv!\n');
    } else {
        console.log('❌ Bot nicht eingeloggt!');
        console.log('📋 Cookie benötigt - So bekommst du ihn:');
        console.log('1. Logge kayabot21 im Browser ein');
        console.log('2. F12 → Application → Cookies → roblox.com');
        console.log('3. Kopiere .ROBLOSECURITY Wert');
        console.log('4. Auf Render: Environment → ROBLOSECURITY = dein Cookie\n');
    }
});
