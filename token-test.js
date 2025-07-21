const CLIENT_ID = "1004388657829-mvpott95dsl5bapu40vi2n5li7i7t7d1.apps.googleusercontent.com";
const REDIRECT_URI = "https://noharashiroi.github.io/google-photos-token-test/";
const SCOPES = "https://www.googleapis.com/auth/photoslibrary.readonly";
const WORKER_URL = "https://photoforipadmini.n16961801.workers.dev/";

function log(msg) {
  const el = document.getElementById("output");
  el.textContent += `\n${msg}`;
}

async function maybeExchangeCode() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  if (!code) return;

  log("🔁 偵測到 code，呼叫 Worker 交換 token...");

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: REDIRECT_URI })
    });

    const text = await res.text();
    log("🔽 Worker 回應原始內容：\n" + text);

    let data = {};
    try {
      data = JSON.parse(text);
    } catch (e) {
      log("❌ JSON 解析錯誤：" + e.message);
      return;
    }

    if (data.access_token) {
      log("✅ 成功取得 access_token");
      await checkTokenScope(data.access_token);
      await tryPhotosAPI(data.access_token);
      window.history.replaceState({}, document.title, REDIRECT_URI);
    } else {
      log("❌ Worker 回傳內容中沒有 access_token，錯誤如下：");
      log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    log("❌ 與 Worker 通訊錯誤：" + err.message);
  }
}

async function checkTokenScope(token) {
  const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
  const data = await res.json();
  log("\n📜 Token info: \n" + JSON.stringify(data, null, 2));
}

async function tryPhotosAPI(token) {
  log("\n🚀 嘗試呼叫 Google Photos API...");
  const res = await fetch("https://photoslibrary.googleapis.com/v1/albums?pageSize=1", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const text = await res.text();
  log("\n📦 API 回應：\n" + text);
}

function initCodeClient() {
  const codeClient = google.accounts.oauth2.initCodeClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    ux_mode: "redirect",
    state: "token-test"
  });

  document.getElementById("authorize-btn").addEventListener("click", () => {
    codeClient.requestCode();
  });
}

window.onload = () => {
  maybeExchangeCode();
  const wait = () => {
    if (window.google && google.accounts && google.accounts.oauth2) {
      initCodeClient();
    } else {
      setTimeout(wait, 100);
    }
  };
  wait();
};
