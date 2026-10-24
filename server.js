const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 10000;

// Tạo HTTP Server cơ bản
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Hệ thống giám sát năng lượng mặt trời SOLAR-HOME đang hoạt động!\n');
});

// Tạo WebSocket Server chạy chung cổng với HTTP
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Đã có thiết bị/Trình duyệt kết nối thành công!');

  ws.on('message', (message) => {
    console.log(`Nhận dữ liệu: ${message}`);
    // Phát tán dữ liệu nhận được tới tất cả các client đang kết nối (Wemos / Dashboard)
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Thiết bị đã ngắt kết nối.');
  });
});

server.listen(PORT, () => {
  console.log(`Server đang chạy tại cổng ${PORT}`);
});