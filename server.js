// server.js
const http = require("http");
const fetch = require("node-fetch");

const OWNER = "daiki-coprime-tanaka";
const REPO = "TechUpdJSON";
const FILE_PATH = "techJsonii.json";
const TOKEN = process.env.GITHUB_TOKEN;

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
  // ① /save（Git Data API で書き込み）
  // -------------------------
  if (req.url === "/save" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);

    req.on("end", async () => {
      const jsonText = JSON.stringify(JSON.parse(body), null, 2);

      // 1. 現在の HEAD を取得
      const refRes = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/main`,
        {
          headers: {
            "Authorization": `token ${TOKEN}`,
            "Accept": "application/vnd.github+json"
          }
        }
      );
      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      // 2. 最新コミットの tree を取得
      const commitRes = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`,
        {
          headers: {
            "Authorization": `token ${TOKEN}`,
            "Accept": "application/vnd.github+json"
          }
        }
      );
      const commitData = await commitRes.json();
      const baseTreeSha = commitData.tree.sha;

      // 3. blob を作成
      const blobRes = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/blobs`,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${TOKEN}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: jsonText,
            encoding: "utf-8"
          })
        }
      );
      const blobData = await blobRes.json();

      // 4. 新しい tree を作成
      const treeRes = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/trees`,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${TOKEN}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: [
              {
                path: FILE_PATH,
                mode: "100644",
                type: "blob",
                sha: blobData.sha
              }
            ]
          })
        }
      );
      const treeData = await treeRes.json();

      // 5. 新しい commit を作成
      const newCommitRes = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/commits`,
        {
          method: "POST",
          headers: {
            "Authorization": `token ${TOKEN}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: "Update JSON via Git Data API",
            tree: treeData.sha,
            parents: [latestCommitSha]
          })
        }
      );
      const newCommitData = await newCommitRes.json();

      // 6. main ブランチを新しい commit に更新
      await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/main`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `token ${TOKEN}`,
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sha: newCommitData.sha
          })
        }
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "success" }));
    });

    return;
  }

// -------------------------
// ② /load（Git Data API で最新を返す）
// -------------------------
if (req.url === "/load" && req.method === "GET") {

  // 1. main の HEAD を取得
  const refRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/main`,
    {
      headers: {
        "Authorization": `token ${TOKEN}`,
        "Accept": "application/vnd.github+json"
      }
    }
  );
  const refData = await refRes.json();
  const commitSha = refData.object.sha;

  // 2. commit を取得
  const commitRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/commits/${commitSha}`,
    {
      headers: {
        "Authorization": `token ${TOKEN}`,
        "Accept": "application/vnd.github+json"
      }
    }
  );
  const commitData = await commitRes.json();
  const treeSha = commitData.tree.sha;

  // 3. tree を取得
  const treeRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`,
    {
      headers: {
        "Authorization": `token ${TOKEN}`,
        "Accept": "application/vnd.github+json"
      }
    }
  );
  const treeData = await treeRes.json();

  // 4. 対象ファイルの blob を探す
  const fileEntry = treeData.tree.find(item => item.path === FILE_PATH);

  // 5. blob を取得
  const blobRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/blobs/${fileEntry.sha}`,
    {
      headers: {
        "Authorization": `token ${TOKEN}`,
        "Accept": "application/vnd.github+json"
      }
    }
  );
  const blobData = await blobRes.json();

  const content = Buffer.from(blobData.content, "base64").toString("utf8");

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Surrogate-Control": "no-store"
  });
  res.end(content);
  return;
}

  res.writeHead(404);
  res.end("Not Found");
});

const PORT = process.env.PORT || 50000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
