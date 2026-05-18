const DEFAULT_HEALTH_PATH = "/api/v1/health";
const RETRIES = Number.parseInt(process.env.KEEP_ALIVE_RETRIES || "3", 10);
const TIMEOUT_MS = Number.parseInt(process.env.KEEP_ALIVE_TIMEOUT_MS || "15000", 10);

function targetUrl() {
  const raw = process.env.RENDER_BACKEND_URL;
  if (!raw) {
    throw new Error("RENDER_BACKEND_URL is required");
  }
  const url = new URL(raw);
  if (url.pathname === "/" || url.pathname === "" || url.pathname === "/api" || url.pathname === "/api/v1") {
    url.pathname = DEFAULT_HEALTH_PATH;
  } else if (!url.pathname.endsWith("/health")) {
    const pathname = url.pathname.replace(/\/$/, "");
    if (pathname.endsWith("/api")) {
      url.pathname = `${pathname}/v1/health`;
    } else if (pathname.endsWith("/api/v1")) {
      url.pathname = `${pathname}/health`;
    }
  }
  return url;
}

function safeUrl(url) {
  return `${url.origin}${url.pathname}`;
}

async function ping(url, attempt) {
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "ExpenseMania-KeepAlive/1.0",
        Accept: "application/json,text/plain,*/*",
      },
    });
    const elapsedMs = Date.now() - started;
    const ok = response.status >= 200 && response.status < 300;
    console.log(
      JSON.stringify({
        service: "expensemania-api",
        ok,
        attempt,
        statusCode: response.status,
        elapsedMs,
        checkedAt: new Date().toISOString(),
        target: safeUrl(url),
      }),
    );
    if (!ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const url = targetUrl();
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      await ping(url, attempt);
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          service: "expensemania-api",
          ok: false,
          attempt,
          error: message,
          checkedAt: new Date().toISOString(),
          target: safeUrl(url),
        }),
      );
      if (attempt < RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  throw lastError;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
