const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== KONFIGURATION ====================
const CONFIG = {
    apiKey: 'nzgfaVTLPkO8O4Lg+ga8ZZRtBW+jBLcQCvicmaW0bNfGkb/kZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkluTnBaeTB5TURJeExUQTNMVEV6VkRFNE9qVXhPalE1V2lJc0luUjVjQ0k2SWtwWFZDSjkuZXlKaGRXUWlPaUpTYjJKc2IzaEpiblJsY201aGJDSXNJbWx6Y3lJNklrTnNiM1ZrUVhWMGFHVnVkR2xqWVhScGIyNVRaWEoyYVdObElpd2lZbUZ6WlVGd2FVdGxlU0k2SW01NloyWmhWbFJNVUd0UE9FODBUR3NyWjJFNFdscFNkRUpYSzJwQ1RHTlJRM1pwWTIxaFZ6QmlUbVpIYTJJdmF5SXNJbTkzYm1WeVNXUWlPaUl4TVRFd05UTTNNREExTmlJc0ltVjRjQ0k2TVRjNE1UTTRNREV3TVN3aWFXRjBJam94TnpneE16YzJOVEF4TENKdVltWWlPakUzT0RFek56WTFNREY5LlhabWFrTjN1amJNa2hLMjNQU0Z2ZlQ4MDlUSmxXbDlEeUJaN0lYbE9JSUNSOFJiS2dLd2VJWmVCX0VDck05SWtFZ3RKTjlXdTR2QldqbGZFMExDSmRjaDlHQ1VlUHpXRGNQZ05VX1A0OEl4ZTA3T0VaWlRjbi1CLUtXV1FZbEJzWnVYNEZpT1FhRXFOOWoxaFVlWWJQekQtU0pyb3J3OC05Y1lWdzNsd25vMWJWWGp3TU9ZbFFBcDBZNlF6VE1LMThIT2JUN3N3ZV9SUXdXNkVoVmxLSzBtem5QVjdneHRQUW9pRlpuN3VyOEdNN0FsWElVclFxcjFLaFM3OXpQNUR6cnNzSV9Mak1ReURzNGt1a0o3R3dtOFRldDUwLUFpeE50dlBpS1pXNzQ0aDQ3RGI3MWRtTVJvRzNGOHMwclZvZXFRRXhIemdwQU01UXhCOWc5WUZVUQ==',
    universeId: '2992873140',
    placeId: 7711635737,
    privateServerCode: 'x1qssipp',
    privateServerLink: 'https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow'
};

let serverData = {
    playerCount: 0,
    maxPlayers: 15,
    playerList: [],
    serverFound: false,
    lastUpdate: null,
    error: null
};

// ==================== OPEN CLOUD API ====================

