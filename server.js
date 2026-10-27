const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');

const PORT = process.env.PORT || 10000;

let state = {
  pvPower: 177,
  pvVolts: 130.3,
  pvAmps: 1.4,
  pvKwh: 2.579,
  mpptPower: 177,
  mpptAmps: 5.8,
  mpptKwh: 2.579,
  mpptTemp: 34,
  batVolts: 28.0,
  batAmps: 5.8,
  batChargeKwh: 0.45,
  batDischargeKwh: 0.20,
  batSoc: 74,
  gtiPower: 212.86,
  gtiFreq: 49.75,
  gtiTemp: 45.0,
  gtiKwh: 2.10,
  gridVolts: 236.53,
  gridPower: 0,
  gridKwh: 0.00,
  loadPower: 212.33,
  loadKwh: 2.10,
  savingsVnd: 6448
};

// --- KẾT NỐI MQTT CLOUD CỦA GIA BẢO ---
const mqttClient = mqtt.connect('mqtts://giabao-inverter.com:8883', {
  clientId: 'render_bridge_' + Math.random().toString(16).substr(2, 6),
  username: 'ha_T19aqEpG',
  password: 'KRpymsEADJmAEGtj',
  rejectUnauthorized: false
});

mqttClient.on('connect', () => {
  console.log('Đã kết nối thành công tới MQTT Broker Gia Bảo!');
  mqttClient.subscribe('inverter_ha/T19aqEpGyGA6RRNEzP2TfhCGbd2/#', (err) => {
    if (!err) console.log('Đã subscribe topic inverter thành công');
  });
});

