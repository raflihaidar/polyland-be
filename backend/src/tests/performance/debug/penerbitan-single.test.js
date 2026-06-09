// debug-single-request.js
// Versi debug: 1 VU, 1 iterasi, log semua data yang dikirim & diterima
// Jalankan dengan: k6 run debug-single-request.js

import http from "k6/http";
import { check, sleep } from "k6";
import { CookieJar } from "k6/http";

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

// ─── Hanya 1 VU, 1 iterasi ────────────────────────────────────────────────────
export const options = {
  vus: 1,
  iterations: 1,
};

// ─── Helper: log response secara lengkap ──────────────────────────────────────
function logResponse(label, res) {
  console.log("\n" + "═".repeat(60));
  console.log(`📥 [${label}] RESPONSE`);
  console.log("═".repeat(60));
  console.log(`  Status  : ${res.status}`);
  console.log(`  URL     : ${res.url}`);
  console.log(`  Duration: ${res.timings.duration.toFixed(2)} ms`);
  console.log("  Headers :");
  for (const [k, v] of Object.entries(res.headers)) {
    console.log(`    ${k}: ${v}`);
  }
  console.log("  Body    :");
  try {
    const parsed = JSON.parse(res.body);
    console.log(JSON.stringify(parsed, null, 4));
  } catch {
    console.log(res.body?.slice(0, 2000) || "(empty)");
  }
  console.log("═".repeat(60) + "\n");
}

// ─── Helper: log request yang akan dikirim ────────────────────────────────────
function logRequest(label, method, url, payload) {
  console.log("\n" + "─".repeat(60));
  console.log(`📤 [${label}] REQUEST`);
  console.log("─".repeat(60));
  console.log(`  Method : ${method}`);
  console.log(`  URL    : ${url}`);
  if (payload) {
    console.log("  Payload:");
    if (typeof payload === "object") {
      const display = {};
      for (const [k, v] of Object.entries(payload)) {
        if (v && v.data instanceof ArrayBuffer) {
          display[k] =
            `[FILE: ${v.filename}, ${v.content_type}, ${v.data.byteLength} bytes]`;
        } else {
          display[k] = v;
        }
      }
      console.log(JSON.stringify(display, null, 4));
    } else {
      console.log(payload);
    }
  }
  console.log("─".repeat(60));
}

// ─── Helper: login, ambil userId via /me ──────────────────────────────────────
function loginAndGetJar(creds) {
  const jar = new CookieJar();
  const url = `${BASE_URL}/api/auth/login`;

  logRequest("LOGIN", "POST", url, creds);

  const res = http.post(url, JSON.stringify(creds), {
    headers: { "Content-Type": "application/json" },
    jar,
  });

  logResponse("LOGIN", res);

  const ok = check(res, { "login: status 200": (r) => r.status === 200 });
  if (!ok) {
    throw new Error(
      `Login gagal untuk ${creds.email}: ${res.status} — ${res.body?.slice(0, 200)}`,
    );
  }

  // ── Coba ambil token dari body (untuk app yang pakai Bearer token) ──────────
  let token = null;
  try {
    token =
      res.json("data.token") ||
      res.json("data.accessToken") ||
      res.json("accessToken") ||
      res.json("token") ||
      null;
  } catch (_) {}

  if (token) {
    console.log(`🔑 Token ditemukan di body login: ${token.slice(0, 30)}...`);
  } else {
    console.log("🍪 Tidak ada token di body — menggunakan cookie session.");
  }

  // ── Hit /api/auth/me untuk ambil userId ─────────────────────────────────────
  const meHeaders = { "Content-Type": "application/json" };
  if (token) {
    meHeaders["Authorization"] = `Bearer ${token}`;
  }

  const meRes = http.get(`${BASE_URL}/api/auth/me`, {
    jar, // kirim cookie sekalian (aman meski pakai token)
    headers: meHeaders,
  });

  logResponse("GET /api/auth/me", meRes);

  let userId = null;
  try {
    userId =
      meRes.json("data.id") ||
      meRes.json("data.user_id") ||
      meRes.json("id") ||
      null;
  } catch (_) {}

  if (userId) {
    console.log(`✅ userId berhasil didapat: ${userId}`);
  } else {
    console.warn(
      `⚠️  userId tidak ditemukan di response /me — cek log di atas`,
    );
  }

  return { jar, token, userId };
}

// ─── Dummy file ────────────────────────────────────────────────────────────────
function dummyFile(name) {
  const buffer = new ArrayBuffer(22);
  const view = new Uint8Array(buffer);
  const bytes = [
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9,
  ];
  bytes.forEach((b, i) => {
    view[i] = b;
  });
  return http.file(buffer, name, "image/jpeg");
}

