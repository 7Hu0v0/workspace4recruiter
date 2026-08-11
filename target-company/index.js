/**
 * 目标公司模块 - 入口
 * 负责：种子数据初始化、对外暴露统一渲染接口。
 *
 * 与宿主页面（index.html）的集成约定：
 *   - 宿主需在 renderMain 中识别 type='target-company' 与 type='target-company-mapping'
 *   - 调用 TargetCompany.renderList(main, ctx) 渲染业务列表
 *   - 调用 TargetCompany.renderMapping(main, businessId, ctx) 渲染 Mapping 页
 *   - ctx 需提供 { selectPeriod(type, label, url, businessId), showToast(msg) }
 */
(function (global) {
  'use strict';

  // 版本标识，方便用户在控制台确认是否加载到最新代码
  console.log('[target-company] module loaded v4 (with inheritance) at', new Date().toISOString());

  // 首次加载写入种子数据
  if (global.TCStore) {
    try { TCStore.seedIfEmpty(); } catch (e) { console.error('[target-company] seed failed', e); }
  }

  // 暴露诊断函数：在浏览器控制台执行 window.__tcDiag() 可查看当前继承链与数据状态
  global.__tcDiag = function (businessId) {
    var biz = businessId ? TCStore.getBusiness(businessId) : null;
    var bizList = TCStore.getBusinesses();
    var targets = TCStore.getBusinessTargets();
    console.log('===== 目标公司模块诊断 =====');
    console.log('所有业务：', bizList);
    if (businessId) {
      console.log('当前业务：', biz);
      if (biz && biz.inheritFrom) {
        var src = TCStore.getBusiness(biz.inheritFrom);
        console.log('继承源：', src);
        var root = TCStore.resolveInheritRoot(businessId);
        console.log('解析后的根业务 id：', root);
      }
      var curTargets = TCStore.getBusinessTargets(businessId);
      console.log('当前业务读取到的 targets（含继承解析）：', curTargets);
    }
    console.log('全部 targets：', targets);
    console.log('全部公司：', TCStore.getCompanies());
    console.log('全部组织：', TCStore.getOrganizations());
    console.log('============================');
  };

  global.TargetCompany = {
    renderList: function (main, ctx) {
      TCBusinessList.render(main, ctx);
    },
    renderMapping: function (main, businessId, ctx) {
      TCMappingPage.render(main, businessId, ctx);
    }
  };
})(window);
