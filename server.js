const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

// Bộ nhớ lưu trữ dữ liệu thời gian thực & lịch sử
let currentData = {
  pvPower: 0,       // Công suất Pin mặt trời (W)
  gridPower: 0,     // Công suất Lưới điện (W)
  loadPower: 0,     // Công suất Tiêu thụ (W)
  batPower: 0,      // Công suất Pin sạc/xả (W)
  batSoC: 100,      // Phần trăm pin (%)
  batCharging: true,// Trạng thái sạc/xả
  dailyPvKwh: 0.0,
  dailyLoadKwh: 0.0,
  dailyChargeKwh: 0.0,
  dailyDischargeKwh: 0.0,
  mppt: { voltage: 0, current: 0, temp: 0, status: 'Hoạt động' },
  inverter: { voltage: 0, current: 0, gridVoltage: 0, status: 'Bám tải' }
};

// HTML Dashboard Interface
const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SOLAR-HOME Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-color: #f4f6f9;
      --card-bg: #ffffff;
      --primary: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #1f2937;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background-color: var(--bg-color); color: var(--text); }
    header { background-color: #ffffff; padding: 15px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; font-size: 1.2rem; color: #111827; }
    .status-badge { background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
    
    /* Navigation Tabs */
    .nav-tabs { display: flex; background: #ffffff; padding: 0 10px; border-bottom: 1px solid #e5e7eb; gap: 20px; }
    .tab-btn { padding: 12px 16px; border: none; background: none; font-size: 0.95rem; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 3px solid transparent; }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    
    /* Container & Cards */
    .container { padding: 15px; max-width: 800px; margin: 0 auto; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .card { background: var(--card-bg); border-radius: 16px; padding: 20px; margin-bottom: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    
    /* Flow Diagram */
    .diagram-card { text-align: center; position: relative; padding: 30px 10px; }
    .flow-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; }
    .box-val { font-size: 1.4rem; font-weight: 700; color: var(--primary); margin-top: 5px; }
    .box-label { font-size: 0.85rem; color: #64748b; }
    
    /* Metrics Grid */
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .metric-card { background: #ffffff; border-radius: 12px; padding: 15px; border: 1px solid #f1f5f9; }
    .metric-title { font-size: 0.85rem; color: #64748b; }
    .metric-num { font-size: 1.5rem; font-weight: 700; margin-top: 5px; }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
    th { color: #64748b; font-weight: 600; }
  </style>
</head>
<body>

  <header>
    <h1>Lê Nam SoLar- 3503680403</h1>
    <span class="status-badge" id="conn-status">Kết nối 24/7</span>
  </header>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('tab-overview')">Tổng quan</button>
    <button class="tab-btn" onclick="switchTab('tab-devices')">Thiết bị</button>
    <button class="tab-btn" onclick="switchTab('tab-data')">Dữ liệu & Lịch sử</button>
  </div>

  <div class="container">
    
    <!-- TAB TỔNG QUAN -->
    <div id="tab-overview" class="tab-content active">
      <div class="card diagram-card">
        <div class="flow-grid">
          <div class="box">
            <div class="box-label">Lưới điện</div>
            <div class="box-val" id="disp-grid">0 W</div>
          </div>
          <div class="box">
            <div class="box-label">Pin mặt trời</div>
            <div class="box-val" style="color: #f59e0b;" id="disp-pv">402 W</div>
          </div>
        </div>
        <div style="margin: 20px 0;">
          <img src="https://cdn-icons-png.flaticon.com/512/619/619032.png" width="90" alt="House">
        </div>
        <div class="flow-grid">
          <div class="box">
            <div class="box-label">Tiêu thụ</div>
            <div class="box-val" style="color: #ef4444;" id="disp-load">244 W</div>
          </div>
          <div class="box">
            <div class="box-label">Pin sạc/xả</div>
            <div class="box-val" style="color: #10b981;" id="disp-bat">95 W (100%)</div>
          </div>
        </div>
      </div>

      <h3>Năng lượng hằng ngày</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">Sản lượng (kWh)</div>
          <div class="metric-num" id="kwh-pv">12.9</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Tiêu thụ (kWh)</div>
          <div class="metric-num" id="kwh-load">6.4</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Sạc pin (kWh)</div>
          <div class="metric-num" id="kwh-charge">7.0</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Xả Pin (kWh)</div>
          <div class="metric-num" id="kwh-discharge">1.5</div>
        </div>
      </div>
    </div>

    <!-- TAB THIẾT BỊ -->
    <div id="tab-devices" class="tab-content">
      <div class="card">
        <h3>Sạc MPPT Mạnh Quân</h3>
        <table>
          <tr><td>Điện áp Pin mặt trời (PV)</td><td id="mppt-v">54.2 V</td></tr>
          <tr><td>Dòng sạc MPPT</td><td id="mppt-i">7.4 A</td></tr>
          <tr><td>Nhiệt độ bo mạch</td><td id="mppt-t">42 °C</td></tr>
          <tr><td>Trạng thái</td><td style="color: green; font-weight: bold;">Hoạt động tốt</td></tr>
        </table>
      </div>

      <div class="card">
        <h3>Hòa lưới bám tải Gia Bảo (GTIControl807)</h3>
        <table>
          <tr><td>Điện áp Lưới AC</td><td id="inv-grid-v">221 V</td></tr>
          <tr><td>Công suất Hòa lưới</td><td id="inv-p">244 W</td></tr>
          <tr><td>Chế độ bám tải</td><td style="color: green; font-weight: bold;">Đang bám tải 100%</td></tr>
        </table>
      </div>
    </div>

    <!-- TAB DỮ LIỆU & LỊCH SỬ -->
    <div id="tab-data" class="tab-content">
      <div class="card">
        <h3>Biểu đồ sản lượng theo thời gian</h3>
        <canvas id="solarChart" height="200"></canvas>
      </div>
    </div>

  </div>

  <script>
    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      event.currentTarget.classList.add('active');
    }

    // Kết nối WebSocket tự động với server Render
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(protocol + '//' + window.location.host);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.pvPower !== undefined) {
          document.getElementById('disp-pv').innerText = data.pvPower + ' W';
          document.getElementById('disp-grid').innerText = data.gridPower + ' W';
          document.getElementById('disp-load').innerText = data.loadPower + ' W';
          document.getElementById('disp-bat').innerText = data.batPower + ' W (' + data.batSoC + '%)';
        }
      } catch(e){}
    };

    // Khởi tạo Biểu đồ Chart.js
    const ctx = document.getElementById('solarChart').getContext('2d');
    const solarChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
        datasets: [{
          label: 'Sản lượng PV (kWh)',
          data: [10.5, 12.9, 11.2, 14.0, 9.8, 13.5, 12.0],
          backgroundColor: '#2563eb'
        }]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  </script>
</body>
</html>
`;

// Http Server
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlContent);
    return;
  }

  // Endpoint nhận dữ liệu đẩy từ TV Box / ESP qua HTTP POST
  if (req.method === 'POST' && req.url === '/update') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const newData = JSON.parse(body);
        currentData = { ...currentData, ...newData };
        
        // Phát dữ liệu trực tiếp tới các Web Dashboard đang mở
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(currentData));
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

// WebSocket Server
const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
  ws.send(JSON.stringify(currentData));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));