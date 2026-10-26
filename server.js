const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

let state = {
  pvPower: 177,
  pvVolts: 130.3,
  mpptPower: 177,
  mpptAmps: 5.8,
  batVolts: 28.0,
  batSoc: 74,
  gtiPower: 212.86,
  gridPower: 0,
  loadPower: 212.33,
  savingsVnd: 6448
};

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solar Monitoring - Dunght</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen p-6 font-sans">
    <div class="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h1 class="text-xl font-bold text-emerald-400 mb-4"><i class="fa-solid fa-solar-panel mr-2"></i>Hệ Thống Điện Mặt Trời - Dunght</h1>
        <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span class="text-xs text-slate-400 block">Thu PV</span>
                <span id="pv" class="text-2xl font-black text-amber-400">${state.pvPower} W</span>
            </div>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span class="text-xs text-slate-400 block">Hòa Lưới GTI</span>
                <span id="gti" class="text-2xl font-black text-cyan-400">${state.gtiPower} W</span>
            </div>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span class="text-xs text-slate-400 block">Tải Tiêu Thụ</span>
                <span id="load" class="text-2xl font-black text-purple-400">${state.loadPower} W</span>
            </div>
            <div class="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span class="text-xs text-slate-400 block">Pin Lưu Trữ (SOC)</span>
                <span id="soc" class="text-2xl font-black text-emerald-400">${state.batSoc}%</span>
            </div>
        </div>
    </div>
    <script>
        const ws = new WebSocket((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host);
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if(data.pvPower !== undefined) document.getElementById('pv').innerText = data.pvPower + ' W';
            if(data.gtiPower !== undefined) document.getElementById('gti').innerText = data.gtiPower + ' W';
            if(data.loadPower !== undefined) document.getElementById('load').innerText = data.loadPower + ' W';
            if(data.batSoc !== undefined) document.getElementById('soc').innerText = data.batSoc + '%';
        };
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
    return;
  }
  if (req.method === 'POST' && req.url === '/update') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        state = { ...state, ...JSON.parse(body) };
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify(state));
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (e) {
        res.writeHead(400); res.end('Invalid JSON');
      }
    });
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocket.Server({ server });
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));