// server.js
const http = require('http');
const fetch = require('node-fetch');

const OWNER = "daiki-coprime-tanaka";
const REPO = "TechUpdJSON";
const FILE_PATH = "techJsonii.json";
const TOKEN = process.env.GITHUB_TOKEN;

// ★ TOKEN が読めているか確認
console.log("TOKEN:", TOKEN ? "OK" : "NOT FOUND");

const server = http.createServer(async (req, res) => {
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

    req.on("data", chunk => body += chunk);

    req.on("end", async () => {
      const newData = JSON.stringify(JSON.parse(body), null, 2);

      const getUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

      // ★ SHA 取得
      const getRes = await fetch(getUrl, {
        headers: {
          "Authorization": `token ${TOKEN}`,
          "Accept": "application/vnd.github+json"
        }
      });

      console.log("GET status:", getRes.status);

      const fileInfo = await getRes.json();
      console.log("GET response:", fileInfo);

      if (!fileInfo.sha) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "error",
          message: "SHA が取得できませんでした",
          detail: fileInfo
        }));
        return;
      }

      // ★ PUT 更新
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

      console.log("PUT status:", updateRes.status);

      const result = await updateRes.json();
      console.log("PUT response:", result);

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

const PORT = process.env.PORT || 50000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
