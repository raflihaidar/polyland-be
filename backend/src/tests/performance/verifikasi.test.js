import http from "k6/http";
import { check, sleep } from "k6";
import { CookieJar } from "k6/http";
import { Trend, Counter, Rate } from "k6/metrics";
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

// ─── Custom metrics ────────────────────────────────────────────────────────────
const verifyDuration = new Trend("verify_duration_ms", true);
const verifySuccess = new Rate("verify_success_rate");
const verifyNotFound = new Counter("verify_not_found_total");
const verifyInvalidInput = new Counter("verify_invalid_input_total");
const verifyBlockchainFail = new Counter("verify_blockchain_fail_total");
const verifyServerError = new Counter("verify_server_error_total");

// ─── Config ────────────────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

const USER_CREDS = {
  email: __ENV.USER_EMAIL || "raflihaidarnashif@gmail.com",
  password: __ENV.USER_PASS || "rafli123.",
};

// ─── Options ──────────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Skenario 1: steady load
    steady_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "2m", target: 50 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "15s",
      tags: { scenario: "steady" },
    },

    // Skenario 2: spike
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      startTime: "4m30s",
      stages: [
        { duration: "10s", target: 80 },
        { duration: "30s", target: 80 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "10s",
      tags: { scenario: "spike" },
    },
  },

  thresholds: {
    "http_req_duration{scenario:steady}": ["p(95)<3000", "p(99)<5000"],
    "http_req_duration{scenario:spike}": ["p(95)<5000"],
    verify_duration_ms: ["p(90)<3000", "p(95)<5000"],
    verify_success_rate: ["rate>0.95"],
    http_req_failed: ["rate<0.10"],
    verify_blockchain_fail_total: ["count<20"],
    verify_server_error_total: ["count<10"],
  },
};

// ─── Helper: log response saat error ──────────────────────────────────────────
function logResponse(label, res) {
  console.warn(
    `[${label}] status=${res.status} body=${
      res.body ? res.body.substring(0, 200) : "(empty)"
    }`,
  );
}

// ─── Helper: login & kembalikan { jar, token, userId } ────────────────────────
function loginAndGetJar(creds, role) {
  const jar = new CookieJar();

  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(creds), {
    headers: { "Content-Type": "application/json" },
    jar,
  });

  const ok = check(res, {
    [`login(${role}): 200`]: (r) => r.status === 200,
  });

  if (!ok) {
    logResponse(`LOGIN(${role}) ❌`, res);
    throw new Error(`Login gagal: ${creds.email} — ${res.status}`);
  }
  console.log(`✅ [VU${__VU}] Login ${role} OK`);

  // ── Ekstrak token ────────────────────────────────────────────────────────────
  let token = null;
  try {
    token =
      res.json("data.token") ||
      res.json("data.accessToken") ||
      res.json("accessToken") ||
      res.json("token") ||
      null;
  } catch (_) {}

  // ── Panggil /me untuk dapat userId ──────────────────────────────────────────
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

// ─── Setup ─────────────────────────────────────────────────────────────────────
export function setup() {
  console.log(`\n🚀 === VERIFY CERTIFICATE PERFORMANCE TEST ===`);
  console.log(`   BASE_URL: ${BASE_URL}`);

  const {
    jar: setupJar,
    token,
    userId,
  } = loginAndGetJar(USER_CREDS, "setup-user");

  const authHeaders = { "Content-Type": "application/json" };
  if (token) authHeaders["Authorization"] = `Bearer ${token}`;

  // ── Fetch list sertifikat ────────────────────────────────────────────────────
  const listRes = http.get(`${BASE_URL}/api/certificate?limit=200`, {
    jar: setupJar,
    headers: authHeaders,
  });

  let validCertCodes = [];

  if (listRes.status === 200) {
    try {
      const data = listRes.json("data") || [];
      validCertCodes = data
        .filter((c) => c.code !== null && c.code !== undefined)
        .map((c) => c.code);
    } catch (_) {
      console.warn("⚠️  Gagal parse JSON dari /api/certificate");
    }
  } else {
    logResponse("GET /api/certificate", listRes);
  }

  // ── Fetch land data & head office ───────────────────────────────────────────
  const landRes = http.get(`${BASE_URL}/api/land`, {
    jar: setupJar,
    headers: authHeaders,
  });
  const lands = (() => {
    try {
      return landRes.json("data") || [];
    } catch (_) {
      return [];
    }
  })();

  const hoRes = http.get(`${BASE_URL}/api/officer/head-office`, {
    jar: setupJar,
    headers: authHeaders,
  });
  const offices = (() => {
    try {
      return hoRes.json("data") || {};
    } catch (_) {
      return {};
    }
  })();
  const landOfficeId = offices?.land_office_id || null;

  // ── Bangun pool land ─────────────────────────────────────────────────────────
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

  if (!validCertCodes.length) {
    validCertCodes = pool.map((p) => p.cert_code).filter(Boolean);
  }

  if (!validCertCodes.length) {
    console.warn(
      "⚠️  Tidak bisa fetch cert_code dari API, pakai fallback manual.",
    );
    validCertCodes = ["CERT-001", "CERT-002", "CERT-003"];
  }

  const emptyPerson = pool.filter((p) => !p.person_id).length;
  if (emptyPerson) console.warn(`⚠️  ${emptyPerson} entries tanpa person_id`);

  console.log(
    `✅ Setup selesai — ${validCertCodes.length} cert_code, ${pool.length} land, landOfficeId: ${landOfficeId}`,
  );

  return {
    validCertCodes,
    totalValid: validCertCodes.length,
    pool,
    totalLands: pool.length,
  };
}

