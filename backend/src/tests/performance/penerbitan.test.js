// load-test-worker.js
// Load test dengan pengukuran keberhasilan worker via polling HTTP
// Setiap VU pakai sertifikat berbeda (tidak tabrakan)
// Jalankan: k6 run load-test-worker.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";
import { CookieJar } from "k6/http";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// ─── Custom metrics ────────────────────────────────────────────────────────────
const workerDuration = new Trend("worker_duration_ms", true); // waktu worker selesai
const submitDuration = new Trend("submit_duration_ms", true);
const verifyDuration = new Trend("verify_duration_ms", true);
const pollCount = new Trend("worker_poll_count"); // berapa kali poll sampai selesai
const workerSuccess = new Rate("worker_success_rate");
const workerFailed = new Counter("worker_failed_total");
const workerTimeout = new Counter("worker_timeout_total");
const submitErrors = new Counter("submit_errors_total");

// ─── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

const USER_CREDS = {
  email: __ENV.USER_EMAIL || "raflihaidarnashif@gmail.com",
  password: __ENV.USER_PASS || "rafli123.",
};
const ADMIN_CREDS = {
  email: __ENV.ADMIN_EMAIL || "prabowo@gmail.com",
  password: __ENV.ADMIN_PASS || "prabowo",
};

// Polling config
const POLL_INTERVAL_S = 2; // cek tiap 2 detik
const POLL_TIMEOUT_S = 120; // timeout 2 menit menunggu worker

// ─── Options: 10-50 VU, ~500 request ─────────────────────────────────────────
export const options = {
  scenarios: {
    worker_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 10 }, // warm up
        { duration: "2m", target: 30 }, // naik
        { duration: "2m", target: 50 }, // tahan
        { duration: "1m", target: 0 }, // cool down
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    "http_req_duration{step:submit}": ["p(95)<5000"],
    "http_req_duration{step:verify_payment}": ["p(95)<3000"],
    "http_req_duration{step:poll_worker}": ["p(95)<1000"],
    worker_duration_ms: ["p(90)<60000"], // worker selesai < 60 detik
    worker_success_rate: ["rate>0.90"], // 90% worker berhasil
    http_req_failed: ["rate<0.10"],
    submit_errors_total: ["count<50"],
  },
};

// ─── Per-VU state ─────────────────────────────────────────────────────────────
let userJar = null;
let userToken = null;
let adminJar = null;

// ─── Helper: jitter sleep ─────────────────────────────────────────────────────
function jitterSleep(min = 0.3, max = 1.5) {
  sleep(Math.random() * (max - min) + min);
}

// ─── Helper: log response verbose ────────────────────────────────────────────
function logResponse(label, res) {
  console.log(`\n${"═".repeat(55)}`);
  console.log(`📥 [VU${__VU}][${label}]`);
  console.log(`  Status  : ${res.status}`);
  console.log(`  Duration: ${res.timings.duration.toFixed(0)} ms`);
  console.log(`  Body    :`);
  try {
    console.log(JSON.stringify(JSON.parse(res.body), null, 2));
  } catch {
    console.log(res.body?.slice(0, 500) || "(empty)");
  }
  console.log("═".repeat(55));
}

// ─── Helper: login ────────────────────────────────────────────────────────────
function loginAndGetJar(creds, role) {
  const jar = new CookieJar();
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(creds), {
    headers: { "Content-Type": "application/json" },
    jar,
  });

  const ok = check(res, { [`login(${role}): 200`]: (r) => r.status === 200 });
  if (!ok) {
    logResponse(`LOGIN(${role}) ❌`, res);
    throw new Error(`Login gagal: ${creds.email} — ${res.status}`);
  }
  console.log(`✅ [VU${__VU}] Login ${role} OK`);

  let token = null;
  try {
    token =
      res.json("data.token") ||
      res.json("data.accessToken") ||
      res.json("accessToken") ||
      res.json("token") ||
      null;
  } catch (_) {}

  const meHeaders = { "Content-Type": "application/json" };
  if (token) meHeaders["Authorization"] = `Bearer ${token}`;

  const meRes = http.get(`${BASE_URL}/api/auth/me`, {
    jar,
    headers: meHeaders,
  });

  let userId = null;
  try {
    userId =
      meRes.json("data.id") ||
      meRes.json("data.user_id") ||
      meRes.json("id") ||
      null;
  } catch (_) {}

  if (!userId) {
    console.warn(`⚠️  [VU${__VU}] userId tidak ditemukan di /me (${role})`);
    logResponse(`GET /me (${role})`, meRes);
  }

  return { jar, token, userId };
}

