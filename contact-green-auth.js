/**
 * DPRO GREEN RENTAL auth adapter for DPRO CONTACT.
 * Reuses the existing GREEN admin session token.
 */
(() => {
  "use strict";

  const TOKEN_KEY = "green_admin_session_token";

  function token() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  async function sessionInfo() {
    const accessToken = token();
    if (!accessToken) return null;

    const apiBase = String(window.GREEN_CONFIG?.API_BASE || "").replace(/\/$/, "");
    if (!apiBase) return null;

    const response = await fetch(`${apiBase}/api/admin/session`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${accessToken}`,
        accept: "application/json"
      },
      credentials: "include",
      cache: "no-store"
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok === false) return null;
    return payload?.data || payload || null;
  }

  window.DPRO_CONTACT_AUTH = Object.freeze({
    async getAccessToken() {
      return token();
    },

    async getOperator() {
      const session = await sessionInfo().catch(() => null);
      const facilityCode = String(session?.facilityCode || "dpro_green_rental_demo");
      const facilityName = String(session?.facilityName || "DPRO グリーンレンタル");

      return {
        id: `${facilityCode}:admin`,
        displayName: facilityName,
        role: "owner_admin",
        roleLabel: "管理者",
        readOnly: false
      };
    }
  });
})();
