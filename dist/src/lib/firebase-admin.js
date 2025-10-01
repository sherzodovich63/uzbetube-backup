"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAdmin = initAdmin;
exports.adminAuth = adminAuth;
// src/lib/firebase-admin.ts
var app_1 = require("firebase-admin/app");
var auth_1 = require("firebase-admin/auth");
var app = null;
/** Firebase Admin init — bir marta initialize qiladi */
function initAdmin() {
    var _a;
    if (app)
        return app;
    // .env.local ichidagi JSON (bitta qatorda) — \n larni real newline ga almashtiramiz
    var raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!raw) {
        throw new Error("MISSING_ADMIN_CREDS");
    }
    var parsed = JSON.parse(raw);
    // Ba'zi exportlarda private_key ichida `\\n` bo‘ladi — xavfsiz tomoni uchun almashtirib qo‘yamiz
    if ((_a = parsed.private_key) === null || _a === void 0 ? void 0 : _a.includes("\\n")) {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    app = (0, app_1.initializeApp)({ credential: (0, app_1.cert)(parsed) });
    return app;
}
/** Kerak bo‘lsa admin auth’ni qaytaruvchi helper */
function adminAuth() {
    initAdmin();
    return (0, auth_1.getAuth)();
}