async function getPrivateServerData() {
    try {
        console.log('\n🔍 Suche Private Server x1qssipp...');
        
        const url = `https://apis.roblox.com/cloud/v2/universes/${CONFIG.universeId}/places/${CONFIG.placeId}/instances`;
        
        const response = await fetch(url, {
            headers: {
                'x-api-key': CONFIG.apiKey,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API Fehler: ${response.status}`);
        }
        
        const data = await response.json();
        
        let foundServer = null;
        
        if (data.instances) {
            for (const instance of data.instances) {
                if (instance.accessCode === CONFIG.privateServerCode) {
                    foundServer = instance;
                    break;
                }
            }
        }
        
        if (foundServer) {
            serverData.playerCount = foundServer.playerCount || 0;
            serverData.maxPlayers = foundServer.maxPlayers || 15;
            serverData.serverFound = true;
            serverData.error = null;
            
            console.log(`✅ Server gefunden! ${serverData.playerCount} Spieler`);
            
            // Spielernamen holen
            if (foundServer.playerCount > 0 && foundServer.id) {
                try {
                    const playerUrl = `https://apis.roblox.com/cloud/v2/universes/${CONFIG.universeId}/places/${CONFIG.placeId}/instances/${foundServer.id}/players`;
                    const playerRes = await fetch(playerUrl, {
                        headers: {
                            'x-api-key': CONFIG.apiKey,
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (playerRes.ok) {
                        const playerData = await playerRes.json();
                        serverData.playerList = playerData.players?.map(p => p.displayName || 'Spieler') || [];
                        console.log(`👤 ${serverData.playerList.join(', ')}`);
                    }
                } catch (e) {
                    serverData.playerList = [];
                }
            } else {
                serverData.playerList = [];
            }
        } else {
            console.log('⚠️ Server nicht aktiv (leer)');
            serverData.playerCount = 0;
            serverData.serverFound = false;
            serverData.playerList = [];
            serverData.error = null;
        }
        
        serverData.lastUpdate = new Date().toISOString();
        
    } catch (error) {
        console.error('❌', error.message);
        serverData.error = error.message;
        serverData.lastUpdate = new Date().toISOString();
    }
}

// ==================== API ====================

app.get('/api/players', async (req, res) => {
    await getPrivateServerData();
    
    res.json({
        success: serverData.serverFound,
        playerCount: serverData.playerCount,
        maxPlayers: serverData.maxPlayers,
        players: serverData.playerList,
        placeId: CONFIG.placeId,
        universeId: CONFIG.universeId,
        serverCode: CONFIG.privateServerCode,
        joinLink: CONFIG.privateServerLink,
        timestamp: serverData.lastUpdate,
        error: serverData.error
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
    <meta name="theme-color" content="#ff4444">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#060609;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;background-image:radial-gradient(ellipse at top,rgba(255,68,68,.1),transparent 50%)}
        .card{background:#0d0d14;border:1px solid #1a1a28;border-radius:24px;padding:35px 25px;text-align:center;max-width:500px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.6);position:relative}
        .card::before{content:'';position:absolute;top:0;left:30px;right:30px;height:2px;background:linear-gradient(90deg,transparent,#ff4444,#ff6666,transparent)}
        .icon{font-size:65px;margin-bottom:15px;animation:float 3s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        h1{color:#fff;font-size:28px;font-weight:800;margin-bottom:2px}
        .sub{color:#ff4444;font-size:12px;font-weight:700;letter-spacing:3px;margin-bottom:5px}
        .code-badge{display:inline-block;background:rgba(255,68,68,.15);color:#ff6666;padding:6px 16px;border-radius:8px;font-size:18px;font-family:monospace;font-weight:bold;letter-spacing:3px;margin-bottom:20px;border:1px solid rgba(255,68,68,.3)}
        .status{display:inline-flex;align-items:center;gap:8px;padding:8px 20px;border-radius:50px;font-size:13px;font-weight:700;margin-bottom:25px}
        .status.live{background:rgba(46,213,115,.15);color:#2ed573;border:1px solid rgba(46,213,115,.3)}
        .status.empty{background:rgba(255,165,0,.15);color:#ffa500;border:1px solid rgba(255,165,0,.3)}
        .dot{width:8px;height:8px;border-radius:50%;background:currentColor;animation:pulse 1.5s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .counter{background:linear-gradient(135deg,rgba(255,68,68,.1),rgba(255,0,0,.03));border:2px solid rgba(255,68,68,.2);border-radius:24px;padding:35px 20px;margin:20px 0}
        .bignum{font-size:130px;font-weight:900;background:linear-gradient(180deg,#ff6666,#ff4444,#cc0000);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;line-height:1;margin-bottom:5px}
        .biglabel{color:#664444;font-size:13px;letter-spacing:5px;text-transform:uppercase}
        .player-list{background:rgba(255,255,255,.02);border:1px solid #1c1c28;border-radius:14px;padding:15px;margin:15px 0;text-align:left;max-height:200px;overflow-y:auto}
        .player-list .plabel{color:#555;font-size:10px;letter-spacing:1.5px;margin-bottom:8px}
        .player-list .pname{color:#ff6666;font-size:13px;padding:4px 0;font-family:monospace}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}
        .item{background:rgba(255,255,255,.02);border:1px solid #1c1c28;border-radius:14px;padding:16px;text-align:left}
        .ilabel{color:#555;font-size:10px;letter-spacing:1.5px;margin-bottom:6px;font-weight:600}
        .ivalue{color:#fff;font-size:17px;font-weight:700}
        .join-btn{display:inline-block;background:linear-gradient(135deg,#ff4444,#cc0000);color:#fff;text-decoration:none;padding:15px 35px;border-radius:14px;font-size:15px;font-weight:700;margin:12px 0;letter-spacing:1px;transition:.3s}
        .join-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(255,68,68,.4)}
        .footer{color:#2a2a3a;font-size:11px;margin-top:18px}
        @media(max-width:480px){.card{padding:25px 18px}h1{font-size:24px}.bignum{font-size:90px}.grid{grid-template-columns:1fr}}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🔒</div>
        <h1>Notruf Hamburg</h1>
        <div class="sub">PRIVATE SERVER</div>
        <div class="code-badge">x1qssipp</div>
        <div id="status" class="status live"><span class="dot"></span><span>SUCHE SERVER...</span></div>
        <div class="counter">
            <div id="count" class="bignum">--</div>
            <div class="biglabel">Spieler auf Server</div>
        </div>
        <div class="player-list" id="playerList" style="display:none">
            <div class="plabel">👤 EINGELOGGTE SPIELER:</div>
            <div id="playerNames"></div>
        </div>
        <div class="grid">
            <div class="item"><div class="ilabel">MAX SLOTS</div><div class="ivalue" id="max">15</div></div>
            <div class="item"><div class="ilabel">SERVER CODE</div><div class="ivalue" style="color:#ff6666;font-size:14px;font-family:monospace;">x1qssipp</div></div>
            <div class="item"><div class="ilabel">STATUS</div><div class="ivalue" id="serverStatus" style="font-size:13px;">--</div></div>
            <div class="item"><div class="ilabel">UPDATE</div><div class="ivalue" id="time" style="font-size:13px;">--</div></div>
        </div>
        <a href="https://www.roblox.com/share?v=v2&code=5ihdm3h6sl5aow" target="_blank" class="join-btn">🎮 JETZT BEITRETEN</a>
        <div class="footer">🔄 Echte Private-Server-Daten • Alle 30s</div>
    </div>
    <script>
        async function load(){
            try{
                const r=await fetch('/api/players');
                const d=await r.json();
                document.getElementById('count').textContent=d.playerCount;
                document.getElementById('max').textContent=d.maxPlayers;
                document.getElementById('time').textContent=new Date(d.timestamp).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
                document.getElementById('serverStatus').textContent=d.success?'✅ Online':'⚪ Kein Server';
                const s=document.getElementById('status');
                if(d.playerCount>0){
                    s.className='status live';
                    s.innerHTML='<span class="dot"></span><span>'+d.playerCount+' SPIELER ONLINE</span>';
                }else{
                    s.className='status empty';
                    s.innerHTML='<span class="dot"></span><span>SERVER LEER</span>';
                }
                if(d.players&&d.players.length>0){
                    document.getElementById('playerList').style.display='block';
                    document.getElementById('playerNames').innerHTML=d.players.map(p=>'<div class="pname">👤 '+p+'</div>').join('');
                }else{
                    document.getElementById('playerList').style.display='none';
                }
            }catch(e){
                document.getElementById('count').textContent='--';
            }
        }
        load();setInterval(load,30000);
    </script>
</body>
</html>`);
});

// ==================== START ====================

app.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════╗');
    console.log('║  🔒 PRIVATE SERVER MONITOR     ║');
    console.log('║  x1qssipp - Notruf Hamburg     ║');
    console.log('╚══════════════════════════════════╝');
    console.log(`🌐 Port: ${PORT}`);
    console.log(`🎮 Universe: ${CONFIG.universeId}`);
    console.log(`🔑 Code: ${CONFIG.privateServerCode}`);
    console.log('✅ Open Cloud API konfiguriert!\n');
    
    getPrivateServerData();
    setInterval(getPrivateServerData, 30000);
});
