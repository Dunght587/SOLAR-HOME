const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

// Cấu trúc dữ liệu thời gian thực và lịch sử mẫu
let currentData = {
  // Sạc MPPT Mạnh Quân
  mppt: {
    pvPower: 402,     // Công suất PV (W)
    pvVoltage: 54.2,  // Điện áp PV (V)
    chargeCurrent: 7.4, // Dòng sạc (A)
    batVoltage: 26.8, // Điện áp lưu trữ (V)
    batCurrent: 7.0,  // Dòng sạc lưu trữ (A)
    temp: 42,         // Nhiệt độ (°C)
    generation: 12.9  // Sản lượng trong ngày (kWh)
  },
  // Hòa lưới bám tải Gia Bảo (GTIControl807)
  inverter: {
    dischargePower: 244,  // Công suất xả / bám tải (W)
    gridPower: 0,         // Công suất lấy lưới (W)
    totalLoad: 244,       // Tổng tải tiêu thụ (W)
    batVoltage: 26.8,     // Điện áp lưu trữ (V)
    dischargeCurrent: 9.1,// Dòng xả lưu trữ (A)
    mosfetTemp: 45,       // Nhiệt độ Mosfet (°C)
    gridVoltage: 221      // Điện áp lưới AC (V)
  },
  // Tổng quan năng lượng tháng
  stats: {
    totalDischargeMonth: 64.5, // Tổng năng lượng hòa/xả tháng (kWh)
    totalGridMonth: 156.46,    // Tổng lấy lưới tháng (kWh)
    totalLoadMonth: 220.95,    // Tổng tiêu thụ tháng (kWh)
    estimatedSaving: 179764,   // Tiền điện tiết kiệm (VNĐ)
    selfSufficiency: 29        // Tự cung cấp (%)
  },
  // Dữ liệu chi tiết từng ngày trong tháng 10/2026
  historyDays: [
    { date: "01/10", discharge: 3.5, grid: 9.22, load: 12.72 },
    { date: "02/10", discharge: 2.82, grid: 10.59, load: 13.41 },
    { date: "03/10", discharge: 2.52, grid: 5.39, load: 7.91 },
    { date: "04/10", discharge: 1.77, grid: 5.72, load: 7.48 },
    { date: "05/10", discharge: 2.39, grid: 5.78, load: 8.17 },
    { date: "06/10", discharge: 2.59, grid: 5.17, load: 7.77 },
    { date: "07/10", discharge: 2.28, grid: 5.45, load: 7.74 },
    { date: "08/10", discharge: 2.32, grid: 4.66, load: 6.98 },
    { date: "09/10", discharge: 2.55, grid: 5.55, load: 8.1 },
    { date: "10/10", discharge: 2.26, grid: 4.28, load: 6.55 },
    { date: "11/10", discharge: 2.7, grid: 5.12, load: 7.82 },
    { date: "12/10", discharge: 2.96, grid: 7.0, load: 9.97 },
    { date: "13/10", discharge: 2.3, grid: 6.86, load: 9.16 },
    { date: "14/10", discharge: 2.48, grid: 5.49, load: 7.97 },
    { date: "15/10", discharge: 2.55, grid: 5.23, load: 7.78 },
    { date: "16/10", discharge: 2.57, grid: 5.59, load: 8.17 },
    { date: "17/10", discharge: 2.44, grid: 5.5, load: 7.93 },
    { date: "18/10", discharge: 2.71, grid: 6.2, load: 8.91 },
    { date: "19/10", discharge: 2.63, grid: 6.36, load: 8.99 },
    { date: "20/10", discharge: 2.45, grid: 6.53, load: 8.98 },
    { date: "21/10", discharge: 2.51, grid: 5.32, load: 7.84 },
    { date: "22/10", discharge: 2.33, grid: 7.78, load: 10.11 },
    { date: "23/10", discharge: 2.45, grid: 5.77, load: 8.22 },
    { date: "24/10", discharge: 2.64, grid: 5.29, load: 7.93 },
    { date: "25/10", discharge: 2.23, grid: 8.14, load: 10.37 },
    { date: "26/10", discharge: 1.54, grid: 2.45, load: 3.99 }
  ]
};

