/**
 * 目标公司模块 - 可拖拽进度条
 * 使用原生 <input type="range"> 实现拖拽，上方叠加 10 格视觉填充条。
 * 仅叶子节点可编辑；父节点只读显示。
 */
(function (global) {
  'use strict';

  /**
   * @param {object} opts
   *   - value: 0-100（10 的倍数），null 表示无数据
   *   - editable: 是否可交互
   *   - onChange: function(newValue)  修改后回调（值已 clamp 为 10 的倍数）
   */
  function render(opts) {
    var value = opts.value == null ? null : TCStore.clampProgress(opts.value);
    var editable = !!opts.editable;
    var onChange = typeof opts.onChange === 'function' ? opts.onChange : function () {};

    var root = document.createElement('div');
    root.className = 'tc-progress' + (editable ? ' editable' : ' readonly');

    // ---- 10 格视觉填充条 ----
    var cells = document.createElement('div');
    cells.className = 'tc-progress-cells';
    root.appendChild(cells);

    var filled = value == null ? 0 : Math.round(value / 10);
    for (var i = 1; i <= 10; i++) {
      var c = document.createElement('div');
      c.className = 'tc-progress-cell' + (i <= filled ? ' filled' : '');
      cells.appendChild(c);
    }

    // ---- 百分比标签 ----
    var label = document.createElement('span');
    label.className = 'tc-progress-label';
    label.textContent = value == null ? '—' : value + '%';
    root.appendChild(label);

    if (!editable) return root;

    // ---- 可拖拽 range slider（透明覆盖在填充条上） ----
    var slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'tc-progress-slider';
    slider.min = 0;
    slider.max = 100;
    slider.step = 10;
    slider.value = value == null ? 0 : value;
    slider.setAttribute('aria-label', '进度');
    root.appendChild(slider);

    function paint(v) {
      var f = Math.round(v / 10);
      cells.querySelectorAll('.tc-progress-cell').forEach(function (el, idx) {
        el.classList.toggle('filled', (idx + 1) <= f);
      });
      label.textContent = v + '%';
    }

    // 拖拽中实时更新视觉
    slider.addEventListener('input', function () {
      paint(parseInt(this.value, 10));
    });

    // 松手时 commit（自动 clamp + 保存）
    slider.addEventListener('change', function () {
      var clamped = TCStore.clampProgress(parseInt(this.value, 10));
      paint(clamped);
      onChange(clamped);
    });

    return root;
  }

  global.TCProgressBar = { render: render };
})(window);
