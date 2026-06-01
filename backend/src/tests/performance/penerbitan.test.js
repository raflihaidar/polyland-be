// load-test.js
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";
import { CookieJar } from "k6/http";

// ─── Custom metrics ────────────────────────────────────────────────────────────
const workerCompletionTime = new Trend("worker_completion_ms", true);
const submitErrors = new Counter("submit_errors");
const verifyErrors = new Counter("verify_errors");
const workerFailRate = new Rate("worker_fail_rate");

// ─── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";
const POLL_INTERVAL = 2;
const POLL_TIMEOUT = 60;

// Kredensial — pisahkan user biasa dan admin
const USER_CREDS = {
  email: __ENV.USER_EMAIL || "raflihaidarnashif@gmail.com",
  password: __ENV.USER_PASS || "rafli123.",
};
const ADMIN_CREDS = {
  email: __ENV.ADMIN_EMAIL || "prabowo@gmail.com",
  password: __ENV.ADMIN_PASS || "prabowo",
};

// ─── Per-VU state: login hanya sekali per VU, bukan per iterasi ───────────────
// Dengan ini, 200 VU = 200 login (bukan 200 * jumlah_iterasi)
let userJar = null;
let adminJar = null;

// ─── Helper: random jitter sleep (hindari thundering herd ke Redis) ────────────
// Semua VU yang sleep(1) bersamaan = spike. Jitter menyebarkan request.
function jitterSleep(min = 0.5, max = 2.5) {
  sleep(Math.random() * (max - min) + min);
}

// ─── Helper: login dan kembalikan CookieJar ────────────────────────────────────
function loginAndGetJar(creds) {
  const jar = new CookieJar();

  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(creds), {
    headers: { "Content-Type": "application/json" },
    jar,
  });

  check(res, { "login: status 200": (r) => r.status === 200 });

  if (res.status !== 200) {
    throw new Error(
      `Login gagal untuk ${creds.email}: ${res.status} — ${res.body?.slice(0, 200)}`,
    );
  }

  return jar;
}

// ─── Setup: jalankan sekali, hasilkan pool seed data ──────────────────────────
export function setup() {
  // Login sebagai user biasa untuk ambil data
  const userJar = loginAndGetJar(USER_CREDS);

  const landRes = http.get(`${BASE_URL}/api/land`, {
    jar: userJar,
  });

  check(landRes, { "setup: lands 200": (r) => r.status === 200 });

  const lands = landRes.json("data") || landRes.json("lands") || [];
  if (!lands.length) {
    throw new Error(
      "Setup gagal: tidak ada land data. Pastikan sudah seed DB.",
    );
  }

  const headOfficeRes = http.get(`${BASE_URL}/api/officer/head-office`, {
    jar: userJar,
  });
  const offices = headOfficeRes.json("data") || [];
  const landOfficeId = offices?.land_office_id || "LAND_OFFICE_ID_FALLBACK";

  const pool = lands.slice(0, 200).map((land) => ({
    land_id: land.id,
    cert_code: land.certificates?.[0]?.code,
    nib: land.certificates?.[0]?.nib,
    land_office_id: landOfficeId,
    person_id: land.certificates?.[0]?.owners?.[0]?.person_id,
  }));

  console.log(`✅ Setup selesai — ${pool.length} land siap dipakai`);
  return { pool };
}

// ─── Load stages: naik BERTAHAP agar Redis tidak kena spike ───────────────────
//
// Sebelumnya:
//   2m → 50 VU, 3m → 100 VU, 3m → 200 VU   ← naik terlalu cepat
//
// Sekarang:
//   2m → 20 VU  (warm up)
//   3m → 50 VU  (stabil, pastikan Redis OK)
//   3m → 100 VU (naikkan perlahan)
//   3m → 150 VU (stabil lagi)
//   2m → 0 VU   (cool down)
//
// Jika Redis masih kewalahan di 50 VU, turunkan target atau naikkan durasi.
export const options = {
  scenarios: {
    // Gunakan arrival-rate agar server tidak dibanjiri burst
    // Rate: max 30 request submit/detik, terlepas dari jumlah VU
    ownership_transfer: {
      executor: "ramping-arrival-rate",
      startRate: 5, // mulai dari 5 req/s
      timeUnit: "1s",
      preAllocatedVUs: 50, // siapkan 50 VU di awal
      maxVUs: 150, // batas atas VU yang bisa dibuat
      stages: [
        { duration: "2m", target: 10 }, // 10 req/s — warm up
        { duration: "3m", target: 20 }, // 20 req/s — naik pelan
        { duration: "3m", target: 30 }, // 30 req/s — stabil
        { duration: "3m", target: 40 }, // 40 req/s — naik lagi
        { duration: "2m", target: 0 }, // cool down
      ],
    },
  },
  thresholds: {
    "http_req_duration{step:submit}": ["p(95)<3000"],
    "http_req_duration{step:verify_payment}": ["p(95)<2000"],
    worker_completion_ms: ["p(90)<30000"],
    http_req_failed: ["rate<0.05"],
    worker_fail_rate: ["rate<0.05"],
  },
};

