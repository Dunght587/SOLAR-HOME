const http = require('http');
const WebSocket = require('ws');

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
        .flow-path-guide { stroke: #334155; stroke-width: 2; fill: none; stroke-dasharray: 4 4; stroke-linecap: round; stroke-linejoin: round; }
        .energy-particle { filter: drop-shadow(0px 0px 4px currentColor); transition: opacity 0.3s ease; }
        @keyframes spinSlow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spinSlow 20s linear infinite; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #090d16; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    </style>
</head>
<body class="text-slate-100 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-white">

    <!-- Header -->
    <header class="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 px-4 md:px-8 py-3 flex flex-wrap justify-between items-center gap-4">
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
            <div class="hidden sm:flex items-center gap-3 bg-slate-950/80 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl">
                <i class="fa-solid fa-piggy-bank text-emerald-400 text-lg"></i>
                <div class="text-left">
                    <span class="text-[10px] text-slate-400 block uppercase font-medium">Tiết kiệm hôm nay</span>
                    <span id="evnSavings" class="text-xs font-bold text-emerald-400">6.448 đ</span>
                </div>
            </div>

            <div class="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
                <span class="relative flex h-2.5 w-2.5">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span class="text-xs font-semibold text-emerald-400">ONLINE</span>
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
                <div id="summaryTotalYield" class="text-base md:text-lg font-black text-amber-400">177 W</div>
                <span class="text-[9px] text-slate-500">Hôm nay: 2.579 kWh</span>
            </div>

            <div class="bg-slate-900/80 border border-purple-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md">
                <div class="flex items-center justify-between text-purple-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiêu Thụ</span>
                    <i class="fa-solid fa-house-crack text-sm"></i>
                </div>
                <div id="summaryTotalConsumption" class="text-base md:text-lg font-black text-purple-400">212 W</div>
                <span class="text-[9px] text-slate-500">Tải gia đình</span>
            </div>

            <div class="bg-slate-900/80 border border-cyan-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md">
                <div class="flex items-center justify-between text-cyan-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hòa Lưới</span>
                    <i class="fa-solid fa-plug-circle-bolt text-sm"></i>
                </div>
                <div id="summaryGridFeedIn" class="text-base md:text-lg font-black text-cyan-400">0 W</div>
                <span class="text-[9px] text-slate-500">GTI Bám tải</span>
            </div>

            <div class="bg-slate-900/80 border border-indigo-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md">
                <div class="flex items-center justify-between text-indigo-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lấy Lưới</span>
                    <i class="fa-solid fa-tower-cell text-sm"></i>
                </div>
                <div id="summaryGridImport" class="text-base md:text-lg font-black text-indigo-400">12 W</div>
                <span class="text-[9px] text-slate-500">EVN bù vào</span>
            </div>

            <div class="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-3 flex flex-col justify-between backdrop-blur-md col-span-2 sm:col-span-1">
                <div class="flex items-center justify-between text-emerald-400 mb-1">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tiền Tiết Kiệm</span>
                    <i class="fa-solid fa-piggy-bank text-sm"></i>
                </div>
                <div id="summaryEstimatedBill" class="text-base md:text-lg font-black text-emerald-400">6.448 đ</div>
                <span class="text-[9px] text-slate-500">Tạm tính hôm nay</span>
            </div>
        </div>

        <div class="relative w-full max-w-6xl bg-slate-900/50 rounded-3xl border border-slate-800/80 p-6 md:p-10 my-2 backdrop-blur-md overflow-hidden shadow-2xl">
            <svg id="svgCanvas" class="absolute inset-0 w-full h-full pointer-events-none z-0">
                <path id="path-pv-mppt" class="flow-path-bg"></path>
                <path id="path-mppt-bat" class="flow-path-bg"></path>
                <path id="path-mppt-gti" class="flow-path-bg"></path>
                <path id="path-gti-load" class="flow-path-bg"></path>
                <path id="path-grid-load" class="flow-path-bg"></path>

                <path id="guide-pv-mppt" class="flow-path-guide"></path>
                <path id="guide-mppt-bat" class="flow-path-guide"></path>
                <path id="guide-mppt-gti" class="flow-path-guide"></path>
                <path id="guide-gti-load" class="flow-path-guide"></path>
                <path id="guide-grid-load" class="flow-path-guide"></path>

                <g id="particlesGroup"></g>
            </svg>

            <div class="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-y-10 md:gap-x-16 items-center">
                <!-- CỘT 1 -->
                <div class="flex flex-col gap-8 justify-between items-center md:items-start">
                    <div id="block-pv" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-amber-500/40 rounded-2xl p-4 relative">
                        <div class="flex items-center gap-3 border-b border-amber-500/20 pb-2 mb-2.5">
                            <div class="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                                <i class="fa-solid fa-sun text-xl animate-spin-slow"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-amber-300 text-sm tracking-wide">PIN NĂNG LƯỢNG (PV)</h3>
                                <p class="text-[10px] text-slate-400">Nguồn Năng Lượng Mặt Trời</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-center mb-2">
                            <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                <span class="text-[9px] text-slate-400 block font-medium">ĐIỆN ÁP</span>
                                <span class="font-extrabold text-amber-400 text-sm">130.3 V</span>
                            </div>
                            <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                <span class="text-[9px] text-slate-400 block font-medium">DÒNG PV</span>
                                <span class="font-extrabold text-amber-400 text-sm">1.4 A</span>
                            </div>
                        </div>
                        <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
                            <span class="text-[9px] text-amber-300 block font-bold uppercase">Công Suất Thu PV</span>
                            <span class="font-black text-amber-400 text-base">177 W</span>
                        </div>
                    </div>

                    <div id="block-mppt" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-emerald-500/40 rounded-2xl p-4 relative">
                        <div class="flex items-center gap-3 border-b border-emerald-500/20 pb-2 mb-2.5">
                            <div class="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                <i class="fa-solid fa-charging-station text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-emerald-300 text-sm tracking-wide">SẠC MPPT</h3>
                                <p class="text-[10px] text-slate-400">Nhiệt độ: 34°C | Đang Sạc</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-center mb-2">
                            <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                <span class="text-[9px] text-slate-400 block font-medium">DÒNG SẠC</span>
                                <span class="font-extrabold text-emerald-400 text-sm">5.8 A</span>
                            </div>
                            <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                <span class="text-[9px] text-slate-400 block font-medium">CÔNG SUẤT</span>
                                <span class="font-extrabold text-emerald-400 text-sm">177 W</span>
                            </div>
                        </div>
                        <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2 text-center">
                            <span class="text-[9px] text-emerald-300 block font-bold uppercase">Sản Lượng Hôm Nay</span>
                            <span class="font-black text-emerald-400 text-base">2.579 kWh</span>
                        </div>
                    </div>

                    <div id="block-bat" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-cyan-500/40 rounded-2xl p-4 relative">
                        <div class="flex items-center gap-3 border-b border-cyan-500/20 pb-2 mb-2.5">
                            <div class="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                                <i class="fa-solid fa-battery-three-quarters text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-cyan-300 text-sm tracking-wide">PIN LƯU TRỮ</h3>
                                <p class="text-[10px] text-slate-400">Mức SOC: 74%</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-center mb-2">
                            <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                <span class="text-[9px] text-slate-400 block font-medium">ĐIỆN ÁP</span>
                                <span class="font-extrabold text-cyan-400 text-sm">28.0 V</span>
                            </div>
                            <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                                <span class="text-[9px] text-slate-400 block font-medium">DÒNG XẢ</span>
                                <span class="font-extrabold text-cyan-400 text-sm">8.10 A</span>
                            </div>
                        </div>
                        <div class="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div class="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full w-[74%]"></div>
                        </div>
                    </div>
                </div>

                <!-- CỘT 2 -->
                <div class="flex justify-center items-center">
                    <div id="block-gti" class="block-card w-full max-w-sm bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-cyan-500/60 rounded-[36px] p-6 text-center relative shadow-cyan-500/10">
                        <div class="inline-flex p-3.5 bg-cyan-500/20 text-cyan-400 rounded-2xl mb-2 border border-cyan-500/30">
                            <i class="fa-solid fa-microchip text-3xl animate-pulse"></i>
                        </div>
                        <h3 class="font-extrabold text-cyan-300 text-base tracking-wide">GTIControl807</h3>
                        <p class="text-xs text-slate-400 mb-3">Hòa Lưới Bám Tải | Mosfet: 45°C</p>

                        <div class="space-y-2">
                            <div class="bg-slate-950/90 p-3 rounded-2xl border border-slate-800 flex justify-between items-center px-4">
                                <span class="text-xs text-slate-400 font-medium">CÔNG SUẤT XẢ</span>
                                <span class="font-extrabold text-cyan-400 text-lg">212.86 W</span>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div class="bg-slate-950/90 p-2 rounded-xl border border-slate-800">
                                    <span class="text-[9px] text-slate-400 block font-medium">ĐIỆN ÁP TẦN SỐ</span>
                                    <span class="font-bold text-slate-200 text-xs">236.53V - 49.75Hz</span>
                                </div>
                                <div class="bg-slate-950/90 p-2 rounded-xl border border-slate-800">
                                    <span class="text-[9px] text-slate-400 block font-medium">ĐIỆN ÁP NGẮT</span>
                                    <span class="font-bold text-slate-200 text-xs">24.0 V</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- CỘT 3 -->
                <div class="flex flex-col gap-10 justify-between items-center md:items-end">
                    <div id="block-grid" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-indigo-500/40 rounded-2xl p-4 relative">
                        <div class="flex items-center gap-3 border-b border-indigo-500/20 pb-2 mb-2.5">
                            <div class="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                <i class="fa-solid fa-tower-broadcast text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-indigo-300 text-sm tracking-wide">LƯỚI ĐIỆN QUỐC GIA</h3>
                                <p class="text-[10px] text-slate-400">EVN Grid 236V</p>
                            </div>
                        </div>
                        <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-center">
                            <span class="text-[9px] text-slate-400 block font-medium">LẤY LƯỚI TỨC THỜI</span>
                            <span class="font-extrabold text-indigo-400 text-sm">12.24 W</span>
                        </div>
                    </div>

                    <div id="block-load" class="block-card w-full max-w-xs bg-slate-950/90 border-2 border-purple-500/40 rounded-2xl p-4 relative">
                        <div class="flex items-center gap-3 border-b border-purple-500/20 pb-2 mb-2.5">
                            <div class="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                                <i class="fa-solid fa-house-plug text-xl"></i>
                            </div>
                            <div>
                                <h3 class="font-bold text-purple-300 text-sm tracking-wide">TẢI GIA ĐÌNH</h3>
                                <p class="text-[10px] text-slate-400">Công suất tiêu thụ</p>
                            </div>
                        </div>
                        <div class="bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-center">
                            <span class="text-[9px] text-slate-400 block font-medium">TỔNG TẢI THỜI GIAN THỰC</span>
                            <span class="font-extrabold text-purple-400 text-sm">212.33 W</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- TAB LỊCH SỬ -->
    <main id="historyView" class="container mx-auto p-4 md:p-6 flex-1 flex-col gap-6 hidden">
        <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4">
            <h2 class="text-lg font-extrabold text-white"><i class="fa-solid fa-chart-column text-cyan-400 mr-2"></i>Lịch Sử Năng Lượng 1 Tháng</h2>
        </div>
        <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <canvas id="monthlyChart" height="100"></canvas>
        </div>
    </main>

    <footer class="bg-slate-950 border-t border-slate-800/80 text-center py-2.5 text-[11px] text-slate-500">
        Solar Monitoring Dashboard &copy; 2026 - Dunght | GTIControl807 & MPPT CHG1077773
    </footer>

    <script>
        let particleProgress = { pv_mppt: 0, mppt_bat: 0, mppt_gti: 0, gti_load: 0, grid_load: 0 };

        window.addEventListener('load', () => {
            updatePaths();
            startAnimation();
        });
        window.addEventListener('resize', updatePaths);

        function switchTab(tab) {
            const realtimeView = document.getElementById('realtimeView');
            const historyView = document.getElementById('historyView');
            const rBtn = document.getElementById('tabRealtimeBtn');
            const hBtn = document.getElementById('tabHistoryBtn');
            if (tab === 'realtime') {
                realtimeView.classList.remove('hidden');
                historyView.classList.add('hidden');
                rBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow-md";
                hBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
                setTimeout(updatePaths, 100);
            } else {
                realtimeView.classList.add('hidden');
                historyView.classList.remove('hidden');
                hBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-emerald-500 text-slate-950 shadow-md";
                rBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition";
            }
        }

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

        function generateOrthogonalPath(start, end, mode) {
            if (mode === 'horizontal-first') {
                const midX = start.x + (end.x - start.x) / 2;
                return 'M ' + start.x + ' ' + start.y + ' L ' + midX + ' ' + start.y + ' L ' + midX + ' ' + end.y + ' L ' + end.x + ' ' + end.y;
            }
            return 'M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y;
        }

        function updatePaths() {
            const pvBottom = getBoxAnchor('block-pv', 'bottom');
            const mpptTop = getBoxAnchor('block-mppt', 'top');
            const mpptBottom = getBoxAnchor('block-mppt', 'bottom');
            const batTop = getBoxAnchor('block-bat', 'top');
            const mpptRight = getBoxAnchor('block-mppt', 'right');
            const gtiLeft = getBoxAnchor('block-gti', 'left');
            const gtiRight = getBoxAnchor('block-gti', 'right');
            const loadLeft = getBoxAnchor('block-load', 'left');
            const gridBottom = getBoxAnchor('block-grid', 'bottom');
            const loadTop = getBoxAnchor('block-load', 'top');

            setPathD('path-pv-mppt', 'guide-pv-mppt', generateOrthogonalPath(pvBottom, mpptTop, 'direct'));
            setPathD('path-mppt-bat', 'guide-mppt-bat', generateOrthogonalPath(mpptBottom, batTop, 'direct'));
            setPathD('path-mppt-gti', 'guide-mppt-gti', generateOrthogonalPath(mpptRight, gtiLeft, 'horizontal-first'));
            setPathD('path-gti-load', 'guide-gti-load', generateOrthogonalPath(gtiRight, loadLeft, 'horizontal-first'));
            setPathD('path-grid-load', 'guide-grid-load', generateOrthogonalPath(gridBottom, loadTop, 'direct'));
        }

        function setPathD(mainId, guideId, d) {
            document.getElementById(mainId)?.setAttribute('d', d);
            document.getElementById(guideId)?.setAttribute('d', d);
        }

        function startAnimation() {
            function animate() {
                renderParticles();
                requestAnimationFrame(animate);
            }
            animate();
        }

        function renderParticles() {
            const group = document.getElementById('particlesGroup');
            if (!group) return;
            group.innerHTML = '';

            drawFlowingParticles('path-pv-mppt', '#f59e0b', 'pv_mppt');
            drawFlowingParticles('path-mppt-bat', '#10b981', 'mppt_bat');
            drawFlowingParticles('path-mppt-gti', '#06b6d4', 'mppt_gti');
            drawFlowingParticles('path-gti-load', '#06b6d4', 'gti_load');
            drawFlowingParticles('path-grid-load', '#6366f1', 'grid_load');
        }

        function drawFlowingParticles(pathId, color, progressKey) {
            const path = document.getElementById(pathId);
            if (!path) return;
            const pathLength = path.getTotalLength();
            if (pathLength === 0) return;

            particleProgress[progressKey] += 0.002;
            if (particleProgress[progressKey] > 1) particleProgress[progressKey] = 0;

            const group = document.getElementById('particlesGroup');
            for (let i = 0; i < 3; i++) {
                let offset = (particleProgress[progressKey] + i * 0.33) % 1;
                const point = path.getPointAtLength(offset * pathLength);
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', point.x);
                circle.setAttribute('cy', point.y);
                circle.setAttribute('r', '3');
                circle.setAttribute('fill', color);
                circle.setAttribute('class', 'energy-particle');
                group.appendChild(circle);
            }
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

  if (req.method === 'POST' && req.url === '/update') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newData = JSON.parse(body);
        state = { ...state, ...newData };
        
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(state));
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server });
wss.on('connection', ws => ws.send(JSON.stringify(state)));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));