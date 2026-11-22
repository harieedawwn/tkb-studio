/* TKB Studio - curated style presets (layout + palette + type + background) and font pairings. */
(function () {
  'use strict';
  var TKB = (window.TKB = window.TKB || {});

  // look fields a preset resets; display toggles (title, times, period numbers) stay as the user set them
  var BASE = {
    subjectColors: 'auto', textScale: 1, radius: 14, gap: 8, borderWidth: 2, shadow: 'hard',
    panelOpacity: 0.95, panelBlur: 0, headStyle: 'filled', textEffect: 'none', bloom: 0.6, upper: false
  };

  function P(id, name, tag, layout, theme, fonts, look, bg, place) {
    return {
      id: id, name: name, tag: tag,
      look: Object.assign({}, BASE, look || {}, {
        layout: layout, theme: theme,
        fonts: { title: fonts[0], titleWeight: fonts[1], body: fonts[2], bodyWeight: fonts[3] }
      }),
      bg: bg, place: Object.assign({ cx: 0.5, cy: 0.56, width: 0.9, zoom: 1 }, place || {})
    };
  }
  function pat(id, color, bg, scale) { return { type: 'pattern', color: bg, pattern: { id: id, color: color, scale: scale || 1 } }; }
  function flat(color) { return { type: 'color', color: color }; }

  var list = [
    P('matcha', 'Matcha', 'Dịu, xanh trà sữa', 'planner', 'matcha', ['Phudu', 700, 'Lexend', 500],
      { radius: 20, borderWidth: 0, shadow: 'soft' }, pat('dots', '#CFD8B6', '#DCE3C8', 1.2)),
    P('editorial', 'Tạp chí', 'Kẻ chỉ, chữ có chân', 'editorial', 'ivory', ['Noto Serif Display', 700, 'Newsreader', 500],
      { radius: 2, borderWidth: 0, shadow: 'soft', panelOpacity: 1 }, flat('#E7E0D1'), { width: 0.92 }),
    P('swiss', 'Thụy Sĩ', 'Poster đỏ, lưới chặt', 'swiss', 'mono', ['Familjen Grotesk', 700, 'Familjen Grotesk', 500],
      { radius: 0, borderWidth: 0, shadow: 'none', panelOpacity: 1, upper: true }, flat('#E63B2E'), { width: 0.9 }),
    P('hoian', 'Hội An', 'Tường vàng, đèn lồng', 'bento', 'hoian', ['Yeseva One', 400, 'Be Vietnam Pro', 600],
      { radius: 18, borderWidth: 0, shadow: 'none', panelOpacity: 1 }, pat('scales', '#E6BA3C', '#F1C84B', 1.4)),
    P('calligraphy', 'Thư pháp', 'Mực đen, nét bay', 'mono', 'noir', ['Corinthia', 700, 'Cormorant', 600],
      { textScale: 1.15 }, pat('specks', '#202023', '#0F0F10', 1), { width: 0.86, cy: 0.58 }),
    P('sakura', 'Anh đào', 'Giấy nhớ hồng xinh', 'notes', 'sakura', ['Gluten', 600, 'Mali', 500],
      { radius: 16, borderWidth: 0, shadow: 'soft' }, pat('confetti', '#F0CCD3', '#F6E1E4', 1)),
    P('starry', 'Đêm sao', 'Xanh đêm, chữ tròn', 'planner', 'midnight', ['Unbounded', 600, 'Lexend', 400],
      { radius: 18, borderWidth: 0, shadow: 'none', panelOpacity: 0.9 }, pat('specks', '#26304D', '#141B2D', 1)),
    P('ocean', 'Biển xanh', 'Ô khối mát lạnh', 'bento', 'ocean', ['Kanit', 600, 'Kanit', 400],
      { radius: 22, borderWidth: 0, shadow: 'none', panelOpacity: 1 }, pat('waves', '#BCD6E2', '#CFE3EC', 1.2)),
    P('lotus', 'Sen hồng', 'Thanh lịch, nhẹ nhàng', 'planner', 'lotus', ['Playfair', 700, 'Be Vietnam Pro', 500],
      { radius: 18, borderWidth: 0, shadow: 'soft' }, pat('dots', '#EAC4CB', '#F3D5D9', 1)),
    P('poster', 'Báo tường', 'Chữ đứng, nền đen', 'swiss', 'ivory', ['Vina Sans', 400, 'Be Vietnam Pro', 600],
      { radius: 0, borderWidth: 0, shadow: 'none', panelOpacity: 1, upper: true }, flat('#1A1A1A'), { width: 0.9 }),
    P('chalk', 'Bảng đen', 'Phấn trắng, nét tay', 'grid', 'chalk', ['Mynerve', 400, 'Grape Nuts', 400],
      { subjectColors: 'none', headStyle: 'underline', shadow: 'none', borderWidth: 2, radius: 10, upper: false },
      pat('specks', '#2D4236', '#23352B', 1)),
    P('pop', 'Pop', 'Khối đậm, viền dày', 'cards', 'mustard', ['Bungee', 400, 'Lexend', 700],
      { radius: 16, borderWidth: 3, shadow: 'hard', upper: true }, pat('checker', '#D6B152', '#E2BE62', 1)),
    P('leather', 'Sổ da', 'Nâu cà phê, Garamond', 'planner', 'espresso', ['EB Garamond', 700, 'EB Garamond', 500],
      { radius: 10, borderWidth: 0, shadow: 'soft' }, pat('lines', '#30241C', '#271D17', 1)),
    P('white', 'Trắng tinh', 'Chỉ chữ, thật sạch', 'mono', 'cloud', ['Manrope', 800, 'Manrope', 500],
      {}, flat('#E9EDF0'), { width: 0.86 }),
    P('sticky', 'Viết tay', 'Phông Playwrite VN', 'notes', 'butter', ['Playwrite VN', 300, 'Patrick Hand', 400],
      { radius: 8, borderWidth: 0, shadow: 'soft' }, pat('grid', '#F0E3A8', '#FAF0C8', 1)),
    P('classic', 'Giấy kem', 'Bản gốc, viền cứng', 'grid', 'paper', ['Bricolage Grotesque', 800, 'Be Vietnam Pro', 600],
      { upper: true }, pat('dots', '#E3D9C4', '#F4EFE4', 1))
  ];

  var pairs = [
    ['Hiện đại', 'Phudu', 700, 'Lexend', 500],
    ['Thanh lịch', 'Playfair', 700, 'Be Vietnam Pro', 500],
    ['Tạp chí', 'Noto Serif Display', 700, 'Newsreader', 500],
    ['Thư pháp', 'Corinthia', 700, 'Cormorant', 600],
    ['Dễ thương', 'Gluten', 600, 'Mali', 500],
    ['Mạnh mẽ', 'Vina Sans', 400, 'Kanit', 500],
    ['Nghệ thuật', 'Bungee Shade', 400, 'Lexend', 600],
    ['Viết tay', 'Playwrite VN', 300, 'Patrick Hand', 400],
    ['Cổ điển', 'EB Garamond', 700, 'EB Garamond', 500],
    ['Khối', 'Dela Gothic One', 400, 'Manrope', 600],
    ['Tròn trịa', 'Unbounded', 600, 'Nunito', 600],
    ['Tinh tế', 'Cormorant Upright', 600, 'Manrope', 500]
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // apply onto a config in place; a user photo background is kept
  function apply(c, p) {
    var keep = { showTitle: c.look.showTitle, showTimes: c.look.showTimes, showPeriodNumbers: c.look.showPeriodNumbers };
    c.look = Object.assign({}, c.look, clone(p.look), keep, { colors: {} });
    if (!(c.bg && c.bg.type === 'image')) {
      var b = clone(p.bg);
      c.bg = Object.assign({}, c.bg, { type: b.type, color: b.color });
      if (b.pattern) c.bg.pattern = b.pattern;
    } else c.look.panelOpacity = Math.max(0.88, c.look.panelOpacity);
    // a style sets the position only; the user's own size (width, zoom, preset) is kept
    var sz = { width: c.place.width, zoom: c.place.zoom, preset: c.place.preset };
    c.place = Object.assign({}, c.place, clone(p.place), sz);
    return c;
  }

  TKB.presets = { list: list, pairs: pairs, apply: apply };
})();
