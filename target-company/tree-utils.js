/**
 * 目标公司模块 - 树形工具与核心业务逻辑
 * 依赖 TCStore（data-store.js）
 */
(function (global) {
  'use strict';

  /**
   * 把某公司下的所有组织构建成树。
   * @param {string} companyId
   * @returns {Array} 根组织节点数组（parentId 为 null 的）。节点：{ id, name, companyId, parentId, order, children: [] }
   */
  function buildOrganizationTree(companyId) {
    var all = TCStore.getOrganizationsByCompany(companyId);
    var byId = {};
    all.forEach(function (o) {
      byId[o.id] = {
        id: o.id,
        name: o.name,
        companyId: o.companyId,
        parentId: o.parentId || null,
        order: o.order || 0,
        children: []
      };
    });
    var roots = [];
    all.forEach(function (o) {
      var node = byId[o.id];
      if (o.parentId && byId[o.parentId]) {
        byId[o.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });
    // 按 order 排序（稳定的 tree 顺序）
    function sortRec(list) {
      list.sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      list.forEach(function (n) { sortRec(n.children); });
    }
    sortRec(roots);
    return roots;
  }

  /**
   * 为某业务构建完整「公司 → 组织」树。
   * 每个节点：
   * {
   *   nodeKey, nodeType ('company'|'org'),
   *   companyId, organizationId (nullable),
   *   name,
   *   depth,
   *   children: [],
   *   target: { id, tier, progress } | null,        // 当前业务是否关联了该节点
   *   calculatedProgress: number | null,            // 自身或后代叶子均值
   *   isLeaf: boolean,                              // 是否叶子（无子节点）
   *   hasTargetInSubtree: boolean                   // 子树内是否有任何业务关联
   * }
   *
   * 注意：仅返回当前业务已关联的公司。未关联公司不展示。
   */
  function getBusinessCompanyTree(businessId) {
    var targets = TCStore.getBusinessTargets(businessId);
    var companies = TCStore.getCompanies();
    // 按公司分组 targets
    var companyIds = [];
    var byCompany = {};
    targets.forEach(function (t) {
      if (!byCompany[t.companyId]) { byCompany[t.companyId] = []; companyIds.push(t.companyId); }
      byCompany[t.companyId].push(t);
    });

    var result = [];
    companyIds.forEach(function (cid) {
      var company = companies.filter(function (c) { return c.id === cid; })[0];
      if (!company) return;
      var node = buildCompanyNode(businessId, company, byCompany[cid]);
      if (node) result.push(node);
    });
    // 按公司名排序
    result.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return result;
  }

  /**
   * 为某业务构建单个公司节点（含其子树）。
   * 只保留「子树内有业务关联」的节点；子树内无关联的节点不展示。
   */
  function buildCompanyNode(businessId, company, targetsForCompany) {
    // 建索引：organizationId → target
    var targetByOrg = {};
    var companyTarget = null;
    targetsForCompany.forEach(function (t) {
      if (t.organizationId) targetByOrg[t.organizationId] = t;
      else companyTarget = t;
    });

    var orgTree = buildOrganizationTree(company.id);

    function buildOrgNode(orgNode, depth) {
      var children = orgNode.children.map(function (c) { return buildOrgNode(c, depth + 1); });
      // 过滤：只保留有 target 或子树有 target 的子节点
      children = children.filter(function (c) { return c.target || c.hasTargetInSubtree; });
      var own = targetByOrg[orgNode.id] || null;
      var hasTargetInSubtree = !!own || children.some(function (c) { return c.target || c.hasTargetInSubtree; });
      var node = {
        nodeKey: orgNode.id,
        nodeType: 'org',
        companyId: company.id,
        organizationId: orgNode.id,
        name: orgNode.name,
        depth: depth,
        children: children,
        target: own,
        isLeaf: children.length === 0,
        hasTargetInSubtree: hasTargetInSubtree
      };
      node.calculatedProgress = calculateNodeProgress(node);
      return node;
    }

    var orgChildren = orgTree.map(function (o) { return buildOrgNode(o, 1); });
    orgChildren = orgChildren.filter(function (c) { return c.target || c.hasTargetInSubtree; });

    var companyHasTargetInSubtree = !!companyTarget || orgChildren.some(function (c) { return c.target || c.hasTargetInSubtree; });
    var companyNode = {
      nodeKey: company.id,
      nodeType: 'company',
      companyId: company.id,
      organizationId: null,
      name: company.name,
      depth: 0,
      children: orgChildren,
      target: companyTarget,
      isLeaf: orgChildren.length === 0,
      hasTargetInSubtree: companyHasTargetInSubtree
    };
    companyNode.calculatedProgress = calculateNodeProgress(companyNode);
    return companyNode;
  }

  /**
   * 计算节点显示用进度：
   *   - 叶子节点（无子节点）：有 target → 用自身 progress；无 target → null
   *   - 非叶子节点（上级组织）：进度恒等于「直接子节点」的加权平均，
   *     忽略自身 target 的 progress（上级进度永远由下级汇总而来）
   *       上级进度 = Σ(100/N × 每个子节点总进度) / 100
   *       其中 N = 直接子节点数量，无进度的子节点视为 0，但仍计入权重
   *   - 全部子节点都无进度 → null
   *   - 结果按 10 的倍数四舍五入（与 10 格进度条一致）
   */
  function calculateNodeProgress(node) {
    // 叶子节点：用自身 target 进度（或 null）
    if (node.children.length === 0) {
      return node.target ? node.target.progress : null;
    }
    // 非叶子节点：始终基于直接子节点加权平均，忽略自身 target
    var n = node.children.length;
    var weight = 100 / n;
    var sum = 0;
    var any = false;
    node.children.forEach(function (child) {
      var p = calculateNodeProgress(child);
      if (p != null) any = true;
      // 无进度的子节点视为 0，但仍计入权重（拖低整体进度）
      sum += (p == null ? 0 : p) * weight / 100;
    });
    if (!any) return null;
    return Math.round(sum / 10) * 10;
  }

  /**
   * 切换节点展开状态。
   * @param {string} businessId
   * @param {Set} expandedSet  当前展开的 nodeKey 集合
   * @param {string} nodeKey
   * @returns {Set} 新的集合（已持久化）
   */
  function toggleNodeExpanded(businessId, expandedSet, nodeKey) {
    if (expandedSet.has(nodeKey)) expandedSet.delete(nodeKey);
    else expandedSet.add(nodeKey);
    TCStore.saveExpandedSet(businessId, expandedSet);
    return expandedSet;
  }

  /**
   * 一键复用：把勾选的 (companyId, organizationId) 集合添加到指定业务。
   * 自动去重。
   * @param {string} businessId
   * @param {Array} items  [{ companyId, organizationId|null, tier?, progress? }]
   * @returns {{created:number, skipped:number}}
   */
  function reuseOrganizationsForBusiness(businessId, items) {
    return TCStore.addTargetsToBusiness(businessId, items);
  }

  /**
   * 从业务中移除公司或组织。
   * @param {string} businessId
   * @param {object} opts  { companyId, organizationId? }
   * @returns {number} 移除的关联数
   */
  function removeOrganizationFromBusiness(businessId, opts) {
    if (opts.organizationId) {
      return TCStore.removeOrganizationFromBusiness(businessId, opts.organizationId);
    }
    return TCStore.removeCompanyFromBusiness(businessId, opts.companyId);
  }

  /**
   * 检查共享公司/组织是否仍被任何业务引用（用于删除前的安全检查）。
   */
  function isCompanyReferenced(companyId) {
    return TCStore.getBusinessTargets().some(function (t) { return t.companyId === companyId; });
  }
  function isOrganizationReferenced(organizationId) {
    var ids = TCStore.collectOrgSubtreeIds(organizationId);
    return TCStore.getBusinessTargets().some(function (t) {
      return t.organizationId && ids.indexOf(t.organizationId) !== -1;
    });
  }

  /**
   * 默认展开策略：首次进入时默认展开「有 target 或子树有 target」的所有节点。
   */
  function defaultExpandedSet(tree) {
    var set = new Set();
    function walk(n) {
      if (n.target || n.hasTargetInSubtree) set.add(n.nodeKey);
      n.children.forEach(walk);
    }
    tree.forEach(walk);
    return set;
  }

  global.TCTree = {
    buildOrganizationTree: buildOrganizationTree,
    getBusinessCompanyTree: getBusinessCompanyTree,
    toggleNodeExpanded: toggleNodeExpanded,
    calculateNodeProgress: calculateNodeProgress,
    reuseOrganizationsForBusiness: reuseOrganizationsForBusiness,
    removeOrganizationFromBusiness: removeOrganizationFromBusiness,
    isCompanyReferenced: isCompanyReferenced,
    isOrganizationReferenced: isOrganizationReferenced,
    defaultExpandedSet: defaultExpandedSet
  };
})(window);
