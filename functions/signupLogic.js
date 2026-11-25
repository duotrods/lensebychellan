// Pure sign-up rules (no firebase imports) so Vitest can test them. Used by signup.js.
// role -> which code collection proves the right to it, and what the code carries.
const SIGNUP_ROLES = {
  client: { collection: "clientOTPs", scheme: true },
  staff: { collection: "staffInviteCodes", multiUse: true },
  liveoperator: { collection: "staffInviteCodes", multiUse: true },
  cctvfaultoperator: { collection: "cctvOperatorOTPs", scheme: true },
  thirdpartystaff: { collection: "thirdPartyOperatorCodes", company: true },
  thirdpartyclient: { collection: "thirdPartyClientCodes", scheme: true },
  thirdpartyliveoperator: { collection: "thirdPartyLiveOperatorCodes", company: true },
  thirdpartycctvoperator: { collection: "thirdPartyCCTVOperatorCodes", scheme: true },
};

const toDate = (v) => (v && v.toDate ? v.toDate() : v ? new Date(v) : null);

// Returns null when the code can be used, else a short reason. Pure, so it is unit-tested.
function codeProblem(codeData, kind, now = new Date()) {
  if (!codeData) return "Invalid access code";
  if (kind.multiUse ? !(codeData.usesRemaining > 0) : codeData.isUsed) return "This code has already been used";
  const expiresAt = toDate(codeData.expiresAt);
  if (expiresAt && expiresAt < now) return "This code has expired";
  return null;
}

// What changes on the code doc when `uid` uses it.
function codeUpdate(codeData, kind, uid, now) {
  if (!kind.multiUse) return { isUsed: true, usedBy: uid, usedAt: now };
  const usesRemaining = codeData.usesRemaining - 1;
  return {
    usesRemaining,
    isUsed: usesRemaining <= 0,
    usedBy: [...(codeData.usedBy || []), uid],
    lastUsedAt: now,
  };
}

// The user doc. Only displayName/company/phone come from the browser; role and
// scheme come from the code, email from the verified token.
function buildUserDoc({ uid, email, role, input, codeData, kind, now }) {
  const str = (v) => (typeof v === "string" ? v.trim().slice(0, 200) : "");
  const doc = {
    uid,
    email,
    role,
    displayName: str(input.displayName),
    company: kind.company ? codeData.company || str(input.company) : str(input.company),
    phone: str(input.phone),
    emailVerified: false,
    metadata: { signInMethod: "email", ipAddress: null, codeUsed: codeData.code || codeData.otpCode || null },
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    isActive: true,
    canCreateAdmins: false,
  };
  if (kind.scheme) {
    doc.schemeIds = [codeData.schemeId];
    doc.schemeNames = { [codeData.schemeId]: codeData.schemeName };
    doc.activeSchemeId = codeData.schemeId;
    doc.schemeId = codeData.schemeId;
    doc.schemeName = codeData.schemeName;
  }
  return doc;
}

module.exports = { SIGNUP_ROLES, codeProblem, codeUpdate, buildUserDoc };