// ─── Helper: pilih cert_code unik per VU per iterasi ──────────────────────────
function pickCertCode(validCertCodes, total) {
  const idx = (__VU - 1 + __ITER * 50) % total;
  return validCertCodes[idx];
}

// ─── Default function ──────────────────────────────────────────────────────────
export default function ({ validCertCodes, totalValid }) {
  const rand = Math.random();

  // ────────────────────────────────────────────────────────────────────────────
  // Case 1 (60%): Happy path — cert_code valid
  // Ekspektasi: HTTP 200, success: true, isVerified: true
  // ────────────────────────────────────────────────────────────────────────────
  if (rand < 0.6) {
    const certCode = pickCertCode(validCertCodes, totalValid);

    const res = http.get(
      `${BASE_URL}/api/certificate/verify-mock/${certCode}`,
      { tags: { step: "verify_valid" } },
    );
    verifyDuration.add(res.timings.duration);

    const ok = check(res, {
      "verify valid: status 200": (r) => r.status === 200,
      "verify valid: success true": (r) => {
        try {
          return r.json("success") === true;
        } catch {
          return false;
        }
      },
      "verify valid: isVerified true": (r) => {
        try {
          return r.json("data.isVerified") === true;
        } catch {
          return false;
        }
      },
      "verify valid: ada certificate": (r) => {
        try {
          return !!r.json("data.certificate");
        } catch {
          return false;
        }
      },
      "verify valid: ada cert code": (r) => {
        try {
          return !!r.json("data.certificate.code");
        } catch {
          return false;
        }
      },
      "verify valid: ada land data": (r) => {
        try {
          return !!r.json("data.certificate.land");
        } catch {
          return false;
        }
      },
      "verify valid: ada owners array": (r) => {
        try {
          return Array.isArray(r.json("data.certificate.owners"));
        } catch {
          return false;
        }
      },
      "verify valid: ada notes array": (r) => {
        try {
          return Array.isArray(r.json("data.certificate.notes"));
        } catch {
          return false;
        }
      },
    });

    verifySuccess.add(ok);

    if (!ok) {
      if (res.status === 502) verifyBlockchainFail.add(1);
      if (res.status === 500) verifyServerError.add(1);
      console.error(
        `❌ [VU${__VU}] Happy path GAGAL — certCode: ${certCode}, status: ${res.status}`,
      );
      logResponse("verify_valid ❌", res);
    } else {
      console.log(
        `✅ [VU${__VU}] Verify OK — certCode: ${certCode}, ${res.timings.duration.toFixed(0)}ms`,
      );
    }

    sleep(Math.random() * 1 + 0.5);
    return;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Case 2 (20%): cert_code tidak ada di DB
  // Ekspektasi: HTTP 200 (bukan 404), success: false
  // Sesuai perubahan: AppError("Data sertifikat tidak ditemukan", 200)
  // ────────────────────────────────────────────────────────────────────────────
  if (rand < 0.8) {
    const fakeCertCode = `FAKE-CERT-${__VU}-${__ITER}`;

    const res = http.get(
      `${BASE_URL}/api/certificate/verify-mock/${fakeCertCode}`,
      { tags: { step: "verify_not_found" } },
    );
    verifyDuration.add(res.timings.duration);

    const ok = check(res, {
      // Sebelumnya 404, sekarang 200 karena AppError statusCode: 200
      "verify not found: status 200": (r) => r.status === 200,
      "verify not found: success false": (r) => {
        try {
          return r.json("success") === false;
        } catch {
          return false;
        }
      },
      "verify not found: ada message": (r) => {
        try {
          return !!r.json("message");
        } catch {
          return false;
        }
      },
      "verify not found: pesan sesuai": (r) => {
        try {
          return r.json("message") === "Data sertifikat tidak ditemukan";
        } catch {
          return false;
        }
      },
      // Pastikan tidak ada data sertifikat yang ikut terkirim
      "verify not found: data null/undefined": (r) => {
        try {
          const d = r.json("data");
          return d === null || d === undefined;
        } catch {
          return true;
        }
      },
    });

    // Counter: tambah jika response sesuai ekspektasi (200 + success false)
    if (res.status === 200) {
      verifyNotFound.add(1);
    } else {
      // Status lain (misal 500) = masalah server
      verifyServerError.add(1);
      console.warn(
        `⚠️  [VU${__VU}] cert_code tidak ada tapi status bukan 200: ${res.status}`,
      );
      logResponse("verify_not_found ⚠️", res);
    }

    // Error yang diharapkan (not found) dihitung sebagai sukses secara test
    verifySuccess.add(ok);

    sleep(Math.random() * 0.5 + 0.2);
    return;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Case 3 (20%): input kosong / karakter aneh
  // Ekspektasi: HTTP 200 (AppError statusCode: 200) atau 400 jika validasi middleware
  // Sebelumnya: 400 — sekarang: 200 karena AppError("...", 200)
  // ────────────────────────────────────────────────────────────────────────────
  const invalidInputs = [
    "",
    "   ",
    "../../etc/passwd",
    "<script>alert(1)</script>",
    "null",
    "undefined",
    "SELECT * FROM certificates",
    "'; DROP TABLE certificates; --",
  ];
  const badInput = invalidInputs[__VU % invalidInputs.length];

  const res = http.get(
    `${BASE_URL}/api/certificate/verify-mock/${encodeURIComponent(badInput)}`,
    { tags: { step: "verify_invalid" } },
  );
  verifyDuration.add(res.timings.duration);

  const ok = check(res, {
    // 200 jika lolos ke service (AppError), 400 jika ditangkap middleware validasi
    "verify invalid: status 200 atau 400": (r) =>
      r.status === 200 || r.status === 400,
    "verify invalid: success false": (r) => {
      try {
        return r.json("success") === false;
      } catch {
        return false;
      }
    },
    "verify invalid: ada message": (r) => {
      try {
        return !!r.json("message");
      } catch {
        return false;
      }
    },
    // Pastikan tidak ada data sertifikat yang ikut terkirim
    "verify invalid: tidak ada data cert": (r) => {
      try {
        const cert = r.json("data.certificate");
        return cert === null || cert === undefined;
      } catch {
        return true;
      }
    },
  });

  if (res.status === 200 || res.status === 400) {
    verifyInvalidInput.add(1);
  } else if (res.status === 500) {
    verifyServerError.add(1);
    console.error(
      `❌ [VU${__VU}] Invalid input menyebabkan server error! input: "${badInput}", status: ${res.status}`,
    );
    logResponse("verify_invalid ❌", res);
  }

  verifySuccess.add(ok);
  sleep(Math.random() * 0.3 + 0.1);
}

// ─── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    [`verify-cert-report-${timestamp}.html`]: htmlReport(data),
    stdout: textSummary(data),
  };
}

