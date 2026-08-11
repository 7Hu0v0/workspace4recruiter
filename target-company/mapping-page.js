/**
 * 目标公司模块 - 业务 Mapping 页面（第二层）
 * 展示某业务下的公司树表，支持展开/折叠、新增、复用、编辑、移除。
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function render(main, businessId, ctx) {
    var business = TCStore.getBusiness(businessId);
    if (!business) {
      main.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">业务不存在</div></div>';
      return;
    }

    // 展开状态：首次进入用默认策略
    var expandedSet = TCStore.getExpandedSet(businessId);
    var tree = TCTree.getBusinessCompanyTree(businessId);
    if (expandedSet === null) {
      expandedSet = TCTree.defaultExpandedSet(tree);
      TCStore.saveExpandedSet(businessId, expandedSet);
    }

    // 继承状态
    var isInheriting = !!business.inheritFrom;
    var sourceBiz = isInheriting ? TCStore.getBusiness(business.inheritFrom) : null;
    var sourceName = sourceBiz ? sourceBiz.name : '（源业务已删除）';

    main.innerHTML =
      '<div class="page-header">' +
        '<div class="breadcrumb">' +
          '<span>OKR 系统</span><span>›</span>' +
          '<span>开源方向</span><span>›</span>' +
          '<span class="crumb-link" id="tc-back-list">目标公司</span><span>›</span>' +
          '<span class="crumb-current">' + esc(business.name) + '</span>' +
        '</div>' +
        '<div class="tc-mapping-title-row">' +
          '<h2>' + esc(business.emoji || '🎯') + ' ' + esc(business.name) + ' · 公司 Mapping</h2>' +
          '<div class="tc-toolbar">' +
            '<button class="tc-btn" id="tc-expand-all" type="button">⊕ 全部展开</button>' +
            '<button class="tc-btn" id="tc-collapse-all" type="button">⊖ 全部折叠</button>' +
            '<button class="tc-btn" id="tc-inherit" type="button">' + (isInheriting ? '🔗 解除继承' : '🔀 设置继承') + '</button>' +
            (isInheriting ? '' : '<button class="tc-btn" id="tc-new-company" type="button">➕ 新增公司</button>') +
            (isInheriting ? '' : '<button class="tc-btn tc-btn-primary" id="tc-reuse-company" type="button">📥 复用公司</button>') +
          '</div>' +
        '</div>' +
      '</div>' +
      (isInheriting
        ? '<div class="tc-inherit-banner">' +
            '🔗 当前业务处于<strong>继承模式</strong>，进度数据自动跟随 <strong>' + esc(sourceName) + '</strong>。<br>' +
            '在源业务中修改进度，这里会实时同步。本页面进度条为只读。' +
          '</div>'
        : '') +
      '<div id="tc-tree-container"></div>';

    var container = main.querySelector('#tc-tree-container');

    function refresh() {
      tree = TCTree.getBusinessCompanyTree(businessId);
      console.log('[tc-mapping] refresh businessId=', businessId,
        'inheritFrom=', business.inheritFrom,
        'tree.length=', tree.length,
        'targets=', TCStore.getBusinessTargets(businessId));
      TCTreeTable.render(container, {
        businessId: businessId,
        tree: tree,
        expandedSet: expandedSet,
        readOnly: isInheriting,    // 继承模式 → 全部只读
        onToggle: function (nodeKey) {
          expandedSet = TCTree.toggleNodeExpanded(businessId, expandedSet, nodeKey);
          refresh();
        },
        onDataChange: refresh
      });
    }

    refresh();

    // 返回业务列表
    main.querySelector('#tc-back-list').addEventListener('click', function () {
      ctx.selectPeriod('target-company', '目标公司');
    });

    // 全部展开
    main.querySelector('#tc-expand-all').addEventListener('click', function () {
      var all = new Set();
      (function walk(nodes) {
        nodes.forEach(function (n) {
          if (n.children.length > 0) all.add(n.nodeKey);
          walk(n.children);
        });
      })(tree);
      expandedSet = all;
      TCStore.saveExpandedSet(businessId, expandedSet);
      refresh();
    });

    // 全部折叠
    main.querySelector('#tc-collapse-all').addEventListener('click', function () {
      expandedSet = new Set();
      TCStore.saveExpandedSet(businessId, expandedSet);
      refresh();
    });

    // 继承设置 / 解除继承
    main.querySelector('#tc-inherit').addEventListener('click', function () {
      if (isInheriting) {
        // 解除继承
        if (!confirm('解除继承？\n\n解除后本业务将拥有独立的进度数据（当前仍跟随 ' + sourceName + '）。\n注意：解除瞬间本业务会显示为空（无任何公司关联），需要重新复用公司。')) return;
        TCStore.updateBusiness(businessId, { inheritFrom: null });
        ctx.showToast('已解除继承');
        render(main, businessId, ctx); // 重新渲染整页
        return;
      }
      // 设置继承：弹出选择源业务的简单弹窗
      openInheritPicker(businessId, function (sourceId) {
        if (!sourceId) return;
        TCStore.updateBusiness(businessId, { inheritFrom: sourceId });
        ctx.showToast('已设置继承');
        render(main, businessId, ctx);
      });
    });

    // 新增公司（仅非继承模式）
    var newCoBtn = main.querySelector('#tc-new-company');
    if (newCoBtn) newCoBtn.addEventListener('click', function () {
      TCEditors.openCompanyEditor({
        mode: 'create',
        onDone: function (company) {
          if (!company) return;
          TCStore.addTargetsToBusiness(businessId, [{
            companyId: company.id,
            organizationId: null
          }]);
          refresh();
        }
      });
    });

    // 复用公司（仅非继承模式）
    var reuseBtn = main.querySelector('#tc-reuse-company');
    if (reuseBtn) reuseBtn.addEventListener('click', function () {
      TCReuseModal.open({
        businessId: businessId,
        onDone: function (result) {
          if (result && result.created > 0) {
            ctx.showToast('已复用 ' + result.created + ' 项' + (result.skipped > 0 ? '，跳过重复 ' + result.skipped + ' 项' : ''));
          } else if (result && result.skipped > 0) {
            ctx.showToast('全部 ' + result.skipped + ' 项均已关联，未重复创建');
          }
          refresh();
        }
      });
    });

    /** 继承源选择器（简单下拉弹窗） */
    function openInheritPicker(currentBizId, onPick) {
      var others = TCStore.getBusinesses().filter(function (b) { return b.id !== currentBizId; });
      if (others.length === 0) { alert('暂无其他业务可继承'); return; }
      var existing = document.getElementById('tc-inherit-picker-backdrop');
      if (existing) existing.remove();
      var backdrop = document.createElement('div');
      backdrop.id = 'tc-inherit-picker-backdrop';
      backdrop.className = 'dm-modal-backdrop';
      var optionsHtml = others.map(function (b) {
        return '<label class="tc-inherit-opt">' +
          '<input type="radio" name="tc-inherit-src" value="' + esc(b.id) + '">' +
          '<span class="tc-inherit-opt-icon">' + esc(b.emoji || '🎯') + '</span>' +
          '<span class="tc-inherit-opt-name">' + esc(b.name) + '</span>' +
          (b.inheritFrom ? '<span class="tc-inherit-opt-tag">继承中</span>' : '') +
        '</label>';
      }).join('');
      backdrop.innerHTML =
        '<div class="dm-modal tc-inherit-picker">' +
          '<div class="dm-modal-header"><h3>🔀 选择继承源业务</h3><button class="dm-modal-close" id="tc-ip-x">✕</button></div>' +
          '<div class="dm-modal-body">' +
            '<div class="tc-inherit-tip">本业务的进度数据将自动跟随所选源业务。<br>源业务修改进度时，本业务实时同步；本业务进度条变为只读。</div>' +
            '<div class="tc-inherit-list">' + optionsHtml + '</div>' +
          '</div>' +
          '<div class="dm-modal-footer">' +
            '<button class="dm-btn" id="tc-ip-cancel">取消</button>' +
            '<button class="dm-btn dm-btn-primary" id="tc-ip-ok">确认继承</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(backdrop);
      requestAnimationFrame(function () { backdrop.classList.add('show'); });
      function close() { backdrop.classList.remove('show'); setTimeout(function () { backdrop.remove(); }, 200); }
      backdrop.querySelector('#tc-ip-x').addEventListener('click', close);
      backdrop.querySelector('#tc-ip-cancel').addEventListener('click', close);
      backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
      backdrop.querySelector('#tc-ip-ok').addEventListener('click', function () {
        var checked = backdrop.querySelector('input[name="tc-inherit-src"]:checked');
        close();
        onPick(checked ? checked.value : null);
      });
    }
  }

  global.TCMappingPage = { render: render };
})(window);
