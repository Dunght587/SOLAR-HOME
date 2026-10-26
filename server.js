const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

// Dữ liệu mẫu thời gian thực
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

    <!-- REALTIME DASHBOARD -->
    <main id="realtimeView" class="container mx-auto p-4 md:p-6 flex-1 flex flex-col justify-center items-center">

        <!-- Thẻ Chỉ Số Nhanh -->
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

        <!-- Sơ đồ khối -->
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
                            <div class="p-2 bg-