// ─── Helper: ringkasan teks di terminal ───────────────────────────────────────
function textSummary(data) {
  const m = data.metrics;
  const fmt = (v) => (v !== undefined ? v.toFixed(2) : "N/A");

  return `
╔══════════════════════════════════════════════════════════════╗
║           VERIFY CERTIFICATE — RINGKASAN TEST                ║
╚══════════════════════════════════════════════════════════════╝

📊 Custom Metrics:
  verify_duration_ms   p90=${fmt(m.verify_duration_ms?.values?.["p(90)"])}ms   p95=${fmt(m.verify_duration_ms?.values?.["p(95)"])}ms
  verify_success_rate  rate=${fmt((m.verify_success_rate?.values?.rate || 0) * 100)}%

📋 Counters:
  verify_not_found_total      = ${m.verify_not_found_total?.values?.count || 0}
  verify_invalid_input_total  = ${m.verify_invalid_input_total?.values?.count || 0}
  verify_blockchain_fail_total= ${m.verify_blockchain_fail_total?.values?.count || 0}
  verify_server_error_total   = ${m.verify_server_error_total?.values?.count || 0}

🌐 HTTP:
  http_req_duration   p95=${fmt(m.http_req_duration?.values?.["p(95)"])}ms
  http_req_failed     rate=${fmt((m.http_req_failed?.values?.rate || 0) * 100)}%
  http_reqs           total=${m.http_reqs?.values?.count || 0}

📝 Catatan perubahan status code:
  - Sertifikat tidak ditemukan  : 400 → 200 (success: false)
  - Sertifikat tidak valid       : 400 → 200 (success: false)
  - Blockchain error             : 502       (tidak berubah)
`;
}
