// server.js
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  // CORS 設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS（プリフライト）に応答
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // JSON 保存処理
  if (req.url === '/save' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      const newData = JSON.parse(body);

      // ★ ここがポイント：配列にせず、そのまま保存
      fs.writeFileSync('techJsonii.json', JSON.stringify(newData, null, 4));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: '保存しました' }));
    });

  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(50000, () => {
  console.log('Server running at http://localhost:50000/');
});