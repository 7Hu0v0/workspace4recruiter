/**
 * 目标组织模块 - 树形表格（便利贴布局）
 *
 * 每家组织渲染为一张「便利贴卡片」，卡片内部用表格展示该组织的组织树。
 * 组织间纵向排列，一排一张便利贴。
 *
 * 功能：
 *   - 组织/团队名称行内可编辑（双击或点 ✏️）
 *   - 任意层级行内新增下级组织（➕）
 *   - 进度条可拖拽
 *   - 修改后自动保存
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * @param {HTMLElement} container
   * @param {object} opts
   *   - businessId
   *   - tree: 组织节点数组
   *   - expandedSet: Set<nodeKey>
   *   - readOnly: boolean  继承模式下整体只读
   *   - onToggle(nodeKey)
   *   - onDataChange()
   */
  function render(container, opts) {
    var businessId = opts.businessId;
    var tree = opts.tree;
    var readOnly = !!opts.readOnly;
    var expandedSet = opts.expandedSet;
    var onToggle = opts.onToggle || function () {};
    var onDataChange = opts.onDataChange || function () {};

    container.innerHTML = '';
    container.className = 'tc-sticky-board';

    if (tree.length === 0) {
      container.innerHTML =
        '<div class="tc-tree-empty">' +
          '<div class="empty-icon">🗺</div>' +
          '<div class="empty-text">当前业务还未关联任何组织<br>点击右上角「复用组织」或「新增组织」开始</div>' +
        '</div>';
      return;
    }

    // 每家组织一张便利贴
    tree.forEach(function (companyNode) {
      var note = document.createElement('div');
      note.className = 'tc-company-note';
      container.appendChild(note);

      // 便利贴内部表格
      var table = document.createElement('table');
      table.className = 'tc-tree-table';
      table.innerHTML =
        '<thead><tr>' +
          '<th class="col-tier">梯队</th>' +
          '<th class="col-name">组织 / 团队</th>' +
          '<th class="col-progress">当前进度</th>' +
          '<th class="col-actions">操作</th>' +
        '</tr></thead>';
      var tbody = document.createElement('tbody');
      table.appendChild(tbody);
      note.appendChild(table);

      renderNode(tbody, companyNode, 0, []);
    });

    /** 递归渲染节点行 */
    function renderNode(tbody, node, depth, pathNames) {
      var tr = document.createElement('tr');
      tr.className = 'tc-tree-row tc-depth-' + depth + (node.nodeType === 'company' ? ' tc-company-row' : '');
      tr.dataset.nodeKey = node.nodeKey;
      tr.dataset.nodeType = node.nodeType;

      // ---- 梯队 ----
      var tdTier = document.createElement('td');
      tdTier.className = 'col-tier';
      if (node.target) {
        if (readOnly) {
          // 只读模式：显示文本，不下拉
          tdTier.innerHTML = '<span class="tc-tier-text">' + esc(node.target.tier || '—') + '</span>';
        } else {
          var sel = document.createElement('select');
          sel.className = 'tc-tier-select';
          ['', 'T0', 'T1', 'T1.5', 'T2'].forEach(function (t) {
            var opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t || '-';
            if ((node.target.tier || '') === t) opt.selected = true;
            sel.appendChild(opt);
          });
          sel.addEventListener('change', function () {
            TCStore.updateBusinessTarget(node.target.id, { tier: this.value });
            onDataChange();
          });
          tdTier.appendChild(sel);
        }
      } else {
        tdTier.innerHTML = '<span class="tc-tier-empty">—</span>';
      }
      tr.appendChild(tdTier);

      // ---- 名称列（缩进 + 展开按钮 + 图标 + 可编辑名称） ----
      var tdName = document.createElement('td');
      tdName.className = 'col-name';
      var nameWrap = document.createElement('div');
      nameWrap.className = 'tc-name-wrap';
      nameWrap.style.paddingLeft = (depth * 20) + 'px';

      if (node.children.length > 0) {
        var arrow = document.createElement('button');
        arrow.className = 'tc-toggle-btn';
        arrow.type = 'button';
        var expanded = expandedSet.has(node.nodeKey);
        arrow.textContent = expanded ? '▼' : '▶';
        arrow.title = expanded ? '折叠' : '展开';
        arrow.addEventListener('click', function (e) {
          e.stopPropagation();
          onToggle(node.nodeKey);
        });
        nameWrap.appendChild(arrow);
      } else {
        var spacer = document.createElement('span');
        spacer.className = 'tc-toggle-spacer';
        nameWrap.appendChild(spacer);
      }

      // 名称：readOnly 模式下纯文本，否则可双击编辑
      var nameText;
      if (readOnly) {
        nameText = document.createElement('span');
        nameText.className = 'tc-node-name readonly-name';
        nameText.textContent = node.name;
      } else {
        nameText = mkEditableName(node, depth, onDataChange);
      }
      nameWrap.appendChild(nameText);

      tdName.appendChild(nameWrap);
      tr.appendChild(tdName);

      // ---- 当前进度 ----
      var tdProg = document.createElement('td');
      tdProg.className = 'col-progress';
      // readOnly 模式（继承业务）下，所有进度条都不可编辑
      var editable = !readOnly && node.isLeaf && !!node.target;
      var bar = TCProgressBar.render({
        value: node.calculatedProgress,
        editable: editable,
        onChange: function (newVal) {
          if (!node.target) return;
          TCStore.updateBusinessTarget(node.target.id, { progress: newVal });
          onDataChange();
        }
      });
      tdProg.appendChild(bar);
      tr.appendChild(tdProg);

      // ---- 操作列（readOnly 模式下隐藏） ----
      var tdAct = document.createElement('td');
      tdAct.className = 'col-actions';
      if (!readOnly) {
        tdAct.appendChild(buildActions(node));
      } else {
        tdAct.innerHTML = '<span class="tc-readonly-tag" title="继承模式：只读">只读</span>';
      }
      tr.appendChild(tdAct);

      tbody.appendChild(tr);

      // 递归渲染可见子节点
      if (expandedSet.has(node.nodeKey)) {
        node.children.forEach(function (c) {
          renderNode(tbody, c, depth + 1, pathNames.concat(node.nodeType === 'org' ? node.name : []));
        });
      }
    }

    /** 可编辑名称：默认显示文本，双击变 input，失焦/回车保存 */
    function mkEditableName(node, depth, onDataChange) {
      var wrap = document.createElement('span');
      wrap.className = 'tc-name-edit-wrap';

      var span = document.createElement('span');
      span.className = 'tc-node-name';
      span.textContent = node.name;
      span.title = '双击编辑名称';
      span.addEventListener('dblclick', function (e) {
        e.stopPropagation();
        enterEdit();
      });

      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'tc-name-input';
      input.value = node.name;
      input.style.display = 'none';

      function enterEdit() {
        span.style.display = 'none';
        input.style.display = '';
        input.focus();
        input.select();
      }
      function exitEdit() {
        span.style.display = '';
        input.style.display = 'none';
      }
      function save() {
        var v = (input.value || '').trim();
        if (!v) { input.focus(); return; }
        if (v === node.name) { exitEdit(); return; }
        if (node.nodeType === 'company') {
          TCStore.updateCompany(node.companyId, { name: v });
        } else {
          TCStore.updateOrganization(node.organizationId, { name: v });
        }
        exitEdit();
        onDataChange();
      }
      input.addEventListener('blur', save);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); save(); }
        if (e.key === 'Escape') { e.preventDefault(); input.value = node.name; exitEdit(); }
      });
      input.addEventListener('click', function (e) { e.stopPropagation(); });

      wrap.appendChild(span);
      wrap.appendChild(input);
      return wrap;
    }

    /** 操作列按钮 */
    function buildActions(node) {
      var wrap = document.createElement('div');
      wrap.className = 'tc-actions';

      // ➕ 新增下级组织（组织行也可新增一级组织）
      var addBtn = mkBtn('➕', node.nodeType === 'company' ? '新增一级组织' : '新增子组织', function () {
        TCEditors.openOrganizationEditor({
          mode: 'create',
          companyId: node.companyId,
          parentId: node.nodeType === 'company' ? null : node.organizationId,
          onDone: function (org) {
            if (!org) return;
            // 新建组织后自动关联到当前业务
            TCStore.addTargetsToBusiness(businessId, [{
              companyId: node.companyId,
              organizationId: org.id
            }]);
            // 自动展开父节点
            if (!expandedSet.has(node.nodeKey)) {
              onToggle(node.nodeKey);
            } else {
              onDataChange();
            }
          }
        });
      });
      wrap.appendChild(addBtn);

      // 🗑 从业务移除
      var removeBtn = mkBtn('🗑', '从当前业务移除', function () {
        if (node.nodeType === 'company') {
          if (!confirm('从当前业务移除「' + node.name + '」？\n\n仅删除本业务下的关联数据，共享的组织与组织保留。')) return;
          TCTree.removeOrganizationFromBusiness(businessId, { companyId: node.companyId });
        } else {
          if (!confirm('从当前业务移除「' + node.name + '」及其所有后代组织？')) return;
          TCTree.removeOrganizationFromBusiness(businessId, {
            companyId: node.companyId,
            organizationId: node.organizationId
          });
        }
        onDataChange();
      });
      wrap.appendChild(removeBtn);

      return wrap;
    }

    function mkBtn(icon, title, onClick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tc-action-btn';
      b.title = title;
      b.textContent = icon;
      b.addEventListener('click', function (e) { e.stopPropagation(); onClick(); });
      return b;
    }
  }

  global.TCTreeTable = { render: render };
})(window);
