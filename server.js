// server.js
const http = require('http');
const fetch = require('node-fetch');

const OWNER = "daiki-coprime-tanaka";   // ← GitHub ユーザー名
const REPO = "TechUpdJSON";             // ← リポジトリ名
const FILE_PATH = "techJsonii.json";    // ← 更新したいファイル
const TOKEN = process.env.GITHUB_TOKEN; // ← Render の環境変数に設定

const server = http.createServer(async (req, res) => {
  // CORS 設定
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/save" && req.method === "POST") {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", async () => {
      const newData = JSON.stringify(JSON.parse(body), null, 2);

      // ① まず GitHub から現在のファイルの SHA を取得
      const getUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
      const getRes = await fetch(getUrl, {
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Accept": "application/vnd.github+json"
        }
      });

      const fileInfo = await getRes.json();
      const sha = fileInfo.sha; // ← 更新には SHA が必須

      // ② GitHub に PUT してファイルを更新
      const updateRes = await fetch(getUrl, {
        method: "PUT",
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Update JSON via API",
          content: Buffer.from(newData).toString("base64"),
          sha: sha
        })
      });

      const result = await updateRes.json();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        status: "success",
        message: "GitHub に保存しました",
        github: result
      }));
    });

  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(50000, () => {
  console.log("Server running at http://localhost:50000/");
});
