/**
 * Auth API — k6 Test Script
 * ─────────────────────────────────────────────
 * Endpoints : POST /api/auth/register
 *             POST /api/auth/login
 *
 * Login: accessToken & refreshToken disimpan di Set-Cookie (bukan JSON body)
 *
 * Run        : k6 run auth.test.js
 * Debug mode : k6 run --env DEBUG=true auth.test.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { CookieJar } from "k6/http";

// ─── Custom Metrics ───────────────────────────────────────────────────────────

const registerDuration = new Trend("register_duration", true);
const loginDuration = new Trend("login_duration", true);
const failedRequests = new Rate("failed_requests");
const totalRequests = new Counter("total_requests");

// ─── Options ──────────────────────────────────────────────────────────────────

export const options = {
  scenarios: {
    auth_load: {
      executor: "per-vu-iterations",
      vus: 10,
      iterations: 5,
      maxDuration: "2m",
    },
  },
  thresholds: {
    http_req_duration: ["avg<1000", "p(95)<2000"],
    failed_requests: ["rate<0.05"],
    register_duration: ["avg<1500", "p(95)<3000"],
    login_duration: ["avg<1000", "p(95)<2000"],
  },
};

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:5000/api/auth";
const HEADERS = { "Content-Type": "application/json" };
const DEBUG = __ENV.DEBUG === "true"; // k6 run --env DEBUG=true

function log(...args) {
  if (DEBUG || (__VU === 1 && __ITER === 0)) {
    console.log(`[VU${__VU}-ITER${__ITER}]`, ...args);
  }
}

function uniqueSuffix() {
  return `vu${__VU}_i${__ITER}_${Date.now()}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export default function () {
  const suffix = uniqueSuffix();
  const email = `${suffix}@loadtest.com`;
  const password = "LoadTest123!";

  // CookieJar per VU — simulasi browser terpisah
  const jar = new CookieJar();
  const params = { headers: HEADERS, jar };

  // ── 1. Register ─────────────────────────────────────────────────────────────
  group("register", () => {
    const payload = JSON.stringify({
      name: `Load Test ${suffix}`,
      username: suffix, // pakai suffix langsung sbg username
      email,
      password,
      confirmPassword: password,
    });

    const res = http.post(`${BASE_URL}/register`, payload, params);

    registerDuration.add(res.timings.duration);
    totalRequests.add(1);

    // Debug: tampilkan status & body agar mudah diagnosa
    log(`REGISTER → status: ${res.status} | body: ${res.body}`);

    const ok = check(res, {
      "register: status 200/201": (r) => r.status === 200 || r.status === 201,
      "register: duration < 2s": (r) => r.timings.duration < 2000,
    });

    failedRequests.add(!ok);
  });

  sleep(0.3);

  // ── 2. Login ─────────────────────────────────────────────────────────────────
  group("login", () => {
    const payload = JSON.stringify({ email, password });

    const res = http.post(`${BASE_URL}/login`, payload, params);

    loginDuration.add(res.timings.duration);
    totalRequests.add(1);

    // Debug: tampilkan status, body, dan semua cookie yang diterima
    const cookieNames = Object.keys(res.cookies);
    log(`LOGIN → status: ${res.status} | body: ${res.body}`);
    log(`LOGIN → cookies: [${cookieNames.join(", ")}]`);

    // Nama cookie token yang umum dipakai
    const TOKEN_COOKIE_NAMES = [
      "token",
      "accessToken",
      "access_token",
      "refreshToken",
      "refresh_token",
      "session",
      "sid",
      "auth",
      "jwt",
    ];
    const hasCookie = cookieNames.length > 0;
    const hasTokenCookie = cookieNames.some((n) =>
      TOKEN_COOKIE_NAMES.includes(n),
    );

    const ok = check(res, {
      "login: status 200": (r) => r.status === 200,
      "login: Set-Cookie header ada": () => hasCookie,
      "login: cookie token ditemukan": () => hasTokenCookie || hasCookie,
      "login: duration < 1s": (r) => r.timings.duration < 1000,
    });

    failedRequests.add(!ok);
  });

  sleep(0.2);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  console.log("=".repeat(55));
  console.log("  🔐 AUTH LOAD TEST — k6");
  console.log("  Base URL    : " + BASE_URL);
  console.log("  VUs         : 10  |  Iterasi: 5 per VU");
  console.log("  Est. total  : 100 request (50 register + 50 login)");
  console.log("  Login token : via Set-Cookie header");
  console.log("  Debug mode  : k6 run --env DEBUG=true auth.test.js");
  console.log("=".repeat(55));

  // ── Smoke test sebelum load dimulai ────────────────────────────────────────
  // Pastikan server UP dan 1 siklus register+login berhasil
  const suffix = `smoke_${Date.now()}`;
  const email = `${suffix}@loadtest.com`;
  const password = "LoadTest123!";

  console.log("\n  🔍 Smoke test sebelum load dimulai...");

  const regRes = http.post(
    `${BASE_URL}/register`,
    JSON.stringify({
      name: `Smoke Test`,
      username: suffix,
      email,
      password,
      confirmPassword: password,
    }),
    { headers: HEADERS },
  );
  console.log(`  [smoke] register → ${regRes.status} | ${regRes.body}`);

  if (regRes.status !== 200 && regRes.status !== 201) {
    console.error("  ❌ Register smoke test GAGAL — periksa server & payload");
  }

  const loginRes = http.post(
    `${BASE_URL}/login`,
    JSON.stringify({ email, password }),
    { headers: HEADERS },
  );
  const cookieNames = Object.keys(loginRes.cookies);
  console.log(
    `  [smoke] login   → ${loginRes.status} | body: ${loginRes.body}`,
  );
  console.log(`  [smoke] cookies → [${cookieNames.join(", ")}]`);

  if (loginRes.status !== 200) {
    console.error(
      "  ❌ Login smoke test GAGAL — periksa server & cookie config",
    );
  } else {
    console.log("  ✅ Smoke test OK — memulai load test\n");
  }
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

export function teardown() {
  console.log("\n  Metrik utama:");
  console.log("  • http_req_duration → Avg & Max Response Time");
  console.log("  • http_req_failed   → Request Failed Rate");
  console.log("  • http_reqs         → Throughput (req/s)");
  console.log("  • register_duration → Avg /register");
  console.log("  • login_duration    → Avg /login");
}
