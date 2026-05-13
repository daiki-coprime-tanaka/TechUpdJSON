// server.js
const http = require('http');
const fetch = require('node-fetch');

const OWNER = "daiki-coprime-tanaka";
const REPO = "TechUpdJSON";
const FILE_PATH = "techJsonii.json";
const TOKEN = process.env.GITHUB_TOKEN;

console.log("TOKEN:", TOKEN ? "OK" : "NOT FOUND");

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // -------------------------
  // ① /save（書き込み）
  // -------------------------
  if (req.url === "/save" && req.method === "POST") {
    let body = "";

    req.on("data", chunk => body += chunk);

    req.on("end", async () => {
      const newData = JSON.stringify(JSON.parse(body), null, 2);

      const getUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

      const getRes = await fetch(getUrl, {
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Accept": "application/vnd.github+json"
        }
      });

      const fileInfo = await getRes.json();

      if (!fileInfo.sha) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", detail: fileInfo }));
        return;
      }

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
          sha: fileInfo.sha
        })
      });

      const result = await updateRes.json();

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success", github: result }));
    });

    return;
  }

  // -------------------------
  // ② /load（読み出し）
  // -------------------------
  if (req.url === "/load" && req.method === "GET") {
    const getUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

    const getRes = await fetch(getUrl, {
      headers: {
        "Authorization": `token ${TOKEN}`,
        "Accept": "application/vnd.github+json"
      }
    });

    const fileInfo = await getRes.json();
    const content = Buffer.from(fileInfo.content, "base64").toString("utf8");

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(content);
    return;
  }

  // -------------------------
  // ③ どれにも該当しない場合は 404
  // -------------------------
  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.PORT || 50000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
