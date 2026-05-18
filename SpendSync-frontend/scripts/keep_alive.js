import https from "node:https";

const TEN_MINUTES = 10 * 60 * 1000;
const url = process.env.SPENDSYNC_HEALTH_URL || "https://YOUR-RENDER-URL.onrender.com/api/v1/health";

function ping() {
  const started = Date.now();
  const req = https.get(url, (res) => {
    res.resume();
    const elapsed = Date.now() - started;
    const ok = res.statusCode >= 200 && res.statusCode < 300;
    const level = ok ? "info" : "error";
    console[level](
      JSON.stringify({
        service: "spendsync-api",
        statusCode: res.statusCode,
        ok,
        elapsedMs: elapsed,
        checkedAt: new Date().toISOString(),
      }),
    );
  });

  req.on("error", (err) => {
    console.error(
      JSON.stringify({
        service: "spendsync-api",
        ok: false,
        error: err.message,
        checkedAt: new Date().toISOString(),
      }),
    );
  });

  req.setTimeout(15_000, () => {
    req.destroy(new Error("Health check timed out"));
  });
}

ping();
setInterval(ping, TEN_MINUTES);