// ─── Dummy JPEG ───────────────────────────────────────────────────────────────
function dummyFile(name) {
  const buffer = new ArrayBuffer(22);
  const view = new Uint8Array(buffer);
  [
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ].forEach((b, i) => {
    view[i] = b;
  });
  return http.file(buffer, name, "image/jpeg");
}

// ─── Setup ────────────────────────────────────────────────────────────────────
export function setup() {
  console.log(`\n🚀 === LOAD TEST WORKER (10-50 VU) ===`);
  console.log(`   BASE_URL : ${BASE_URL}`);

  const { jar: setupJar, userId } = loginAndGetJar(USER_CREDS, "setup-user");

  // Fetch semua land
  const landRes = http.get(`${BASE_URL}/api/land`, { jar: setupJar });
  const lands = landRes.json("data") || [];
  if (!lands.length) throw new Error("❌ Tidak ada land data!");

  // Fetch head office
  const hoRes = http.get(`${BASE_URL}/api/officer/head-office`, {
    jar: setupJar,
  });
  const offices = hoRes.json("data") || {};
  const landOfficeId = offices?.land_office_id || null;

  // ── Buat pool: tiap entry unik, VU ke-N ambil index N (tidak tabrakan) ──────
  const pool = lands.slice(0, 300).map((land) => {
    const cert = land.certificates?.[0];
    const ownerPersonId = cert?.owners?.[0]?.person_id || null;
    const personId = userId || ownerPersonId;

    return {
      land_id: land.id,
      cert_code: cert?.code || null,
      nib: cert?.nib || null,
      land_office_id: landOfficeId,
      person_id: personId,
    };
  });

  console.log(
    `✅ Setup selesai — ${pool.length} land, landOfficeId: ${landOfficeId}`,
  );

  const emptyPerson = pool.filter((p) => !p.person_id).length;
  if (emptyPerson) console.warn(`⚠️  ${emptyPerson} entries tanpa person_id`);

  return { pool, totalLands: pool.length };
}

// ─── Poll worker result ───────────────────────────────────────────────────────
function pollWorkerResult(fileNumber, submitTimestamp) {
  const pollParams = { tags: { step: "poll_worker" } };
  let polls = 0;
  const maxPolls = Math.floor(POLL_TIMEOUT_S / POLL_INTERVAL_S);

  while (polls < maxPolls) {
    sleep(POLL_INTERVAL_S);
    polls++;

    const encoded = encodeURIComponent(fileNumber);
    const res = http.get(
      `${BASE_URL}/api/worker-result/${encoded}`,
      pollParams,
    );
    check(res, {
      "poll: status 200/202": (r) => r.status === 200 || r.status === 202,
    });

    if (res.status !== 200 && res.status !== 202) {
      console.error(`❌ [VU${__VU}] Poll error: ${res.status}`);
      continue;
    }

    let body;
    try {
      body = res.json();
    } catch {
      continue;
    }

    if (body.status === "completed") {
      const workerMs = body.durationMs ?? Date.now() - submitTimestamp;
      console.log(
        `🎉 [VU${__VU}] Worker selesai — fileNumber: ${fileNumber}, ` +
          `workerMs: ${workerMs}, polls: ${polls}`,
      );
      pollCount.add(polls);
      return { status: "completed", durationMs: workerMs };
    }

    if (body.status === "failed") {
      console.error(
        `❌ [VU${__VU}] Worker GAGAL — fileNumber: ${fileNumber}, error: ${body.error}`,
      );
      pollCount.add(polls);
      return { status: "failed", durationMs: Date.now() - submitTimestamp };
    }

    console.log(`⏳ [VU${__VU}] Poll ke-${polls} — pending (${fileNumber})`);
  }

  console.error(
    `⏱  [VU${__VU}] Worker TIMEOUT — fileNumber: ${fileNumber} (${POLL_TIMEOUT_S}s)`,
  );
  pollCount.add(polls);
  return { status: "timeout", durationMs: POLL_TIMEOUT_S * 1_000 };
}

