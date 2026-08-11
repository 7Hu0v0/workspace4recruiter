/**
 * 目标公司模块 - 业务卡片列表（第一层）
 * 展示所有业务为大卡片，点击进入 Mapping 页面。
 * 业务来自 TCStore.getBusinesses()，新增业务只需调用 TCStore.createBusiness()。
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * 统计某业务的概况（公司数 / 组织关联数 / 平均进度）。
   */
  function businessStats(businessId) {
    var targets = TCStore.getBusinessTargets(businessId);
    var companyIds = {};
    targets.forEach(function (t) { companyIds[t.companyId] = true; });
    var companyCount = Object.keys(companyIds).length;
    var progressList = targets.map(function (t) { return t.progress; }).filter(function (p) { return p != null; });
    var avg = null;
    if (progressList.length > 0) {
      var sum = progressList.reduce(function (a, b) { return a + b; }, 0);
      avg = Math.round(sum / progressList.length / 10) * 10;
    }
    return {
      companyCount: companyCount,
      targetCount: targets.length,
      avgProgress: avg
    };
  }

  function render(main, ctx) {
    var businesses = TCStore.getBusinesses();
    main.innerHTML =
      '<div class="page-header">' +
        '<div class="breadcrumb">' +
          '<span>OKR 系统</span><span>›</span>' +
          '<span>开源方向</span><span>›</span>' +
          '<span class="crumb-current">目标公司</span>' +
        '</div>' +
        '<div class="tc-mapping-title-row">' +
          '<h2>🎯 目标公司 · 业务列表</h2>' +
          '<div class="tc-toolbar">' +
            '<button class="tc-btn" id="tc-add-business" type="button">➕ 新增业务</button>' +
          '</div>' +
        '</div>' +
        '<p class="tc-page-desc">按业务维度管理目标公司 Mapping。公司/组织为共享数据，梯队与进度按业务独立维护。</p>' +
      '</div>' +
      '<div class="tc-biz-grid" id="tc-biz-grid"></div>';

    var grid = main.querySelector('#tc-biz-grid');
    if (businesses.length === 0) {
      grid.innerHTML = '<div class="empty-periods" style="padding:48px 0;grid-column:1/-1;">暂无业务，点击右上角「新增业务」创建</div>';
    } else {
      businesses.forEach(function (b) {
        var stats = businessStats(b.id);
        var inheritTag = '';
        if (b.inheritFrom) {
          var src = TCStore.getBusiness(b.inheritFrom);
          inheritTag = '<div class="tc-biz-inherit-tag" title="本业务进度自动跟随 ' + esc(src ? src.name : '已删除') + '">' +
            '🔗 继承自 <b>' + esc(src ? src.name : '已删除') + '</b>' +
          '</div>';
        }
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'tc-biz-card' + (b.inheritFrom ? ' tc-biz-card-inherited' : '');
        card.innerHTML =
          '<div class="tc-biz-emoji">' + esc(b.emoji || '🎯') + '</div>' +
          '<div class="tc-biz-name">' + esc(b.name) + '</div>' +
          inheritTag +
          '<div class="tc-biz-stats">' +
            '<span class="tc-biz-stat"><b>' + stats.companyCount + '</b> 公司</span>' +
            '<span class="tc-biz-stat-divider">·</span>' +
            '<span class="tc-biz-stat"><b>' + stats.targetCount + '</b> 关联</span>' +
            (stats.avgProgress != null
              ? '<span class="tc-biz-stat-divider">·</span><span class="tc-biz-stat">均进度 <b>' + stats.avgProgress + '%</b></span>'
              : '') +
          '</div>' +
          '<div class="tc-biz-enter">进入 Mapping →</div>';
        card.addEventListener('click', function () {
          ctx.selectPeriod('target-company-mapping', b.name, null, b.id);
        });
        grid.appendChild(card);
      });
    }

    main.querySelector('#tc-add-business').addEventListener('click', function () {
      var name = prompt('新业务名称：', '');
      if (!name || !name.trim()) return;
      var emoji = prompt('新业务图标（emoji，可留空）：', '🎯') || '🎯';
      var b = TCStore.createBusiness({ name: name.trim(), emoji: emoji.trim() });
      if (b) {
        ctx.showToast('已创建业务：' + b.name);
        render(main, ctx);
      } else {
        alert('创建失败：名称不能为空');
      }
    });
  }

  global.TCBusinessList = { render: render };
})(window);
