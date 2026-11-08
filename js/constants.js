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

    // ===== Лавка: каталог товаров =====
    const SHOP_ITEMS = {
      'frame-red':       { type: 'frame',      name: 'Алые оковы',         desc: 'Алая рамка для портрета героя',     price: 50  },
      'frame-green':     { type: 'frame',      name: 'Изумрудный оберег',  desc: 'Зелёная рамка для портрета героя',  price: 50  },
      'frame-white':     { type: 'frame',      name: 'Белоснежная оправа', desc: 'Простая белая рамка без украшений', price: 50  },
      'frame-black':     { type: 'frame',      name: 'Угольная оправа',    desc: 'Простая чёрная рамка без украшений', price: 50 },
      'frame-black-dash':{ type: 'frame',      name: 'Пунктирный след',    desc: 'Чёрная рамка пунктиром',            price: 50  },
      'frame-black-dot': { type: 'frame',      name: 'Крапчатая тень',     desc: 'Чёрная рамка в крапинку',           price: 50  },

      'bg-embers':    { type: 'background', name: 'Угольная бездна',   desc: 'Тёмный фон с алым узором',           price: 100 },
      'bg-frost':     { type: 'background', name: 'Морозные кружева',  desc: 'Холодный фон в звёздную крапинку',   price: 100 },
      'bg-gold':      { type: 'background', name: 'Золотой рассвет',   desc: 'Чистый золотой фон с градиентом',    price: 100 },
      'bg-violet':    { type: 'background', name: 'Фиалковый сумрак',  desc: 'Чистый фиолетовый фон с градиентом', price: 100 },
      'bg-gray':      { type: 'background', name: 'Пепельный свод',    desc: 'Однотонный тёмно-серый фон',         price: 100 },
      'bg-blue-check':{ type: 'background', name: 'Облачная клетка',   desc: 'Белый фон в светло-синюю клетку',    price: 100 },
      'bg-chess':     { type: 'background', name: 'Турнирный зал',     desc: 'Шахматная клетка',                   price: 100 },

      'theme-white':  { type: 'theme', name: 'Пергамент',         desc: 'Светлая тема всей страницы', price: 150 },
      'theme-red':    { type: 'theme', name: 'Кровавая полночь',  desc: 'Алая тема всей страницы',    price: 150 },
      'theme-nature': { type: 'theme', name: 'Лесной шёпот',      desc: 'Тема в природных тонах',     price: 150 },
      'theme-gothic': { type: 'theme', name: 'Готический собор',  desc: 'Мрачная фиолетовая тема',    price: 150 },
      'theme-angelic':{ type: 'theme', name: 'Ангельский свет',   desc: 'Светлая небесная тема',      price: 150 },
      'theme-pink':   { type: 'theme', name: 'Розовые сны',       desc: 'Милая розовая тема',         price: 150 },
      'theme-blue':   { type: 'theme', name: 'Небесная дымка',    desc: 'Милая голубая тема',         price: 150 }
    };
    const SHOP_GROUPS = [
      { type: 'frame',      title: 'Рамки для портрета' },
      { type: 'background', title: 'Фоны основного экрана' },
      { type: 'theme',      title: 'Темы страницы' }
    ];

    // ===== Достижения =====
    const ACH_REWARD = 300; // монет за каждое достижение

    const ACHIEVEMENTS = [
      { id: 'big-start',        icon: '🌟', name: 'Большое начало',                        desc: 'Повысьте уровень один раз' },
      { id: 'level-5',          icon: '🚶', name: 'Широкими шагами',                       desc: 'Достичь 5 уровня персонажа' },
      { id: 'level-10',         icon: '🚀', name: 'Быстрее! Выше! Сильнее!',               desc: 'Достичь 10 уровня персонажа' },
      { id: 'level-50',         icon: '🗿', name: 'Тяни!',                                 desc: 'Достичь 50 уровня персонажа' },
      { id: 'skill-2',          icon: '📖', name: 'Лучше дочь ефрейтор, чем сын ...', desc: 'Повысьте любой навык до 2 уровня' },
      { id: 'skill-5',          icon: '🛡',  name: 'Я тебя могну',                          desc: 'Повысьте любой навык до 5 уровня' },
      { id: 'skill-10',         icon: '🎼', name: 'Моцарт военного дела',                  desc: 'Повысьте любой навык до 10 уровня' },
      { id: 'quests-regular',   icon: '🔁', name: 'Дисциплина',                            desc: 'Выполнить 10 регулярных заданий' },
      { id: 'quests-common',    icon: '📜', name: 'Не все полезно, что в свиток полезло',   desc: 'Выполнить 10 обычных заданий' },
      { id: 'quests-legendary', icon: '👑', name: 'Легендарный чел',                       desc: 'Выполнить 10 легендарных заданий' },
      { id: 'level-99',         icon: '🔥', name: 'Хватит уже!',                           desc: 'Достичь 99 уровня персонажа',  secret: true },
      { id: 'quests-24h',       icon: '⏱',  name: 'Мамкин мотиватор',                      desc: 'Выполнить 50 заданий за 24 часа', secret: true },
      { id: 'shop-clear',       icon: '🛒', name: 'Закрытие магазина Санлайт',             desc: 'Выкупить все предметы в магазине', secret: true }
    ];