mqttClient.on('message', (topic, payload) => {
  try {
    const msg = payload.toString();
    console.log(`[MQTT] Topic: ${topic} | Data: ${msg}`);

    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(state));
      }
    });
  } catch (e) {
    console.error('Lỗi phân tích tin nhắn MQTT:', e);
  }
});
// ---------------------------------------

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Solar Monitoring Dashboard - Dunght</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #030712; }
        .block-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5); }
        .block-card:hover { transform: translateY(-3px); box-shadow: 0 20px 35px -10px rgba(6, 182, 212, 0.15); }
        .flow-path-bg { stroke: #1e293b; stroke-width: 5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #090d16; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    </style>
</head>
<body class="text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-white">

    <header class="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 md:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
        <div class="flex items-center gap-3.5">
            <div class="bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 p-2.5 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                <i class="fa-solid fa-user-gear text-2xl"></i>
            </div>
            <div>
                <h1 class="font-extrabold text-base md:text-lg leading-tight text-white tracking-wide">Xin chào, Dunght</h1>
                <p class="text-xs text-slate-400 flex items-center gap-2">
                    <span>GTIControl807</span>
                    <span class="inline-block w-1 h-1 bg-slate-600 rounded-full"></span>
                    <span>Sạc MPPT CHG1077773</span>
                </p>
            </div>
        </div>

        <div class="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button id="tabRealtimeBtn" onclick="switchTab('realtime')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow-md">
                <i class="fa-solid fa-chart-line mr-1"></i> Giám Sát Realtime
            </button>
            <button id="tabHistoryBtn" onclick="switchTab('history')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition">
                <i class="fa-solid fa-calendar-days mr-1"></i> Lịch Sử & Thống Kê
            </button>
        </div>

        <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
                <span class="relative flex h-2.5 w-2.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span id="connection-status" class="text-xs font-semibold text-emerald-400">ĐANG KẾT NỐI CLOUD</span>
            </div>
        </div>
    </header>

    <!-- TAB REALTIME -->
    <main id="realtimeView" class="container mx-auto p-4 md:p-6 flex-1 flex flex-col justify-center items-center">
        <div class="w-full max-w-6xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
            <div class="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md">
                <div class="flex items-center justify-between text-amber-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thu PV</span>
                    <i class="fa-solid fa-sun text-sm"></i>
                </div>
                <div id="val-pvPower" class="text-base md:text-lg font-black text-amber-400">177 W</div>
            </div>
            <div class="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md">
                <div class="flex items-center justify-between text-purple-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiêu Thụ</span>
                    <i class="fa-solid fa-house-crack text-sm"></i>
                </div>
                <div id="val-loadPower" class="text-base md:text-lg font-black text-purple-400">212 W</div>
            </div>
            <div class="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md">
                <div class="flex items-center justify-between text-cyan-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hòa Lưới</span>
                    <i class="fa-solid fa-plug-circle-bolt text-sm"></i>
                </div>
                <div id="val-gtiPower" class="text-base md:text-lg font-black text-cyan-400">0 W</div>
            </div>
            <div class="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md">
                <div class="flex items-center justify-between text-indigo-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lấy Lưới</span>
                    <i class="fa-solid fa-tower-cell text-sm"></i>
                </div>
                <div id="val-gridPower" class="text-base md:text-lg font-black text-indigo-400">12 W</div>
            </div>
            <div class="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md col-span-2 sm:col-span-1">
                <div class="flex items-center justify-between text-emerald-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiết Kiệm</span>
                    <i class="fa-solid fa-piggy-bank text-sm"></i>
                </div>
                <div id="val-savingsVnd" class="text-base md:text-lg font-black text-emerald-400">6.448 đ</div>
            </div>
        </div>

        <div class="relative w-full max-w-6xl bg-slate-900/50 rounded-3xl border border-slate-800/80 p-6 md:p-10 my-2 backdrop-blur-md overflow-hidden shadow-2xl">
            <svg id="svgCanvas" class="absolute inset-0 w-full h-full pointer-events-none z-0">
                <path id="path-pv-mppt" class="flow-path-bg"></path>
                <path id="path-gti-load" class="flow-path-bg"></path>
                <path id="path-grid-load" class="flow-path-bg"></path>
            </svg>

            <div class="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-y-10 md:gap-x-16 items-center">
                <div class="flex flex-col justify-around h-full items-center md:items-start gap-6">
                    <div id="block-pv" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-amber-500/40 rounded-2xl p-4">
                        <h3 class="font-bold text-amber-300 text-sm">PIN NĂNG LƯỢNG (PV)</h3>
                        <p class="text-amber-400 font-extrabold text-base" id="text-pvPower">177 W</p>
                    </div>
                    <div id="block-mppt" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-4">
                        <h3 class="font-bold text-emerald-300 text-sm">SẠC MPPT</h3>
                        <p class="text-emerald-400 font-extrabold text-base" id="text-mpptPower">177 W</p>
                    </div>
                    <div id="block-bat" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-cyan-500/40 rounded-2xl p-4">
                        <h3 class="font-bold text-cyan-300 text-sm">PIN LƯU TRỮ (<span id="text-batSoc">74</span>%)</h3>
                    </div>
                </div>

                <div class="flex justify-center items-center">
                    <div id="block-gti" class="block-card w-full max-w-sm bg-slate-950 border-2 border-cyan-500/60 rounded-[36px] p-6 text-center">
                        <h3 class="font-extrabold text-cyan-300 text-base">GTIControl807</h3>
                        <p class="text-cyan-400 font-extrabold text-xl mt-2" id="text-gtiPower">212.86 W</p>
                    </div>
                </div>

                <div class="flex flex-col justify-around h-full items-center md:items-end gap-6">
                    <div id="block-grid" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-indigo-500/40 rounded-2xl p-4">
                        <h3 class="font-bold text-indigo-300 text-sm">LƯỚI ĐIỆN</h3>
                        <p class="text-indigo-400 font-extrabold text-base" id="text-gridPower">0 W</p>
                    </div>
                    <div id="block-load" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-purple-500/40 rounded-2xl p-4">
                        <h3 class="font-bold text-purple-300 text-sm">TẢI GIA ĐÌNH</h3>
                        <p class="text-purple-400 font-extrabold text-base" id="text-loadPower">212.33 W</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- TAB LỊCH SỬ -->
    <main id="historyView" class="container mx-auto p-4 md:p-6 flex-1 hidden">
        <div class="max-w-6xl mx-auto bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
            <h2 class="text-lg font-bold text-white mb-4"><i class="fa-solid fa-chart-bar mr-2 text-emerald-400"></i> Thống kê sản lượng & Lịch sử</h2>
            <div class="h-64 flex items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-2xl">
                Biểu đồ lịch sử đang cập nhật từ hệ thống Cloud...
            </div>
        </div>
    </main>

    <script>
        function switchTab(tab) {
            const realtimeView = document.getElementById('realtimeView');
            const historyView = document.getElementById('historyView');
            const realtimeBtn = document.getElementById('tabRealtimeBtn');
            const historyBtn = document.getElementById('tabHistoryBtn');

            if (tab === 'realtime') {
                realtimeView.classList.remove('hidden');
                historyView.classList.add('hidden');
                realtimeBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow-md";
                historyBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
                updatePaths();
            } else {
                realtimeView.classList.add('hidden');
                historyView.classList.remove('hidden');
                historyBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow-md";
                realtimeBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
            }
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(wsProtocol + '//' + window.location.host);

        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            for (let key in data) {
                const elVal = document.getElementById('val-' + key);
                if (elVal) elVal.innerText = data[key];
                const elText = document.getElementById('text-' + key);
                if (elText) elText.innerText = data[key];
            }
        };

        window.addEventListener('load', () => { updatePaths(); });
        window.addEventListener('resize', () => { updatePaths(); });

        function getBoxAnchor(elementId, position) {
            const el = document.getElementById(elementId);
            if (!el) return { x: 0, y: 0 };
            const rect = el.getBoundingClientRect();
            const svgRect = document.getElementById('svgCanvas').getBoundingClientRect();
            let x = rect.left + rect.width / 2 - svgRect.left;
            let y = rect.top + rect.height / 2 - svgRect.top;
            if (position === 'top') y = rect.top - svgRect.top;
            if (position === 'bottom') y = rect.bottom - svgRect.top;
            if (position === 'left') x = rect.left - svgRect.left;
            if (position === 'right') x = rect.right - svgRect.left;
            return { x, y };
        }

        function updatePaths() {
            const pvBottom = getBoxAnchor('block-pv', 'bottom');
            const mpptTop = getBoxAnchor('block-mppt', 'top');
            const gtiLeft = getBoxAnchor('block-gti', 'left');
            const loadTop = getBoxAnchor('block-load', 'top');
            const gridBottom = getBoxAnchor('block-grid', 'bottom');

            document.getElementById('path-pv-mppt')?.setAttribute('d', \`M \${pvBottom.x} \${pvBottom.y} L \${mpptTop.x} \${mpptTop.y}\`);
            document.getElementById('path-gti-load')?.setAttribute('d', \`M \${gtiLeft.x} \${gtiLeft.y} L \${loadTop.x} \${loadTop.y}\`);
            document.getElementById('path-grid-load')?.setAttribute('d', \`M \${gridBottom.x} \${gridBottom.y} L \${loadTop.x} \${loadTop.y}\`);
        }
    </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
    return;
  }
  res.writeHead(404); res.end();
});

const wss = new WebSocket.Server({ server });
wss.on('connection', ws => ws.send(JSON.stringify(state)));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));