// ─── Default ──────────────────────────────────────────────────────────────────
export default function ({ pool, totalLands }) {
  if (!userJar) {
    jitterSleep(0, 2);
    const r = loginAndGetJar(USER_CREDS, "user");
    userJar = r.jar;
    userToken = r.token;
  }
  if (!adminJar) {
    adminJar = loginAndGetJar(ADMIN_CREDS, "admin").jar;
  }

  const slotIndex = (__VU - 1 + __ITER * 50) % totalLands;
  const seed = pool[slotIndex];

  console.log(
    `\n▶ [VU${__VU}][ITER${__ITER}] slot: ${slotIndex}, land_id: ${seed.land_id}`,
  );

  if (!seed.person_id) {
    console.warn(`⚠️  [VU${__VU}] person_id kosong di slot ${slotIndex}, skip`);
    jitterSleep();
    return;
  }

  // ── Step 1: Submit ─────────────────────────────────────────────────────────
  const submitParams = {
    jar: userJar,
    tags: { step: "submit" },
  };
  if (userToken)
    submitParams.headers = { Authorization: `Bearer ${userToken}` };

  const submitRes = http.post(
    `${BASE_URL}/api/ownership-transfer/submit`,
    {
      person_id: seed.person_id,
      land_id: seed.land_id,
      land_office_id: seed.land_office_id,
      cert_type: "SHM",
      cert_code: seed.cert_code,
      nib: seed.nib,
      cert_file: dummyFile("cert_file.jpg"),
      akta_jual_beli: dummyFile("akta_jual_beli.jpg"),
      fc_sppt: dummyFile("fc_sppt.jpg"),
      fc_pbb: dummyFile("fc_pbb.jpg"),
      ssb: dummyFile("ssb.jpg"),
      ktp_penjual: dummyFile("ktp_penjual.jpg"),
      kk_pembeli: dummyFile("kk_pembeli.jpg"),
      ktp_pembeli: dummyFile("ktp_pembeli.jpg"),
      "owners[0][person_id]": seed.person_id,
      "owners[0][share]": "1",
    },
    submitParams,
  );
  submitDuration.add(submitRes.timings.duration);

  const submitOk = check(submitRes, {
    "submit: status 200/201": (r) => r.status === 200 || r.status === 201,
    "submit: ada applicationId": (r) => {
      try {
        return !!r.json("data.id") || !!r.json("applicationId");
      } catch {
        return false;
      }
    },
  });

  if (!submitOk) {
    submitErrors.add(1);
    workerSuccess.add(false);
    logResponse("SUBMIT ❌", submitRes);
    jitterSleep(1, 3);
    return;
  }

  const applicationId =
    submitRes.json("data.id") || submitRes.json("applicationId");
  const fileNumber =
    submitRes.json("data.file_number") || submitRes.json("fileNumber");
  console.log(
    `✅ [VU${__VU}] Submit OK — appId: ${applicationId}, fileNumber: ${fileNumber}`,
  );

  jitterSleep(0.3, 1.0);

  // ── Step 2: Verify Payment ─────────────────────────────────────────────────
  const verifyRes = http.put(
    `${BASE_URL}/api/ownership-transfer/verify/payment/${applicationId}`,
    JSON.stringify({ notes: [`Load test VU${__VU} ITER${__ITER}`] }),
    {
      headers: { "Content-Type": "application/json" },
      jar: adminJar,
      tags: { step: "verify_payment" },
    },
  );
  verifyDuration.add(verifyRes.timings.duration);

  const verifyOk = check(verifyRes, {
    "verify: status 200": (r) => r.status === 200,
  });

  if (!verifyOk) {
    workerSuccess.add(false);
    logResponse("VERIFY ❌", verifyRes);
    jitterSleep(1, 3);
    return;
  }
  console.log(`✅ [VU${__VU}] Verify payment OK`);

  // ── Step 3: Poll worker result ─────────────────────────────────────────────
  if (!fileNumber) {
    console.warn(
      `⚠️  [VU${__VU}] fileNumber tidak ada di response submit — skip poll`,
    );
    workerSuccess.add(true);
    jitterSleep();
    return;
  }

  const submitTimestamp = Date.now();
  const workerResult = pollWorkerResult(fileNumber, submitTimestamp);

  if (workerResult.status === "completed") {
    workerSuccess.add(true);
    workerDuration.add(workerResult.durationMs);
  } else if (workerResult.status === "failed") {
    workerSuccess.add(false);
    workerFailed.add(1);
    workerDuration.add(workerResult.durationMs);
  } else {
    // timeout
    workerSuccess.add(false);
    workerTimeout.add(1);
  }

  jitterSleep(0.5, 2.0);
}

// ─── Summary: generate HTML report ───────────────────────────────────────────
export function handleSummary(data) {
  return {
    "report.html": htmlReport(data),
  };
}
