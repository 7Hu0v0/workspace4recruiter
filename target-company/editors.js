/**
 * 目标公司模块 - 公司/组织编辑器（modal 表单）
 * 提供：
 *   openCompanyEditor({ mode:'create'|'rename', companyId?, onDone })
 *   openOrganizationEditor({ mode:'create'|'rename', companyId, parentId?, organizationId?, onDone })
 */
(function (global) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function openModal(opts) {
    var existing = document.getElementById('tc-editor-backdrop');
    if (existing) existing.remove();
    var backdrop = document.createElement('div');
    backdrop.id = 'tc-editor-backdrop';
    backdrop.className = 'dm-modal-backdrop';
    backdrop.innerHTML =
      '<div class="dm-modal tc-editor-modal">' +
        '<div class="dm-modal-header">' +
          '<h3>' + esc(opts.title) + '</h3>' +
          '<button class="dm-modal-close" id="tc-editor-x" type="button">✕</button>' +
        '</div>' +
        '<div class="dm-modal-body">' +
          '<label class="tc-editor-label">' + esc(opts.label) + '</label>' +
          '<input type="text" id="tc-editor-input" class="tc-editor-input" placeholder="' + esc(opts.placeholder || '') + '" value="' + esc(opts.initialValue || '') + '">' +
        '</div>' +
        '<div class="dm-modal-footer">' +
          '<button class="dm-btn" id="tc-editor-cancel" type="button">取消</button>' +
          '<button class="dm-btn dm-btn-primary" id="tc-editor-ok" type="button">' + esc(opts.okText || '保存') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add('show'); });

    var input = backdrop.querySelector('#tc-editor-input');
    function close() {
      backdrop.classList.remove('show');
      setTimeout(function () { backdrop.remove(); }, 200);
    }
    function submit() {
      var v = (input.value || '').trim();
      if (!v) { input.focus(); input.classList.add('tc-editor-error'); return; }
      close();
      try { opts.onSubmit && opts.onSubmit(v); } catch (e) { console.error(e); }
    }
    backdrop.querySelector('#tc-editor-x').addEventListener('click', close);
    backdrop.querySelector('#tc-editor-cancel').addEventListener('click', close);
    backdrop.querySelector('#tc-editor-ok').addEventListener('click', submit);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    setTimeout(function () { input.focus(); input.select(); }, 80);
  }

  /** 公司编辑器。mode: 'create' | 'rename' */
  function openCompanyEditor(opts) {
    var isCreate = opts.mode === 'create';
    var company = isCreate ? null : TCStore.getCompany(opts.companyId);
    openModal({
      title: isCreate ? '➕ 新增公司' : '✏️ 修改公司名称',
      label: '公司名称',
      placeholder: '例如：目标组织 A / 目标组织 B / 目标组织 C',
      initialValue: company ? company.name : '',
      okText: isCreate ? '创建' : '保存',
      onSubmit: function (name) {
        var result;
        if (isCreate) {
          result = TCStore.createCompany({ name: name });
          if (!result) { alert('创建失败：名称不能为空'); return; }
        } else {
          result = TCStore.updateCompany(opts.companyId, { name: name });
        }
        opts.onDone && opts.onDone(result);
      }
    });
  }

  /** 组织编辑器。mode: 'create' | 'rename' */
  function openOrganizationEditor(opts) {
    var isCreate = opts.mode === 'create';
    var org = isCreate ? null : TCStore.getOrganization(opts.organizationId);
    var company = TCStore.getCompany(opts.companyId);
    var parent = opts.parentId ? TCStore.getOrganization(opts.parentId) : null;
    var breadcrumb = company ? company.name : '';
    if (parent) breadcrumb += ' / ' + parent.name;
    openModal({
      title: isCreate ? '➕ 新增子组织' : '✏️ 修改组织名称',
      label: '组织名称' + (breadcrumb ? '（位于 ' + breadcrumb + ' 下）' : ''),
      placeholder: '例如：目标组织 E 研究团队 / 产品线示例 / Pre-training',
      initialValue: org ? org.name : '',
      okText: isCreate ? '创建' : '保存',
      onSubmit: function (name) {
        var result;
        if (isCreate) {
          result = TCStore.createOrganization({
            companyId: opts.companyId,
            parentId: opts.parentId || null,
            name: name
          });
          if (!result) { alert('创建失败：名称不能为空'); return; }
        } else {
          result = TCStore.updateOrganization(opts.organizationId, { name: name });
        }
        opts.onDone && opts.onDone(result);
      }
    });
  }

  global.TCEditors = {
    openCompanyEditor: openCompanyEditor,
    openOrganizationEditor: openOrganizationEditor
  };
})(window);
