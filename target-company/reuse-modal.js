/**
 * 目标组织模块 - 复用组织弹窗
 * 列出组织库所有组织+组织树，让用户勾选要复用到当前业务的节点。
 * 已关联的节点会被禁用（不可勾选）。
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * 打开复用弹窗。
   * @param {object} opts
   *   - businessId: 目标业务
   *   - onDone: function({created, skipped})
   */
  function open(opts) {
    var businessId = opts.businessId;
    var onDone = opts.onDone || function () {};

    var companies = TCStore.getCompanies();
    var existingTargets = TCStore.getBusinessTargets(businessId);

    // 已关联集合：companyId|orgId 形式（orgId 为空表示组织本身）
    var existingSet = new Set();
    existingTargets.forEach(function (t) {
      existingSet.add(t.companyId + '|' + (t.organizationId || ''));
    });

    var existing = document.getElementById('tc-reuse-backdrop');
    if (existing) existing.remove();
    var backdrop = document.createElement('div');
    backdrop.id = 'tc-reuse-backdrop';
    backdrop.className = 'dm-modal-backdrop';

    // 渲染组织+组织树（含 checkbox）
    function renderCompanyHtml(company) {
      var orgTree = TCTree.buildOrganizationTree(company.id);

      function orgHtml(org, depth) {
        var key = company.id + '|' + org.id;
        var already = existingSet.has(key);
        var children = org.children.map(function (c) { return orgHtml(c, depth + 1); }).join('');
        var indent = depth * 18;
        return (
          '<div class="tc-reuse-org" style="padding-left:' + indent + 'px">' +
            '<label class="tc-reuse-label' + (already ? ' disabled' : '') + '">' +
              '<input type="checkbox" class="tc-reuse-check" data-company-id="' + esc(company.id) + '" data-org-id="' + esc(org.id) + '"' + (already ? ' disabled' : '') + '>' +
              '<span class="tc-reuse-name">' + esc(org.name) + '</span>' +
              (already ? '<span class="tc-reuse-tag">已关联</span>' : '') +
            '</label>' +
          '</div>' +
          children
        );
      }

      var companyKey = company.id + '|';
      var companyAlready = existingSet.has(companyKey);
      return (
        '<div class="tc-reuse-company" data-company="' + esc(company.id) + '">' +
          '<label class="tc-reuse-label tc-reuse-company-label' + (companyAlready ? ' disabled' : '') + '">' +
            '<input type="checkbox" class="tc-reuse-check tc-reuse-company-check" data-company-id="' + esc(company.id) + '" data-org-id=""' + (companyAlready ? ' disabled' : '') + '>' +
            '<span class="tc-reuse-name">🏢 ' + esc(company.name) + '</span>' +
            (companyAlready ? '<span class="tc-reuse-tag">已关联</span>' : '') +
          '</label>' +
          '<div class="tc-reuse-children">' +
            orgTree.map(function (o) { return orgHtml(o, 1); }).join('') +
          '</div>' +
        '</div>'
      );
    }

    var html = companies.length === 0
      ? '<div class="empty-periods" style="padding:32px 0;">组织库为空，请先新增组织</div>'
      : companies.map(renderCompanyHtml).join('');

    backdrop.innerHTML =
      '<div class="dm-modal tc-reuse-modal">' +
        '<div class="dm-modal-header">' +
          '<h3>📥 复用组织到当前业务</h3>' +
          '<button class="dm-modal-close" id="tc-reuse-x" type="button">✕</button>' +
        '</div>' +
        '<div class="dm-modal-body tc-reuse-body">' +
          '<div class="tc-reuse-tip">勾选要复用的组织或组织节点。已关联的节点已禁用。<br>勾选组织 = 关联组织本身；勾选组织 = 关联具体组织（父级不会自动加入）。</div>' +
          '<div class="tc-reuse-list">' + html + '</div>' +
        '</div>' +
        '<div class="dm-modal-footer">' +
          '<span class="tc-reuse-selected-count" id="tc-reuse-count">已选 0 项</span>' +
          '<button class="dm-btn" id="tc-reuse-cancel" type="button">取消</button>' +
          '<button class="dm-btn dm-btn-primary" id="tc-reuse-ok" type="button">确认复用</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('show'); });

    function close() {
      backdrop.classList.remove('show');
      setTimeout(function () { backdrop.remove(); }, 200);
    }

    function updateCount() {
      var n = backdrop.querySelectorAll('.tc-reuse-check:checked:not(:disabled)').length;
      backdrop.querySelector('#tc-reuse-count').textContent = '已选 ' + n + ' 项';
    }

    backdrop.addEventListener('change', function (e) {
      if (e.target.classList.contains('tc-reuse-check')) updateCount();
    });

    backdrop.querySelector('#tc-reuse-x').addEventListener('click', close);
    backdrop.querySelector('#tc-reuse-cancel').addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });

    backdrop.querySelector('#tc-reuse-ok').addEventListener('click', function () {
      var items = [];
      backdrop.querySelectorAll('.tc-reuse-check:checked:not(:disabled)').forEach(function (cb) {
        items.push({
          companyId: cb.dataset.companyId,
          organizationId: cb.dataset.orgId || null
        });
      });
      if (items.length === 0) { close(); return; }
      var result = TCTree.reuseOrganizationsForBusiness(businessId, items);
      close();
      onDone(result);
    });

    updateCount();
  }

  global.TCReuseModal = { open: open };
})(window);
