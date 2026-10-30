(function () {
  'use strict';
  var TKB = (window.TKB = window.TKB || {});

  // Eight distinguishable accents (hues: coral, blue, green, yellow, violet, magenta, teal, tan)
  var ACC_A = ['#F0A58F', '#7FB8D6', '#9AD08A', '#EBCB6A', '#B9A0DC', '#E090C8', '#6FCBC0', '#C9A27E'];
  var ACC_B = ['#E8967E', '#78AFD9', '#8CC77E', '#E6C255', '#AE93D8', '#DB84BD', '#5FC2B6', '#C09A74'];
  var ACC_C = ['#F2B0A0', '#8DC0E0', '#A8D898', '#F0D27A', '#C4ADE4', '#EA9ED2', '#7FD3C8', '#D2AE8C'];

  // [id, name, dark, bg, panel, ink, inkSoft, line, head, headInk, patternColor, accents]
  var rows = [
    ['paper', 'Giấy kem', 0, '#F4EFE4', '#FFFDF7', '#2B2620', '#6B6256', '#CFC4AC', '#3A3128', '#FFF8E7', '#E3D9C4', ACC_A],
    ['mint', 'Bạc hà', 0, '#E3F1E7', '#F7FCF8', '#1E3328', '#4F6B5B', '#B9D6C3', '#2F6B4F', '#F4FBF6', '#CFE5D6', ACC_B],
    ['sky', 'Trời xanh', 0, '#E2EFF8', '#F7FBFE', '#1B2E3F', '#4A6378', '#B7D2E6', '#2D5F8A', '#F5FAFE', '#CDE0EF', ACC_C],
    ['blush', 'Hồng phấn', 0, '#F8E6E6', '#FFF8F7', '#3A2326', '#7A5558', '#EBC5C7', '#A24A5A', '#FFF6F6', '#F0D0D2', ACC_A],
    ['lavender', 'Oải hương', 0, '#EAE5F5', '#FAF8FE', '#29223F', '#5F5680', '#CFC6E8', '#5B4B94', '#FAF8FF', '#DAD2EE', ACC_B],
    ['butter', 'Bơ sữa', 0, '#FAF0C8', '#FFFCEB', '#33290F', '#6E5F30', '#E8D894', '#7A5C00', '#FFFBE6', '#F0E3A8', ACC_C],
    ['sand', 'Cát', 0, '#EADFCC', '#FAF5EA', '#2E261B', '#6A5B45', '#D3C4A8', '#8A6A3E', '#FFFAF0', '#DCCFB6', ACC_A],
    ['peach', 'Đào', 0, '#FBE4D6', '#FFF8F3', '#3B2418', '#7B5642', '#EFC7B0', '#B0553A', '#FFF7F2', '#F2D0BC', ACC_B],
    ['cloud', 'Mây xám', 0, '#E9EDF0', '#FFFFFF', '#1F2933', '#52606D', '#CBD2D9', '#334E68', '#F8FAFC', '#DAE0E5', ACC_C],
    ['midnight', 'Nửa đêm', 1, '#141B2D', '#1E2742', '#EAEFFA', '#A5B2D0', '#34416A', '#8FB2F5', '#101832', '#1C2540', ACC_A],
    ['charcoal', 'Than chì', 1, '#1F1F22', '#2B2B30', '#F0EEE9', '#B0ADA6', '#454549', '#E6C98A', '#231D0E', '#2A2A2E', ACC_B],
    ['forest', 'Rừng sâu', 1, '#17261F', '#21362C', '#E8F2EA', '#A9C2B0', '#35503F', '#8FCB9F', '#0F2118', '#1F3328', ACC_C],
    ['plum', 'Mận chín', 1, '#261A2E', '#33243D', '#F3EAF7', '#BBA6C6', '#4D3A5B', '#D9A5E8', '#2A1233', '#302238', ACC_A],
    ['espresso', 'Cà phê', 1, '#271D17', '#35281F', '#F5EBDD', '#C2AE97', '#50402F', '#E0A878', '#2A170A', '#30241C', ACC_B],
    ['terracotta', 'Đất nung', 0, '#D98E6F', '#F9E9DE', '#2D1710', '#4A2A1D', '#B8694B', '#7A2F1A', '#FFF1E8', '#CC8061', ACC_C],
    ['dusty', 'Xanh bụi', 0, '#8FB0CC', '#EAF2F8', '#15283A', '#223F58', '#6F93B3', '#1F4467', '#F0F6FB', '#82A5C2', ACC_A],
    ['mustard', 'Vàng nghệ', 0, '#E2BE62', '#FBF3D9', '#2E2406', '#45360A', '#BE9A3A', '#5A4300', '#FFF6D6', '#D6B152', ACC_B],
    ['sage', 'Xanh xô thơm', 0, '#A9BFA0', '#EEF4EA', '#1C2B1B', '#2B4428', '#849D7A', '#2F4F2C', '#F1F7EE', '#9BB291', ACC_C],
    // curated palettes: each has its own accent set so subject colours stay in harmony
    ['ivory', 'Ngà', 0, '#F3EEE3', '#FBF8F2', '#1A1A1A', '#6B655B', '#D9D1C1', '#1A1A1A', '#F3EEE3', '#E6DECF',
      ['#E3B7A6', '#AFC3CD', '#B9C6AC', '#E2CD9C', '#C7B6CF', '#D7AEB8', '#A9C8BF', '#D2BDA3']],
    ['mono', 'Đen trắng', 0, '#F4F4F1', '#FFFFFF', '#111111', '#5F5F5F', '#D4D4D0', '#E63B2E', '#FFFFFF', '#E4E4E0',
      ['#EDEDE8', '#E0E0DA', '#F4D8D2', '#D9D9D2', '#E8E8E2', '#F0E2DF', '#E3E3DC', '#DCDCD5']],
    ['matcha', 'Matcha', 0, '#DCE3C8', '#F7F8EF', '#253018', '#5E6B4C', '#C3CDA8', '#5B7A3A', '#F7F8EF', '#CFD8B6',
      ['#C9D9A5', '#E8D9A8', '#B9D3C2', '#E6C3B0', '#D4CDE3', '#A9C79A', '#EBD6C4', '#C7D7D9']],
    ['hoian', 'Hội An', 0, '#F1C84B', '#FFF6DC', '#3A2410', '#6E5530', '#D9A92E', '#B63A2B', '#FFF6DC', '#E6BA3C',
      ['#F2A07B', '#7FB5A6', '#F5D27A', '#E58B7A', '#9CC3B4', '#F3B98C', '#D7C27F', '#B9D1A6']],
    ['sakura', 'Anh đào', 0, '#F6E1E4', '#FFF9F8', '#3B2328', '#85646B', '#EDC6CD', '#D06F86', '#FFFFFF', '#F0CCD3',
      ['#F7C6CF', '#FBE0C3', '#D9E7C6', '#CFE1F2', '#E4D5F2', '#F9D3E0', '#FFE9B8', '#C9E8E1']],
    ['ocean', 'Biển', 0, '#CFE3EC', '#F5FAFC', '#10293A', '#4B6677', '#A9C9D8', '#1D5C7E', '#F5FAFC', '#BCD6E2',
      ['#9CCBE0', '#F5C9A6', '#B5DCC4', '#F2E1A0', '#C7BEE6', '#F3B9B2', '#8ED1C6', '#D9C7AE']],
    ['chalk', 'Bảng đen', 1, '#23352B', '#2C4235', '#F1EFE6', '#B9C2B4', '#4D6656', '#F1EFE6', '#23352B', '#2D4236',
      ['#E9A7A0', '#9FC6E0', '#B9DB9F', '#F2DC8C', '#C9B4E2', '#EBA9CF', '#97D6CB', '#E5C39E']],
    ['noir', 'Đêm mực', 1, '#0F0F10', '#18181A', '#F2EFE9', '#A29D94', '#333336', '#E8D7B0', '#18181A', '#1A1A1C',
      ['#5A3E36', '#2F4A5A', '#3E5240', '#5C5030', '#463A5C', '#5A3449', '#2E5450', '#55463A']],
    ['lotus', 'Sen hồng', 0, '#F3D5D9', '#FFF7F6', '#3A1F27', '#7C5560', '#E3B3BC', '#3F6B4E', '#FFF7F6', '#EAC4CB',
      ['#F4B6C2', '#CFE3C3', '#F7D9B5', '#BFD9E6', '#E2C9EB', '#F7C4B4', '#D3E6A8', '#F2D6E3']]
  ];

  var list = rows.map(function (r) {
    return {
      id: r[0], name: r[1], dark: !!r[2], bg: r[3], panel: r[4], ink: r[5], inkSoft: r[6],
      line: r[7], head: r[8], headInk: r[9], patternColor: r[10], accents: r[11].slice()
    };
  });

  function get(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  TKB.themes = { list: list, get: get };
})();
