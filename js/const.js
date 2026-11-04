 // ===== Константы =====
    const SAVE_KEY = 'rpgHeroSave_v3';
    const PORTRAIT_KEY = 'rpgHeroPortrait_v3';
    const CELLS = 10;
    const XP_PER_LEVEL = 100;

    const STATS = [
      { nom: 'сила',         acc: 'силу',         dat: 'силе' },
      { nom: 'выносливость', acc: 'выносливость', dat: 'выносливости' },
      { nom: 'интеллект',    acc: 'интеллект',    dat: 'интеллекту' },
      { nom: 'ловкость',     acc: 'ловкость',     dat: 'ловкости' },
      { nom: 'харизма',      acc: 'харизму',      dat: 'харизме' },
      { nom: 'телосложение', acc: 'телосложение', dat: 'телосложению' }
    ];

    const RARITIES = {
      regular:   { adj: 'регулярное',  xp: 10,  pts: 1,  repeat: true,  floatClass: 'green'  },
      common:    { adj: 'обычное',     xp: 30,  pts: 3,  repeat: false, floatClass: 'gold'   },
      legendary: { adj: 'легендарное', xp: 100, pts: 10, repeat: false, floatClass: 'purple' }
    };

    const QUEST_GROUPS = [
      { key: 'legendary', title: 'Легендарные — одноразовые' },
      { key: 'common',    title: 'Обычные — одноразовые' },
      { key: 'regular',   title: 'Регулярные — обновляются после 00:00' }
    ];