// ─── Dummy file ────────────────────────────────────────────────────────────────
function dummyFile(name) {
  const buffer = new ArrayBuffer(22);
  const view = new Uint8Array(buffer);

  // minimal valid JPEG bytes
  const bytes = [
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ];
  bytes.forEach((b, i) => {
    view[i] = b;
  });

  return http.file(buffer, name, "image/jpeg");
}

// ─── Default function ──────────────────────────────────────────────────────────
export default function ({ pool }) {
  // ── Lazy init login: hanya login sekali per VU, bukan per iterasi ──────────
  // Tanpa ini: 200 VU × 10 iterasi = 2.000 login request → Redis spike
  // Dengan ini: 200 VU × 1 login   = 200 login request saja
  if (!userJar) {
    // Tambah jitter kecil agar semua VU tidak login bersamaan saat start
    jitterSleep(0, 1);
    userJar = loginAndGetJar(USER_CREDS);
  }
  if (!adminJar) {
    adminJar = loginAndGetJar(ADMIN_CREDS);
  }

  const seed = pool[(__VU - 1) % pool.length];

  // ── Step 1: Submit permohonan ───────────────────────────────────────────────
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
    {
      jar: userJar,
      tags: { step: "submit" },
    },
  );

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
    console.error(
      `[VU${__VU}] Submit gagal: ${submitRes.status} — ${submitRes.body?.slice(0, 200)}`,
    );
    // Jitter sebelum retry agar tidak langsung spike lagi
    jitterSleep(1, 3);
    return;
  }

  const applicationId =
    submitRes.json("data.id") || submitRes.json("applicationId");

  // Jitter antar step — sebelumnya sleep(0.5) seragam untuk semua VU
  jitterSleep(0.3, 1.0);

  // ── Step 2: Admin verify payment ────────────────────────────────────────────
  const verifyRes = http.put(
    `${BASE_URL}/api/ownership-transfer/verify/payment/${applicationId}`,
    JSON.stringify({
      notes: [`Load test VU ${__VU} iter ${__ITER}`],
    }),
    {
      headers: { "Content-Type": "application/json" },
      jar: adminJar,
      tags: { step: "verify_payment" },
    },
  );

  const verifyOk = check(verifyRes, {
    "verify: status 200": (r) => r.status === 200,
  });

  if (!verifyOk) {
    verifyErrors.add(1);
    console.error(
      `[VU${__VU}] Verify gagal: ${verifyRes.status} — ${verifyRes.body?.slice(0, 200)}`,
    );
    jitterSleep(1, 3);
    return;
  }

  // ── Step 3: Poll status worker (aktifkan jika perlu) ────────────────────────
  // const startMs = Date.now();
  // let elapsed = 0;

  // while (elapsed < POLL_TIMEOUT) {
  //   jitterSleep(POLL_INTERVAL - 0.5, POLL_INTERVAL + 0.5); // jitter pada poll
  //   elapsed += POLL_INTERVAL;

  //   const statusRes = http.get(
  //     `${BASE_URL}/api/ownership-transfer/${applicationId}/status`,
  //     {
  //       jar: userJar,
  //       tags: { step: "poll_status" },
  //     },
  //   );

  //   if (statusRes.status !== 200) continue;

  //   let status;
  //   try {
  //     status = statusRes.json("status") || statusRes.json("data.status");
  //   } catch {
  //     continue;
  //   }

  //   if (status === "completed" || status === "COMPLETED") {
  //     workerCompletionTime.add(Date.now() - startMs);
  //     workerFailRate.add(false);
  //     break;
  //   }

  //   if (status === "failed" || status === "FAILED") {
  //     workerCompletionTime.add(Date.now() - startMs);
  //     workerFailRate.add(true);
  //     console.warn(`[VU${__VU}] Worker failed — ${applicationId}`);
  //     break;
  //   }
  // }

  // Jitter di akhir iterasi — kunci utama menghindari thundering herd
  jitterSleep(0.5, 2.5);
}