const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lê Nam SoLar - Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    :root {
      --bg-color: #f0f2f5;
      --card-bg: #ffffff;
      --primary: #2563eb;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --text: #1f2937;
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background-color: var(--bg-color); color: var(--text); }
    header { background-color: #ffffff; padding: 12px 15px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; font-size: 1.1rem; color: #111827; }
    .status-badge { background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    
    /* Navigation Tabs */
    .nav-tabs { display: flex; background: #ffffff; padding: 0 10px; border-bottom: 1px solid #e5e7eb; gap: 15px; }
    .tab-btn { padding: 10px 14px; border: none; background: none; font-size: 0.9rem; font-weight: 600; color: #6b7280; cursor: pointer; border-bottom: 3px solid transparent; }
    .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); }
    
    .container { padding: 12px; max-width: 800px; margin: 0 auto; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }
    .card { background: var(--card-bg); border-radius: 14px; padding: 15px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    
    /* Flow Diagram */
    .diagram-card { text-align: center; position: relative; padding: 20px 10px; }
    .flow-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; }
    .box-val { font-size: 1.3rem; font-weight: 700; color: var(--primary); margin-top: 4px; }
    .box-label { font-size: 0.8rem; color: #64748b; }
    
    /* Metrics Grid */
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .metric-card { background: #ffffff; border-radius: 10px; padding: 12px; border: 1px solid #f1f5f9; }
    .metric-title { font-size: 0.8rem; color: #64748b; }
    .metric-num { font-size: 1.3rem; font-weight: 700; margin-top: 4px; }

    /* Tables & Sub-tabs */
    .sub-tabs { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; justify-content: space-between; }
    .view-toggle { display: flex; background: #e5e7eb; border-radius: 8px; padding: 3px; }
    .view-btn { padding: 6px 14px; border: none; background: none; font-size: 0.85rem; font-weight: 600; cursor: pointer; border-radius: 6px; color: #4b5563; }
    .view-btn.active { background: #ffffff; color: var(--primary); box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    
    table { width: 100%; border-collapse: collapse; margin-top: 5px; }
    th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; }
    th { color: #64748b; font-weight: 600; background: #f8fafc; }

    .saving-box { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 15px; margin-bottom: 12px; }
    .saving-amount { font-size: 1.5rem; font-weight: 700; color: #047857; margin: 5px 0; }
  </style>
</head>
<body>

  <header>
    <h1>Lê Nam SoLar - 3503680403</h1>
    <span class="status-badge" id="conn-status">Trực tuyến</span>
  </header>

  <div class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('tab-overview')">Tổng quan</button>
    <button class="tab-btn" onclick="switchTab('tab-devices')">Thiết bị</button>
    <button class="tab-btn" onclick="switchTab('tab-data')">Dữ liệu & Lịch sử</button>
  </div>

  <div class="container">
    
    <!-- TAB 1: TỔNG QUAN -->
    <div id="tab-overview" class="tab-content active">
      <div class="card diagram-card">
        <div class="flow-grid">
          <div class="box">
            <div class="box-label">Lưới điện</div>
            <div class="box-val" id="d-grid">0 W</div>
          </div>
          <div class="box">
            <div class="box-label">Pin mặt trời</div>
            <div class="box-val" style="color: #f59e0b;" id="d-pv">402 W</div>
          </div>
        </div>
        <div style="margin: 15px 0;">
          <img src="https://cdn-icons-png.flaticon.com/512/619/619032.png" width="80" alt="House">
        </div>
        <div class="flow-grid">
          <div class="box">
            <div class="box-label">Tiêu thụ</div>
            <div class="box-val" style="color: #ef4444;" id="d-load">244 W</div>
          </div>
          <div class="box">
            <div class="box-label">Pin sạc/xả</div>
            <div class="box-val" style="color: #10b981;" id="d-bat">95 W</div>
          </div>
        </div>
      </div>

      <div class="saving-box">
        <div style="font-size: 0.85rem; color: #065f46; font-weight: 600;">💰 Tiền điện tiết kiệm (Tạm tính đến hôm nay)</div>
        <div class="saving-amount" id="sav-money">179.764 đ</div>
        <div style="font-size: 0.8rem; color: #047857;">Tự cung cấp: <b id="sav-percent">29%</b></div>
      </div>

      <h3>Năng lượng hằng ngày</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">Sản lượng (kWh)</div>
          <div class="metric-num" id="m-pv">12.9</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Tiêu thụ (kWh)</div>
          <div class="metric-num" id="m-load">6.4</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Sạc pin (kWh)</div>
          <div class="metric-num" id="m-charge">7.0</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Xả Pin (kWh)</div>
          <div class="metric-num" id="m-discharge">1.5</div>
        </div>
      </div>
    </div>

    <!-- TAB 2: THIẾT BỊ -->
    <div id="tab-devices" class="tab-content">
      <div class="card">
        <h3 style="margin-top:0; color:#2563eb;">☀️ Sạc MPPT Mạnh Quân</h3>
        <table>
          <tr><td>Công suất PV (W)</td><td id="mppt-p" style="font-weight:bold;">402 W</td></tr>
          <tr><td>Điện áp PV (V)</td><td id="mppt-pv-v">54.2 V</td></tr>
          <tr><td>Dòng sạc PV (A)</td><td id="mppt-pv-i">7.4 A</td></tr>
          <tr><td>Điện áp lưu trữ (V)</td><td id="mppt-bat-v">26.8 V</td></tr>
          <tr><td>Dòng sạc lưu trữ (A)</td><td id="mppt-bat-i">7.0 A</td></tr>
          <tr><td>Nhiệt độ bo mạch</td><td id="mppt-temp">42 °C</td></tr>
          <tr><td>Sản lượng trong ngày</td><td id="mppt-gen" style="color: #f59e0b; font-weight:bold;">12.9 kWh</td></tr>
        </table>
      </div>

      <div class="card">
        <h3 style="margin-top:0; color:#10b981;">⚡ Bám tải Gia Bảo (GTIControl807)</h3>
        <table>
          <tr><td>Công suất xả / bám tải</td><td id="inv-dis-p" style="font-weight:bold;">244 W</td></tr>
          <tr><td>Công suất lấy lưới</td><td id="inv-grid-p">0 W</td></tr>
          <tr><td>Tổng tải tiêu thụ</td><td id="inv-tot-load" style="font-weight:bold;">244 W</td></tr>
          <tr><td>Điện áp lưu trữ (V)</td><td id="inv-bat-v">26.8 V</td></tr>
          <tr><td>Dòng xả lưu trữ (A)</td><td id="inv-dis-i">9.1 A</td></tr>
          <tr><td>Nhiệt độ Mosfet</td><td id="inv-mos-temp" style="color: #ef4444;">45 °C</td></tr>
        </table>
      </div>
    </div>

    <!-- TAB 3: DỮ LIỆU & LỊCH SỬ -->
    <div id="tab-data" class="tab-content">
      <div class="card">
        <div class="sub-tabs">
          <select id="month-select" style="padding: 6px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 0.85rem; font-weight: 600;">
            <option value="10-2026" selected>Tháng 10 / 2026</option>
            <option value="09-2026">Tháng 09 / 2026</option>
          </select>
          <div class="view-toggle">
            <button class="view-btn active" id="btn-chart" onclick="switchView('chart')">Biểu đồ</button>
            <button class="view-btn" id="btn-table" onclick="switchView('table')">Bảng</button>
          </div>
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; margin-bottom: 15px; font-size: 0.85rem; line-height: 1.5;">
          <div>🔹 Tổng năng lượng hòa (xả): <b id="sum-discharge" style="color:#2563eb;">64,5 kWh</b></div>
          <div>🔸 Tổng lấy lưới: <b id="sum-grid" style="color:#f59e0b;">156,46 kWh</b></div>
          <div>💡 Tiết kiệm ước tính: <b id="sum-saving" style="color:#047857;">179.764 đ</b></div>
          <div>📊 % Hòa lưới trên tổng tiêu thụ: <b id="sum-ratio" style="color:#10b981;">29.18%</b></div>
        </div>

        <!-- VIEW BIỂU ĐỒ -->
        <div id="view-chart-container">
          <canvas id="historyChart" height="220"></canvas>
        </div>

        <!-- VIEW BẢNG -->
        <div id="view-table-container" style="display: none; max-height: 350px; overflow-y: auto;">
          <table>
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Hòa lưới (kWh)</th>
                <th>Lấy lưới (kWh)</th>
                <th>Tổng tiêu thụ (kWh)</th>
              </tr>
            </thead>
            <tbody id="table-body">
              <!-- Render by JS -->
            </tbody>
          </table>
        </div>
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

    function switchView(type) {
      if(type === 'chart') {
        document.getElementById('view-chart-container').style.display = 'block';
        document.getElementById('view-table-container').style.display = 'none';
        document.getElementById('btn-chart').classList.add('active');
        document.getElementById('btn-table').classList.remove('active');
      } else {
        document.getElementById('view-chart-container').style.display = 'none';
        document.getElementById('view-table-container').style.display = 'block';
        document.getElementById('btn-table').classList.add('active');
        document.getElementById('btn-chart').classList.remove('active');
      }
    }

    // Khởi tạo biểu đồ Chart.js (Biểu đồ cột chồng tháng 10)
    let historyDaysData = [];
    let chartInstance = null;

    function initDashboard(data) {
      historyDaysData = data.historyDays;
      
      // Render bảng dữ liệu 4 cột
      const tbody = document.getElementById('table-body');
      tbody.innerHTML = '';
      historyDaysData.forEach(item => {
        tbody.innerHTML += \`<tr>
          <td>\${item.date}</td>
          <td>\${item.discharge}</td>
          <td>\${item.grid}</td>
          <td>\${item.load}</td>
        </tr>\`;
      });

      // Vẽ biểu đồ
      const ctx = document.getElementById('historyChart').getContext('2d');
      if(chartInstance) chartInstance.destroy();
      
      chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: historyDaysData.map(i => i.date),
          datasets: [
            {
              label: 'Hòa lưới (kWh)',
              data: historyDaysData.map(i => i.discharge),
              backgroundColor: '#2563eb'
            },
            {
              label: 'Lấy lưới (kWh)',
              data: historyDaysData.map(i => i.grid),
              backgroundColor: '#f59e0b'
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            x: { stacked: true },
            y: { stacked: true, beginAtZero: true }
          }
        }
      });
    }

    // WebSocket nhận dữ liệu real-time
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(protocol + '//' + window.location.host);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.mppt) {
          document.getElementById('d-pv').innerText = data.mppt.pvPower + ' W';
          document.getElementById('d-grid').innerText = data.inverter.gridPower + ' W';
          document.getElementById('d-load').innerText = data.inverter.totalLoad + ' W';
          document.getElementById('d-bat').innerText = data.inverter.dischargePower + ' W';

          // Cập nhật tab thiết bị MPPT
          document.getElementById('mppt-p').innerText = data.mppt.pvPower + ' W';
          document.getElementById('mppt-pv-v').innerText = data.mppt.pvVoltage + ' V';
          document.getElementById('mppt-pv-i').innerText = data.mppt.chargeCurrent + ' A';
          document.getElementById('mppt-bat-v').innerText = data.mppt.batVoltage + ' V';
          document.getElementById('mppt-bat-i').innerText = data.mppt.batCurrent + ' A';
          document.getElementById('mppt-temp').innerText = data.mppt.temp + ' °C';
          document.getElementById('mppt-gen').innerText = data.mppt.generation + ' kWh';

          // Cập nhật tab thiết bị Inverter Bám tải
          document.getElementById('inv-dis-p').innerText = data.inverter.dischargePower + ' W';
          document.getElementById('inv-grid-p').innerText = data.inverter.gridPower + ' W';
          document.getElementById('inv-tot-load').innerText = data.inverter.totalLoad + ' W';
          document.getElementById('inv-bat-v').innerText = data.inverter.batVoltage + ' V';
          document.getElementById('inv-dis-i').innerText = data.inverter.dischargeCurrent + ' A';
          document.getElementById('inv-mos-temp').innerText = data.inverter.mosfetTemp + ' °C';
        }
        if(data.historyDays) {
          initDashboard(data);
        }
      } catch(e){}
    };

    // Load dữ liệu mẫu ban đầu
    initDashboard( ${JSON.stringify(currentData)} );
  </script>
</body>
</html>
`;

// HTTP Server xử lý giao diện và API nhận dữ liệu POST
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
        currentData = { ...currentData, ...newData };
        
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

const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
  ws.send(JSON.stringify(currentData));
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));