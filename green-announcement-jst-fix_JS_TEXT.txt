(() => {
  "use strict";

  /*
   * DPRO GREEN announcement JST compatibility shim.
   *
   * R19以降、公開日時のJST変換・保存・再編集・表示は green12.js 本体へ統合済み。
   * 旧R18は編集クリック後にAPI値を #announcement-from / #announcement-until へ
   * 再代入していたため、R26の表示用テキスト欄と競合していた。
   *
   * config.js からの旧ローダー互換のため、このファイル自体は残すが、
   * APIラップ・日時再取得・入力欄上書きは一切行わない。
   */
  const VERSION = "GREEN-ANNOUNCEMENT-JST-FIX-R1.2-COMPAT-20260916";

  if (!/\/owner\.html$/.test(location.pathname)) return;

  window.__GREEN_ANNOUNCEMENT_JST_LEGACY_DISABLED__ = true;

  console.info(`[DPRO GREEN] ${VERSION} active; JST handling is provided by green12.js`);
})();
