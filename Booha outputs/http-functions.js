import { ok } from "wix-http-functions";
import { generateStudentToken, verifyStudentToken, logoutStudentToken } from "backend/tokenGate";
import {
  loadStudentSaves,
  verifyAndLoadStudentSession,
  saveStudentBlob,
  resolveStudentBlob,
  archiveStudentRecovery,
  verifyTeacherPin
} from "backend/studentSaves";

const CORS = {
  "Content-Type":                "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*"
};

// Cross-origin POSTs with a JSON content-type trigger a preflight. The game
// is served from GitHub Pages, so every sync request needs one. No credentials
// are used (the token travels in the body), so "*" origin is correct.
const CORS_PREFLIGHT = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age":       "86400"
};

function jsonOk(body) {
  return ok({ headers: CORS, body });
}

// ── Test ─────────────────────────────────────────────────

export function get_ping(request) {
  return jsonOk({ pong: true });
}

// ── Recovery archive ─────────────────────────────────────

export function options_studentSaveRecoveryArchive(request) {
  return ok({ headers: CORS_PREFLIGHT, body: "" });
}

/**
 * POST /_functions/studentSaveRecoveryArchive
 * Archives displaced device progress before the cloud copy is installed.
 */
export async function post_studentSaveRecoveryArchive(request) {
  try {
    const body = await request.body.json();
    const result = await archiveStudentRecovery(body);
    return jsonOk(result);
  } catch (err) {
    console.error("post_studentSaveRecoveryArchive ERROR:", err);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

// ── Auth ─────────────────────────────────────────────────

/**
 * POST /_functions/login
 * Body: { firstName, lastName, pin }
 */
export async function post_login(request) {
  try {
    const body = await request.body.json();
    const result = await generateStudentToken(body);
    return jsonOk(result);
  } catch (err) {
    console.error("post_login ERROR:", err);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

/**
 * GET /_functions/verifyToken?token=xxxx
 * LEGACY: kept only as the frontend's fallback while the POST route below is
 * confirmed in production. Remove once token.js drops LEGACY_GET_FALLBACK.
 */
export async function get_verifyToken(request) {
  try {
    const token = String(request?.query?.token || "");
    const result = await verifyStudentToken(token);
    return jsonOk(result);
  } catch (error) {
    console.error("get_verifyToken ERROR:", error);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

export function options_verifyToken(request) {
  return ok({ headers: CORS_PREFLIGHT, body: "" });
}

/**
 * POST /_functions/verifyToken
 * Body: { token }
 * Called by token.js on every protected page load. The token travels in the
 * body so it never appears in a URL or request log.
 */
export async function post_verifyToken(request) {
  try {
    const body = await request.body.json();
    const token = String(body?.token || "");
    const result = await verifyStudentToken(token);
    return jsonOk(result);
  } catch (error) {
    console.error("post_verifyToken ERROR:", error);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

export function options_verifyAndLoad(request) {
  return ok({ headers: CORS_PREFLIGHT, body: "" });
}

/**
 * POST /_functions/verifyAndLoad
 * Body: { token }
 * Verifies the live student and restores both save blobs in one request.
 */
export async function post_verifyAndLoad(request) {
  try {
    const body = await request.body.json();
    const result = await verifyAndLoadStudentSession(body && body.token);
    return jsonOk(result);
  } catch (error) {
    console.error("post_verifyAndLoad ERROR:", error);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

/**
 * POST /_functions/logout
 * Body: { token }
 */
export async function post_logout(request) {
  try {
    const body = await request.body.json();
    const result = await logoutStudentToken(body.token);
    return jsonOk(result);
  } catch (err) {
    console.error("post_logout ERROR:", err);
    return jsonOk({ ok: false });
  }
}

// ── Student save sync ────────────────────────────────────

export function options_studentSavesLoad(request) {
  return ok({ headers: CORS_PREFLIGHT, body: "" });
}

/**
 * POST /_functions/studentSavesLoad
 * Body: { token }
 */
export async function post_studentSavesLoad(request) {
  try {
    const body = await request.body.json();
    const result = await loadStudentSaves(body.token);
    return jsonOk(result);
  } catch (err) {
    console.error("post_studentSavesLoad ERROR:", err);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

export function options_studentSavesPush(request) {
  return ok({ headers: CORS_PREFLIGHT, body: "" });
}

/**
 * POST /_functions/studentSavesPush
 * Body: { token, blob, baseRevision, data }
 */
export async function post_studentSavesPush(request) {
  try {
    const body = await request.body.json();
    const result = await saveStudentBlob(body);
    return jsonOk(result);
  } catch (err) {
    console.error("post_studentSavesPush ERROR:", err);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

// ── Teacher-authorized conflict resolution ───────────────
//
// Deliberately a separate endpoint rather than a force flag on the push
// path: a flag on normal saves would eventually be set by accident.

export function options_studentSavesResolve(request) {
  return ok({ headers: CORS_PREFLIGHT, body: "" });
}

/**
 * POST /_functions/studentSavesResolve
 *
 * Body:
 * {
 *   token,
 *   blob,                    // "adventure" | "juku"
 *   choice,                  // "local" | "cloud"
 *   teacherPin,
 *   expectedRemoteRevision,  // the revision shown on the panel
 *   deviceId,
 *   data                     // "local" choice only
 * }
 */
export async function post_studentSavesResolve(request) {
  try {
    const body = await request.body.json();
    const result = await resolveStudentBlob(body);
    return jsonOk(result);
  } catch (error) {
    console.error("post_studentSavesResolve ERROR:", error);
    return jsonOk({ ok: false, reason: "SERVER_ERROR" });
  }
}

// ── Teacher authorization for Juku reports ──────────────

export function options_teacherPinVerify(request) {
  return ok({ headers: CORS_PREFLIGHT, body: "" });
}

/**
 * POST /_functions/teacherPinVerify
 *
 * Body:
 * {
 *   token,
 *   teacherPin,
 *   purpose: "juku-report-review"
 * }
 */
export async function post_teacherPinVerify(request) {
  try {
    const body = await request.body.json();
    const result = await verifyTeacherPin(body);
    return jsonOk(result);
  } catch (error) {
    console.error("post_teacherPinVerify ERROR:", error);
    return jsonOk({
      ok: false,
      reason: "SERVER_ERROR"
    });
  }
}