// ─── Setup ─────────────────────────────────────────────────────────────────────
export function setup() {
  console.log("\n🚀 === DEBUG SINGLE REQUEST MODE ===");
  console.log(`   BASE_URL : ${BASE_URL}`);
  console.log(`   USER     : ${USER_CREDS.email}`);
  console.log(`   ADMIN    : ${ADMIN_CREDS.email}`);
  console.log("====================================\n");

  const { jar: userJar, userId } = loginAndGetJar(USER_CREDS);

  // ── Fetch lands ──────────────────────────────────────────────────────────────
  const landUrl = `${BASE_URL}/api/land`;
  console.log(`\n📋 Fetching lands dari: ${landUrl}`);
  const landRes = http.get(landUrl, { jar: userJar });
  logResponse("GET /api/land", landRes);

  const lands = landRes.json("data") || [];
  if (!lands.length)
    throw new Error("Tidak ada land data! Pastikan sudah seed DB.");

  // ── Fetch head office ────────────────────────────────────────────────────────
  const headOfficeUrl = `${BASE_URL}/api/officer/head-office`;
  console.log(`\n🏢 Fetching head office dari: ${headOfficeUrl}`);
  const headOfficeRes = http.get(headOfficeUrl, { jar: userJar });
  logResponse("GET /api/officer/head-office", headOfficeRes);

  const offices = headOfficeRes.json("data") || {};
  const landOfficeId = offices?.land_office_id || null;

  const firstLand = lands[0];
  console.log("data tanah : ", lands[0]);
  const firstCert = firstLand.certificates?.[0];
  console.log("data sertifikat : ", firstLand.certificates?.[0]);
  const ownerPersonId = firstCert?.owners?.[0]?.person_id || null;

  // Prioritas person_id: dari /me, fallback ke owner di sertifikat
  const personId = userId || ownerPersonId;

  const seed = {
    land_id: firstLand.id,
    cert_code: firstCert?.code || null,
    nib: firstCert?.nib || null,
    land_office_id: landOfficeId,
    person_id: personId,
  };

  console.log("\n🌱 Seed data yang akan dipakai:");
  console.log(JSON.stringify(seed, null, 4));

  if (!seed.person_id) {
    console.warn("⚠️  person_id kosong! Submit mungkin akan gagal.");
  }
  if (!seed.land_office_id) {
    console.warn(
      "⚠️  land_office_id kosong! Cek response /api/officer/head-office.",
    );
  }

  return { seed };
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ({ seed }) {
  // Destructure dengan benar — loginAndGetJar mengembalikan { jar, token, userId }
  const { jar: userJar, token: userToken } = loginAndGetJar(USER_CREDS);
  const { jar: adminJar } = loginAndGetJar(ADMIN_CREDS);

  // ── Step 1: Submit ────────────────────────────────────────────────────────────
  const submitUrl = `${BASE_URL}/api/ownership-transfer/submit`;
  const submitPayload = {
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
  };

  // Tambah Authorization header kalau pakai token
  const submitParams = {
    jar: userJar,
    tags: { step: "submit" },
  };
  if (userToken) {
    submitParams.headers = { Authorization: `Bearer ${userToken}` };
  }

  logRequest("SUBMIT", "POST", submitUrl, submitPayload);
  const submitRes = http.post(submitUrl, submitPayload, submitParams);
  logResponse("SUBMIT", submitRes);

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
    console.error("❌ Submit GAGAL — berhenti di sini.");
    return;
  }

  const applicationId =
    submitRes.json("data.id") || submitRes.json("applicationId");
  console.log(`\n✅ Submit berhasil! applicationId = ${applicationId}`);

  sleep(1);

  // ── Step 2: Verify Payment ────────────────────────────────────────────────────
  const verifyUrl = `${BASE_URL}/api/ownership-transfer/verify/payment/${applicationId}`;
  const verifyPayload = JSON.stringify({
    notes: ["Debug single request test"],
  });

  logRequest("VERIFY PAYMENT", "PUT", verifyUrl, {
    notes: ["Debug single request test"],
  });

  const verifyRes = http.put(verifyUrl, verifyPayload, {
    headers: { "Content-Type": "application/json" },
    jar: adminJar,
    tags: { step: "verify_payment" },
  });

  logResponse("VERIFY PAYMENT", verifyRes);

  const verifyOk = check(verifyRes, {
    "verify: status 200": (r) => r.status === 200,
  });

  if (!verifyOk) {
    console.error("❌ Verify payment GAGAL.");
    return;
  }

  console.log("\n🎉 Semua step selesai dengan sukses!");
}
