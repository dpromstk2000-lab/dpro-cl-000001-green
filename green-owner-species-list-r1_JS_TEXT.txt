(() => {
  "use strict";

  const VERSION = "GREEN-OWNER-ATLAS-SPECIES-MODELS-R1.1-20261003";
  if (document.documentElement.dataset.greenOwnerAtlasMaster === VERSION) return;
  document.documentElement.dataset.greenOwnerAtlasMaster = VERSION;

  const PAGE_SIZE = 25;
  let speciesPage = 1;
  let modelPage = 1;
  let speciesByCode = new Map();
  let modelByCode = new Map();
  let observerTimer = null;
  let applying = false;

  const PILOT_IMAGES = Object.freeze({
    species: Object.freeze({
      "SP-PACHIRA-001": "atlas-plant-pachira.png",
      "SP-GP-0066": "atlas-plant-monstera.png",
      "SP-GP-0067": "atlas-plant-yucca.png",
      "SP-GP-0034": "atlas-plant-sansevieria.png",
      "SP-GP-0059": "atlas-plant-pothos.png",
      "SP-GP-0056": "atlas-plant-benjamina.png",
      "SP-GP-0011": "atlas-plant-umbellata.png",
      "SP-GP-0017": "atlas-plant-augusta.png",
      "SP-GP-0008": "atlas-plant-areca.png",
      "SP-GP-0016": "atlas-plant-olive.png"
    }),
    models: Object.freeze({
      "CM-GP-0002": "atlas-pot-special-cement.png",
      "CM-GP-0005": "atlas-pot-round-ceramic.png",
      "CM-GP-0011": "atlas-pot-seagrass-basket.png",
      "CM-GP-0019": "atlas-pot-kozimi.png",
      "CM-GP-0022": "atlas-pot-traas.png"
    })
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function assetsView() { return $('[data-view-panel="assets"]'); }
  function speciesWrap() { return $('[data-asset-table="species"]'); }
  function modelsWrap() { return $('[data-asset-table="models"]'); }
  function speciesRows() { return $('#species-rows'); }
  function modelRows() { return $('#container-model-rows'); }
  function activeSpeciesTab() { return $('[data-asset-tab="species"]')?.classList.contains('is-active'); }
  function activeModelsTab() { return $('[data-asset-tab="models"]')?.classList.contains('is-active'); }
  function sharedToolbar() {
    const view = assetsView();
    return view ? Array.from(view.children).find((el) => el.classList?.contains('owner-toolbar')) : null;
  }

  function escHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ensureStyle() {
    if ($('#green-owner-atlas-master-style')) return;
    const style = document.createElement('style');
    style.id = 'green-owner-atlas-master-style';
    style.textContent = [
      '.green-master-tools{display:grid;grid-template-columns:minmax(220px,1.7fr) minmax(150px,.8fr) minmax(150px,.8fr) auto;gap:10px;align-items:end;margin:0 0 12px}',
      '.green-master-tools label{display:grid;gap:5px;font-weight:700;color:#315445}',
      '.green-master-tools input,.green-master-tools select{min-height:42px;border:1px solid #cfded5;border-radius:10px;background:#fff;padding:8px 10px;font:inherit;color:#173d2b}',
      '.green-master-pager{display:flex;align-items:center;justify-content:center;gap:10px;padding:14px 0 2px}',
      '.green-master-count{min-width:205px;text-align:center;font-weight:700;color:#315445}',
      '.green-master-page-status{font-weight:700;color:#173d2b}',
      '.green-master-hidden{display:none!important}',
      '.green-atlas-shared-hidden{display:none!important}',
      '.green-atlas-name{display:flex;align-items:center;gap:10px;min-width:210px}',
      '.green-atlas-thumb{width:58px;height:58px;flex:0 0 58px;border-radius:12px;border:1px solid #dbe7df;background:#f7faf8;object-fit:cover;box-shadow:0 2px 8px rgba(17,66,45,.07)}',
      '.green-atlas-placeholder{width:58px;height:58px;flex:0 0 58px;border-radius:12px;border:1px dashed #c7d8ce;background:#f4f8f5;display:grid;place-items:center;color:#668675;font-size:22px}',
      '.green-atlas-name-text{display:grid;gap:3px}',
      '.green-atlas-name-text strong{font-weight:800;color:#173d2b;line-height:1.35}',
      '.green-atlas-name-text small{font-size:11px;color:#668675;font-weight:700}',
      '.green-atlas-pilot-badge{display:inline-flex;align-items:center;width:max-content;border-radius:999px;padding:2px 7px;background:#eef7f1;color:#236746;font-size:10px;font-weight:800}',
      '[data-asset-table="species"] td:nth-child(2),[data-asset-table="models"] td:nth-child(2){min-width:230px}',
      '@media(max-width:820px){.green-master-tools{grid-template-columns:1fr 1fr}.green-master-tools .green-master-search{grid-column:1/-1}.green-master-tools button{width:100%}.green-master-count{min-width:0}.green-master-pager{flex-wrap:wrap}.green-atlas-thumb,.green-atlas-placeholder{width:50px;height:50px;flex-basis:50px}}'
    ].join('');
    document.head.append(style);
  }

  function ensureSpeciesUi() {
    const wrap = speciesWrap();
    if (!wrap) return null;
    let tools = $('#green-species-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.id = 'green-species-tools';
      tools.className = 'green-master-tools';
      tools.innerHTML =
        '<label class="green-master-search">検索<input id="green-species-search" placeholder="品種コード・植物名・分類"></label>' +
        '<label>分類<select id="green-species-category"><option value="">すべて</option></select></label>' +
        '<label>屋内外<select id="green-species-indoor"><option value="">すべて</option><option value="indoor">屋内</option><option value="outdoor">屋外</option><option value="both">両方</option></select></label>' +
        '<button type="button" class="btn btn--secondary" id="green-species-clear">条件をクリア</button>';
      wrap.parentNode.insertBefore(tools, wrap);
    } else {
      tools.classList.add('green-master-tools');
    }

    let pager = $('#green-species-pager');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'green-species-pager';
      pager.className = 'green-master-pager';
      pager.innerHTML =
        '<button type="button" class="btn btn--secondary btn--small" id="green-species-prev">← 前へ</button>' +
        '<span class="green-master-count" id="green-species-count">全0件</span>' +
        '<span class="green-master-page-status" id="green-species-page-status">1 / 1ページ</span>' +
        '<button type="button" class="btn btn--secondary btn--small" id="green-species-next">次へ →</button>';
      wrap.insertAdjacentElement('afterend', pager);
    } else {
      pager.classList.add('green-master-pager');
    }

    const headers = wrap.querySelectorAll('thead th');
    if (headers[1]) headers[1].textContent = '写真・植物名';
    if (headers[4]) headers[4].textContent = '対応サイズ';
    return { tools, pager };
  }

  function ensureModelsUi() {
    const wrap = modelsWrap();
    if (!wrap) return null;
    let tools = $('#green-model-tools');
    if (!tools) {
      tools = document.createElement('div');
      tools.id = 'green-model-tools';
      tools.className = 'green-master-tools';
      tools.innerHTML =
        '<label class="green-master-search">検索<input id="green-model-search" placeholder="モデルコード・モデル名・素材"></label>' +
        '<label>種別<select id="green-model-type"><option value="">すべて</option><option value="pot">鉢</option><option value="cover">鉢カバー</option><option value="planter">プランター</option><option value="stand">スタンド</option><option value="other">その他</option></select></label>' +
        '<label>本社区分<select id="green-model-source"><option value="">すべて</option><option value="standard">通常カタログ</option><option value="original">オリジナル商品</option></select></label>' +
        '<button type="button" class="btn btn--secondary" id="green-model-clear">条件をクリア</button>';
      wrap.parentNode.insertBefore(tools, wrap);
    }

    let pager = $('#green-model-pager');
    if (!pager) {
      pager = document.createElement('div');
      pager.id = 'green-model-pager';
      pager.className = 'green-master-pager';
      pager.innerHTML =
        '<button type="button" class="btn btn--secondary btn--small" id="green-model-prev">← 前へ</button>' +
        '<span class="green-master-count" id="green-model-count">全0件</span>' +
        '<span class="green-master-page-status" id="green-model-page-status">1 / 1ページ</span>' +
        '<button type="button" class="btn btn--secondary btn--small" id="green-model-next">次へ →</button>';
      wrap.insertAdjacentElement('afterend', pager);
    }

    const headers = wrap.querySelectorAll('thead th');
    if (headers[1]) headers[1].textContent = '写真・モデル名';
    return { tools, pager };
  }

  function imageFor(item, kind) {
    const metadataUrl = item?.metadata?.atlas_image_url;
    if (metadataUrl) return metadataUrl;
    const code = kind === 'species' ? item?.species_code : item?.model_code;
    return PILOT_IMAGES[kind]?.[code] || '';
  }

  function decorateNameCell(cell, item, kind) {
    if (!cell || !item) return;
    const code = kind === 'species' ? item.species_code : item.model_code;
    const displayName = kind === 'species' ? item.common_name : item.model_name;
    const src = imageFor(item, kind);
    const signature = `${code}|${src}`;
    if (cell.dataset.greenAtlasDecorated === signature) return;
    cell.dataset.greenAtlasDecorated = signature;
    cell.textContent = '';

    const wrap = document.createElement('div');
    wrap.className = 'green-atlas-name';
    if (src) {
      const img = document.createElement('img');
      img.className = 'green-atlas-thumb';
      img.src = src;
      img.alt = `${displayName}の代表イメージ`;
      img.loading = 'lazy';
      img.addEventListener('error', () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'green-atlas-placeholder';
        placeholder.textContent = kind === 'species' ? '🌿' : '◯';
        img.replaceWith(placeholder);
      }, { once: true });
      wrap.append(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'green-atlas-placeholder';
      placeholder.textContent = kind === 'species' ? '🌿' : '◯';
      placeholder.title = '代表画像は順次追加予定';
      wrap.append(placeholder);
    }

    const text = document.createElement('div');
    text.className = 'green-atlas-name-text';
    const strong = document.createElement('strong');
    strong.textContent = displayName || '名称未設定';
    text.append(strong);
    const small = document.createElement('small');
    if (kind === 'species') {
      small.textContent = item.category || '分類未設定';
    } else {
      const series = Array.isArray(item?.metadata?.hq_series) ? item.metadata.hq_series.join('・') : '';
      small.textContent = series || '本社マスター';
    }
    text.append(small);
    if (src && !item?.metadata?.atlas_image_url) {
      const badge = document.createElement('span');
      badge.className = 'green-atlas-pilot-badge';
      badge.textContent = '代表イメージ';
      text.append(badge);
    }
    wrap.append(text);
    cell.append(wrap);
  }

  function sizeLabel(item) {
    const sizes = Array.isArray(item?.metadata?.hq_sizes) ? item.metadata.hq_sizes.filter(Boolean) : [];
    if (sizes.length) {
      const order = { L: 1, M: 2, S: 3 };
      return Array.from(new Set(sizes)).sort((a, b) => (order[a] || 9) - (order[b] || 9)).join('・');
    }
    return item?.default_size_code || '指定なし';
  }

  function decorateSpeciesRows() {
    const tbody = speciesRows();
    if (!tbody) return;
    $$('tr', tbody).forEach((row) => {
      if (!row.cells || row.cells.length < 6) return;
      const code = (row.cells[0]?.textContent || '').trim();
      const item = speciesByCode.get(code);
      if (!item) return;
      decorateNameCell(row.cells[1], item, 'species');
      row.cells[4].textContent = sizeLabel(item);
      row.cells[4].title = item?.metadata?.hq_catalog ? '本社公開カタログ上の対応サイズ' : '登録済みサイズ';
    });
  }

  function decorateModelRows() {
    const tbody = modelRows();
    if (!tbody) return;
    $$('tr', tbody).forEach((row) => {
      if (!row.cells || row.cells.length < 6) return;
      const code = (row.cells[0]?.textContent || '').trim();
      const item = modelByCode.get(code);
      if (!item) return;
      decorateNameCell(row.cells[1], item, 'models');
    });
  }

  function populateCategories() {
    const select = $('#green-species-category');
    if (!select) return;
    const selected = select.value;
    const categories = Array.from(new Set(Array.from(speciesByCode.values()).map((item) => item.category).filter(Boolean)))
      .sort((a, b) => String(a).localeCompare(String(b), 'ja'));
    select.innerHTML = '<option value="">すべて</option>' + categories.map((v) => `<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('');
    if (categories.includes(selected)) select.value = selected;
  }

  function filteredSpeciesRows() {
    const tbody = speciesRows();
    if (!tbody) return [];
    const search = ($('#green-species-search')?.value || '').trim().toLowerCase();
    const category = $('#green-species-category')?.value || '';
    const indoor = $('#green-species-indoor')?.value || '';
    return $$('tr', tbody).filter((row) => {
      if (!row.cells || row.cells.length < 6) return false;
      const code = (row.cells[0]?.textContent || '').trim();
      const item = speciesByCode.get(code);
      if (!item) return false;
      const rowIndoor = item.indoor_outdoor || '';
      const haystack = [item.species_code, item.common_name, item.scientific_name, item.category, ...(item?.metadata?.aliases || [])]
        .filter(Boolean).join(' ').toLowerCase();
      return (!search || haystack.includes(search)) && (!category || item.category === category) && (!indoor || rowIndoor === indoor);
    });
  }

  function modelSource(item) {
    const series = Array.isArray(item?.metadata?.hq_series) ? item.metadata.hq_series : [];
    return series.includes('オリジナル商品') ? 'original' : 'standard';
  }

  function filteredModelRows() {
    const tbody = modelRows();
    if (!tbody) return [];
    const search = ($('#green-model-search')?.value || '').trim().toLowerCase();
    const type = $('#green-model-type')?.value || '';
    const source = $('#green-model-source')?.value || '';
    return $$('tr', tbody).filter((row) => {
      if (!row.cells || row.cells.length < 6) return false;
      const code = (row.cells[0]?.textContent || '').trim();
      const item = modelByCode.get(code);
      if (!item) return false;
      const haystack = [item.model_code, item.model_name, item.material, item.color_name, item?.metadata?.official_type, ...(item?.metadata?.hq_series || [])]
        .filter(Boolean).join(' ').toLowerCase();
      return (!search || haystack.includes(search)) && (!type || item.container_type === type) && (!source || modelSource(item) === source);
    });
  }

  function renderPager(rows, kind, resetPage) {
    const isSpecies = kind === 'species';
    if (resetPage) {
      if (isSpecies) speciesPage = 1; else modelPage = 1;
    }
    let page = isSpecies ? speciesPage : modelPage;
    const allRows = isSpecies ? $$('#species-rows tr') : $$('#container-model-rows tr');
    allRows.forEach((row) => row.classList.add('green-master-hidden'));
    const total = rows.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.max(1, Math.min(page, pages));
    if (isSpecies) speciesPage = page; else modelPage = page;
    const start = (page - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);
    rows.slice(start, end).forEach((row) => row.classList.remove('green-master-hidden'));

    const prefix = isSpecies ? 'green-species' : 'green-model';
    const count = $(`#${prefix}-count`);
    const status = $(`#${prefix}-page-status`);
    const prev = $(`#${prefix}-prev`);
    const next = $(`#${prefix}-next`);
    if (count) count.textContent = total ? `全${total}件／${start + 1}〜${end}件表示` : '該当0件';
    if (status) status.textContent = `${page} / ${pages}ページ`;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= pages;
  }

  function render(resetSpecies = false, resetModels = false) {
    if (applying) return;
    applying = true;
    try {
      ensureStyle();
      const speciesUi = ensureSpeciesUi();
      const modelsUi = ensureModelsUi();
      const speciesActive = activeSpeciesTab();
      const modelsActive = activeModelsTab();
      if (speciesUi) { speciesUi.tools.hidden = !speciesActive; speciesUi.pager.hidden = !speciesActive; }
      if (modelsUi) { modelsUi.tools.hidden = !modelsActive; modelsUi.pager.hidden = !modelsActive; }
      const shared = sharedToolbar();
      if (shared) shared.classList.toggle('green-atlas-shared-hidden', speciesActive || modelsActive);

      decorateSpeciesRows();
      decorateModelRows();
      if (speciesActive) renderPager(filteredSpeciesRows(), 'species', resetSpecies);
      if (modelsActive) renderPager(filteredModelRows(), 'models', resetModels);
      if (!speciesActive) $$('#species-rows tr').forEach((row) => row.classList.remove('green-master-hidden'));
      if (!modelsActive) $$('#container-model-rows tr').forEach((row) => row.classList.remove('green-master-hidden'));
    } finally {
      applying = false;
    }
  }

  async function refreshData() {
    if (!window.Green?.api) { render(); return; }
    try {
      const [speciesResult, modelResult] = await Promise.all([
        window.Green.api('/api/admin/plant-species'),
        window.Green.api('/api/admin/container-models')
      ]);
      const species = speciesResult?.data?.items || [];
      const models = modelResult?.data?.items || [];
      speciesByCode = new Map(species.map((item) => [item.species_code, item]));
      modelByCode = new Map(models.map((item) => [item.model_code, item]));
      populateCategories();
    } catch (_) {
      speciesByCode = new Map();
      modelByCode = new Map();
    }
    render();
  }

  function bindOnce() {
    if (document.documentElement.dataset.greenOwnerAtlasMasterBound === VERSION) return;
    document.documentElement.dataset.greenOwnerAtlasMasterBound = VERSION;

    document.addEventListener('click', (event) => {
      if (event.target.closest?.('[data-asset-tab]')) setTimeout(() => render(true, true), 30);
      if (event.target.closest?.('#green-species-prev')) { speciesPage -= 1; render(); }
      if (event.target.closest?.('#green-species-next')) { speciesPage += 1; render(); }
      if (event.target.closest?.('#green-model-prev')) { modelPage -= 1; render(); }
      if (event.target.closest?.('#green-model-next')) { modelPage += 1; render(); }
      if (event.target.closest?.('#green-species-clear')) {
        const search = $('#green-species-search'), category = $('#green-species-category'), indoor = $('#green-species-indoor');
        if (search) search.value = ''; if (category) category.value = ''; if (indoor) indoor.value = '';
        render(true, false);
      }
      if (event.target.closest?.('#green-model-clear')) {
        const search = $('#green-model-search'), type = $('#green-model-type'), source = $('#green-model-source');
        if (search) search.value = ''; if (type) type.value = ''; if (source) source.value = '';
        render(false, true);
      }
    });

    document.addEventListener('input', (event) => {
      if (event.target?.id === 'green-species-search') render(true, false);
      if (event.target?.id === 'green-model-search') render(false, true);
    });
    document.addEventListener('change', (event) => {
      if (['green-species-category','green-species-indoor'].includes(event.target?.id)) render(true, false);
      if (['green-model-type','green-model-source'].includes(event.target?.id)) render(false, true);
    });

    [speciesRows(), modelRows()].filter(Boolean).forEach((tbody) => {
      const observer = new MutationObserver(() => {
        clearTimeout(observerTimer);
        observerTimer = setTimeout(() => { refreshData(); }, 100);
      });
      observer.observe(tbody, { childList: true });
    });
  }

  function boot() {
    ensureStyle();
    ensureSpeciesUi();
    ensureModelsUi();
    bindOnce();
    refreshData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  } else {
    setTimeout(boot, 0);
  }
})();
