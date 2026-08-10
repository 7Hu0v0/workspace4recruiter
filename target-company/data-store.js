/**
 * 目标组织模块 - 数据访问层
 *
 * 所有 localStorage 操作集中在这里，UI 组件不直接读写 localStorage。
 * 数据模型：
 *   businesses       [{ id, name, emoji, order }]
 *   companies        [{ id, name, createdAt }]
 *   organizations    [{ id, companyId, parentId, name, order }]
 *   businessTargets  [{ id, businessId, companyId, organizationId|null, tier, progress }]
 *
 * 关联规则：
 *   - organizationId 为 null 表示关联到组织本身（组织节点）
 *   - (businessId, companyId, organizationId) 三元组唯一，不可重复
 *   - 进度仅允许 10 的倍数（0-100）
 */
(function (global) {
  'use strict';

  var NS = 'recruiter-workbench-tc-';
  var KEY = {
    businesses: NS + 'businesses',
    companies: NS + 'companies',
    organizations: NS + 'organizations',
    targets: NS + 'targets',
    seeded: NS + 'seeded-v1'
  };

  // ---------- 基础读写 ----------
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function uid(prefix) {
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // ---------- 业务 ----------
  function getBusinesses() {
    return read(KEY.businesses, []);
  }
  function saveBusinesses(list) {
    write(KEY.businesses, list);
  }
  function getBusiness(id) {
    return getBusinesses().filter(function (b) { return b.id === id; })[0] || null;
  }
  function createBusiness(data) {
    var list = getBusinesses();
    var b = {
      id: uid('biz'),
      name: String(data.name || '').trim(),
      emoji: data.emoji || '🎯',
      order: list.length,
      inheritFrom: data.inheritFrom || null   // 继承源业务 id；设置后进度数据自动跟随源业务
    };
    if (!b.name) return null;
    list.push(b);
    saveBusinesses(list);
    return b;
  }
  /** 更新业务元信息（目前仅支持 inheritFrom）。返回更新后的业务或 null。 */
  function updateBusiness(id, changes) {
    var list = getBusinesses();
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { idx = i; break; }
    if (idx === -1) return null;
    if (Object.prototype.hasOwnProperty.call(changes, 'inheritFrom')) {
      var v = changes.inheritFrom;
      // 不允许自引用 / 循环引用
      if (v === id) return null;
      if (v && wouldCreateCycle(id, v)) return null;
      list[idx].inheritFrom = v || null;
    }
    saveBusinesses(list);
    return list[idx];
  }
  /** 检查把 source 的 inheritFrom 设为 targetId 是否会形成循环。 */
  function wouldCreateCycle(sourceId, targetId) {
    var visited = new Set();
    var cur = targetId;
    while (cur) {
      if (cur === sourceId) return true;
      if (visited.has(cur)) return true; // 已存在的循环
      visited.add(cur);
      var b = getBusiness(cur);
      cur = b ? (b.inheritFrom || null) : null;
    }
    return false;
  }
  /** 解析业务最终的源业务 id（沿继承链一直追溯到根）。 */
  function resolveInheritRoot(businessId) {
    var visited = new Set();
    var cur = businessId;
    while (cur && !visited.has(cur)) {
      visited.add(cur);
      var b = getBusiness(cur);
      if (!b || !b.inheritFrom) break;
      cur = b.inheritFrom;
    }
    return cur;
  }

  // ---------- 组织 ----------
  function getCompanies() {
    return read(KEY.companies, []);
  }
  function saveCompanies(list) {
    write(KEY.companies, list);
  }
  function getCompany(id) {
    return getCompanies().filter(function (c) { return c.id === id; })[0] || null;
  }
  function createCompany(data) {
    var list = getCompanies();
    var name = String(data.name || '').trim();
    if (!name) return null;
    // 同名去重
    var dup = list.filter(function (c) { return c.name === name; })[0];
    if (dup) return dup;
    var c = { id: uid('co'), name: name, createdAt: Date.now() };
    list.push(c);
    saveCompanies(list);
    return c;
  }
  function updateCompany(id, changes) {
    var list = getCompanies();
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { idx = i; break; }
    if (idx === -1) return null;
    if (changes.name != null) list[idx].name = String(changes.name).trim();
    saveCompanies(list);
    return list[idx];
  }
  /** 删除共享组织。若仍被任何业务引用则返回 false，不删除。 */
  function deleteCompanyIfOrphan(id) {
    var refs = getBusinessTargets().filter(function (t) { return t.companyId === id; });
    if (refs.length > 0) return { ok: false, reason: 'referenced', count: refs.length };
    saveCompanies(getCompanies().filter(function (c) { return c.id !== id; }));
    // 同时删除其下所有组织
    saveOrganizations(getOrganizations().filter(function (o) { return o.companyId !== id; }));
    return { ok: true };
  }

  // ---------- 组织 ----------
  function getOrganizations() {
    return read(KEY.organizations, []);
  }
  function saveOrganizations(list) {
    write(KEY.organizations, list);
  }
  function getOrganization(id) {
    return getOrganizations().filter(function (o) { return o.id === id; })[0] || null;
  }
  function getOrganizationsByCompany(companyId) {
    return getOrganizations().filter(function (o) { return o.companyId === companyId; });
  }
  function createOrganization(data) {
    var list = getOrganizations();
    var name = String(data.name || '').trim();
    if (!name || !data.companyId) return null;
    // 同父下重名检测
    var dup = list.filter(function (o) {
      return o.companyId === data.companyId &&
        (o.parentId || null) === (data.parentId || null) &&
        o.name === name;
    })[0];
    if (dup) return dup;
    var siblings = list.filter(function (o) {
      return o.companyId === data.companyId && (o.parentId || null) === (data.parentId || null);
    });
    var o = {
      id: uid('org'),
      companyId: data.companyId,
      parentId: data.parentId || null,
      name: name,
      order: siblings.length
    };
    list.push(o);
    saveOrganizations(list);
    return o;
  }
  function updateOrganization(id, changes) {
    var list = getOrganizations();
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) { idx = i; break; }
    if (idx === -1) return null;
    if (changes.name != null) list[idx].name = String(changes.name).trim();
    saveOrganizations(list);
    return list[idx];
  }
  /** 收集某组织的所有后代 id（含自身）。 */
  function collectOrgSubtreeIds(orgId) {
    var all = getOrganizations();
    var ids = [orgId];
    var queue = [orgId];
    while (queue.length) {
      var cur = queue.shift();
      all.forEach(function (o) {
        if (o.parentId === cur) { ids.push(o.id); queue.push(o.id); }
      });
    }
    return ids;
  }
  /** 删除共享组织。若自身或后代仍被任何业务引用则返回 false，不删除。 */
  function deleteOrganizationIfOrphan(id) {
    var ids = collectOrgSubtreeIds(id);
    var refs = getBusinessTargets().filter(function (t) {
      return t.organizationId && ids.indexOf(t.organizationId) !== -1;
    });
    if (refs.length > 0) return { ok: false, reason: 'referenced', count: refs.length };
    saveOrganizations(getOrganizations().filter(function (o) { return ids.indexOf(o.id) === -1; }));
    return { ok: true, removed: ids.length };
  }

  // ---------- 业务关联 ----------
  /**
   * 读取某业务的关联数据。
   * 若业务声明了 inheritFrom，则自动沿继承链读取源业务的 targets（递归）。
   * 这样上层树形渲染无需感知继承关系——直接调本函数即可。
   */
  function getBusinessTargets(businessId) {
    var all = read(KEY.targets, []);
    if (!businessId) return all;
    var rootId = resolveInheritRoot(businessId);
    return all.filter(function (t) { return t.businessId === rootId; });
  }
  function saveAllTargets(list) {
    write(KEY.targets, list);
  }
  /** 业务是否处于继承模式（即 inheritFrom 非空）。 */
  function isInheriting(businessId) {
    var b = getBusiness(businessId);
    return !!(b && b.inheritFrom);
  }
  function findTarget(businessId, companyId, organizationId) {
    var orgKey = organizationId || null;
    return getBusinessTargets(businessId).filter(function (t) {
      return t.companyId === companyId && (t.organizationId || null) === orgKey;
    })[0] || null;
  }
  /**
   * 批量为某业务创建关联。已存在的 (companyId, organizationId) 组合会被跳过。
   * @returns {{created:number, skipped:number}}
   */
  function addTargetsToBusiness(businessId, items) {
    var all = read(KEY.targets, []);
    var created = 0, skipped = 0;
    items.forEach(function (it) {
      var exists = all.filter(function (t) {
        return t.businessId === businessId &&
          t.companyId === it.companyId &&
          (t.organizationId || null) === (it.organizationId || null);
      })[0];
      if (exists) { skipped++; return; }
      all.push({
        id: uid('bt'),
        businessId: businessId,
        companyId: it.companyId,
        organizationId: it.organizationId || null,
        tier: it.tier || '',
        progress: clampProgress(it.progress != null ? it.progress : 0)
      });
      created++;
    });
    saveAllTargets(all);
    return { created: created, skipped: skipped };
  }
  function updateBusinessTarget(id, changes) {
    var all = read(KEY.targets, []);
    var idx = -1;
    for (var i = 0; i < all.length; i++) if (all[i].id === id) { idx = i; break; }
    if (idx === -1) return null;
    if (changes.tier != null) all[idx].tier = String(changes.tier);
    if (changes.progress != null) all[idx].progress = clampProgress(changes.progress);
    saveAllTargets(all);
    return all[idx];
  }
  /** 从某业务移除单条关联。 */
  function removeTargetFromBusiness(id) {
    var all = read(KEY.targets, []);
    var before = all.length;
    all = all.filter(function (t) { return t.id !== id; });
    saveAllTargets(all);
    return all.length < before;
  }
  /** 把某业务下某组织的全部关联移除（不删除共享组织/团队）。 */
  function removeCompanyFromBusiness(businessId, companyId) {
    var all = read(KEY.targets, []);
    var before = all.length;
    all = all.filter(function (t) {
      return !(t.businessId === businessId && t.companyId === companyId);
    });
    saveAllTargets(all);
    return before - all.length;
  }
  /** 把某业务下某组织（含所有后代）的关联移除。 */
  function removeOrganizationFromBusiness(businessId, organizationId) {
    var ids = collectOrgSubtreeIds(organizationId);
    var all = read(KEY.targets, []);
    var before = all.length;
    all = all.filter(function (t) {
      if (t.businessId !== businessId) return true;
      if (!t.organizationId) return true;
      return ids.indexOf(t.organizationId) === -1;
    });
    saveAllTargets(all);
    return before - all.length;
  }

  // ---------- 进度工具 ----------
  function clampProgress(p) {
    var n = parseInt(p, 10);
    if (isNaN(n)) n = 0;
    n = Math.round(n / 10) * 10;
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return n;
  }

  // ---------- 展开状态 ----------
  function expandedKey(businessId) { return NS + 'expanded-' + businessId; }
  function getExpandedSet(businessId) {
    var arr = read(expandedKey(businessId), null);
    if (arr === null) return null; // null 表示"首次进入，使用默认展开"
    return new Set(arr);
  }
  function saveExpandedSet(businessId, set) {
    write(expandedKey(businessId), Array.from(set));
  }

  // ---------- 种子数据 ----------
  function isSeeded() { return read(KEY.seeded, false); }
  function markSeeded() { write(KEY.seeded, true); }
  /** 首次进入时写入 3 个空业务，不预置任何组织/团队模板。 */
  function seedIfEmpty() {
    if (isSeeded()) return false;
    if (getBusinesses().length > 0) { markSeeded(); return false; }

    // 仅初始化 3 个业务，组织库与组织树保持空
    saveBusinesses([
      { id: 'biz-direction-a', name: '业务方向 A', emoji: '🌐', order: 0 },
      { id: 'biz-direction-b', name: '业务方向 B', emoji: '🤖', order: 1 },
      { id: 'biz-direction-c', name: '业务方向 C', emoji: '🛠', order: 2 }
    ]);

    markSeeded();
    return true;
  }

  // ---------- 暴露 ----------
  global.TCStore = {
    // 业务
    getBusinesses: getBusinesses,
    getBusiness: getBusiness,
    createBusiness: createBusiness,
    updateBusiness: updateBusiness,
    saveBusinesses: saveBusinesses,
    resolveInheritRoot: resolveInheritRoot,
    isInheriting: isInheriting,
    // 组织
    getCompanies: getCompanies,
    getCompany: getCompany,
    createCompany: createCompany,
    updateCompany: updateCompany,
    deleteCompanyIfOrphan: deleteCompanyIfOrphan,
    // 组织
    getOrganizations: getOrganizations,
    getOrganization: getOrganization,
    getOrganizationsByCompany: getOrganizationsByCompany,
    createOrganization: createOrganization,
    updateOrganization: updateOrganization,
    deleteOrganizationIfOrphan: deleteOrganizationIfOrphan,
    collectOrgSubtreeIds: collectOrgSubtreeIds,
    // 业务关联
    getBusinessTargets: getBusinessTargets,
    findTarget: findTarget,
    addTargetsToBusiness: addTargetsToBusiness,
    updateBusinessTarget: updateBusinessTarget,
    removeTargetFromBusiness: removeTargetFromBusiness,
    removeCompanyFromBusiness: removeCompanyFromBusiness,
    removeOrganizationFromBusiness: removeOrganizationFromBusiness,
    // 工具
    clampProgress: clampProgress,
    uid: uid,
    // 展开状态
    getExpandedSet: getExpandedSet,
    saveExpandedSet: saveExpandedSet,
    // 种子
    seedIfEmpty: seedIfEmpty
  };
})(window);
