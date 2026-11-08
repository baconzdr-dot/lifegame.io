import { SAVE_KEY, PORTRAIT_KEY, CELLS, XP_PER_LEVEL, STATS, QUEST_GROUPS, SHOP_ITEMS, ACH_REWARD, ACHIEVEMENTS } from './constants.js';
'use strict';
function hasAch(id) { return state.achievements.includes(id); }


    function questsDoneIn24h() {
      const day = 24 * 3600 * 1000;
      const now = Date.now();
      state.doneLog = state.doneLog.filter(t => now - t < day);
      return state.doneLog.length;
    }

    // Единая точка проверки всех достижений — вызывается после любых событий
    function checkAchievements() {
      try {
      if (state.heroLevel >= 5)  unlockAchievement('level-5');
      if (state.heroLevel >= 10) unlockAchievement('level-10');
      if (state.heroLevel >= 50) unlockAchievement('level-50');
      if (state.heroLevel >= 99) unlockAchievement('level-99');
      if (state.skills.some(sk => levelOf(sk) >= 2))  unlockAchievement('skill-2');
      if (state.skills.some(sk => levelOf(sk) >= 5))  unlockAchievement('skill-5');
      if (state.skills.some(sk => levelOf(sk) >= 10)) unlockAchievement('skill-10');
      if (state.completed.regular   >= 10) unlockAchievement('quests-regular');
      if (state.completed.common    >= 10) unlockAchievement('quests-common');
      if (state.completed.legendary >= 10) unlockAchievement('quests-legendary');
      if (questsDoneIn24h() >= 50) unlockAchievement('quests-24h');
      if (state.owned.length >= Object.keys(SHOP_ITEMS).length) unlockAchievement('shop-clear');
      } catch (e) { console.warn('checkAchievements:', e); }
    }

    const uid = () =>
      (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : Date.now() + '-' + Math.random().toString(36).slice(2, 9);

    // ===== Состояние =====
    function defaultState() {
      return {
        heroName: 'Путник',
        portrait: null,
        coins: 0,
        firstLaunch: true,
        heroLevel: 1,
        xp: 0,
        stats: STATS.map(s => ({ nom: s.nom, acc: s.acc, dat: s.dat, total: 0 })),
        skills: [],
        quests: [],
        journal: [],
        journalDay: null,
        doneLog: [],
        owned: [],
        equipped: { frame: null, background: null, theme: null },
        achievements: [],
        completed: { regular: 0, common: 0, legendary: 0 }
      };
    }

    let state = defaultState();
    const pulses = new Set();
    levelOf = s => 1 + Math.floor(s.total / CELLS);
    cellsOf = s => s.total % CELLS;


    function save() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
      catch (e) { console.warn('Не удалось сохранить прогресс (localStorage):', e); }
    }
    function savePortrait() {
      try {
        if (state.portrait) localStorage.setItem(PORTRAIT_KEY, state.portrait);
        else localStorage.removeItem(PORTRAIT_KEY);
      } catch (e) { console.warn('Не удалось сохранить портрет:', e); }
    }
    function load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.stats)) {
            if (!Array.isArray(parsed.skills)) parsed.skills = [];
            if (!Array.isArray(parsed.quests)) parsed.quests = [];
            if (!Array.isArray(parsed.journal)) parsed.journal = [];
            if (typeof parsed.firstLaunch !== 'boolean') parsed.firstLaunch = false;
            if (typeof parsed.coins !== 'number') parsed.coins = 0;
            if (typeof parsed.heroLevel !== 'number' || !isFinite(parsed.heroLevel) || parsed.heroLevel < 1) parsed.heroLevel = 1;
            if (typeof parsed.xp !== 'number' || !isFinite(parsed.xp) || parsed.xp < 0) parsed.xp = 0;
            if (!Array.isArray(parsed.owned)) parsed.owned = [];
            if (!parsed.equipped || typeof parsed.equipped !== 'object') {
              parsed.equipped = { frame: null, background: null, theme: null };
            }
            if (!Array.isArray(parsed.achievements)) parsed.achievements = [];
            if (!parsed.completed || typeof parsed.completed !== 'object') {
              parsed.completed = { regular: 0, common: 0, legendary: 0 };
            }
            ['regular', 'common', 'legendary'].forEach(k => {
              if (!Array.isArray(parsed.doneLog)) parsed.doneLog = [];
              if (typeof parsed.completed[k] !== 'number' || !isFinite(parsed.completed[k]) || parsed.completed[k] < 0) {
                parsed.completed[k] = 0;
              }
            });
            ['frame', 'background', 'theme'].forEach(slot => {
               id = parsed.equipped[slot];
               item = id ? SHOP_ITEMS[id] : null;
              if (!item || item.type !== slot) parsed.equipped[slot] = null;
            });
            parsed.owned = parsed.owned.filter(id => !!SHOP_ITEMS[id]);
            parsed.achievements = parsed.achievements.filter(id => ACHIEVEMENTS.some(a => a.id === id));
            parsed.journal = parsed.journal.map(e =>
              typeof e === 'string' ? { t: e, c: '' } : { t: String(e.t || ''), c: e.c || '' }
            );
            // Миграция характеристик по имени: прогресс не теряется при расширении списка
            parsed.stats = STATS.map(def => {
               old = parsed.stats.find(s => s && s.nom === def.nom);
              return { nom: def.nom, acc: def.acc, dat: def.dat, total: old ? (old.total || 0) : 0 };
            });
            parsed.stats.forEach(s => delete s._pulse);
            parsed.skills.forEach(s => delete s._pulse);
            state = parsed;
            try {
               p = localStorage.getItem(PORTRAIT_KEY);
              if (p) state.portrait = p;
            } catch (e) {}
            return true;
          }
        }
      } catch (e) {}
      return false;
    }

    function plural(n, one, few, many) {
       m = Math.abs(n) % 100, d = m % 10;
      if (m > 10 && m < 20) return many;
      if (d > 1 && d < 5) return few;
      if (d === 1) return one;
      return many;
    }
     xpWord  = n => `${n} ${plural(n, 'очко', 'очка', 'очков')} опыта`;
     ptsWord = (n, dat) => `${n} ${plural(n, 'очко', 'очка', 'очков')} к ${dat}`;
     cap = s => s[0].toUpperCase() + s.slice(1);

    // ===== Звук =====
    let audioCtx = null;
    function ensureAudio() {
      if (!audioCtx) {
         AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      // Контекст мог уснуть, пока вкладка была в фоне — будим его
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    }
    function note(freq, start, dur, vol) {
       ctx = ensureAudio();
      if (!ctx) return;
       o = ctx.createOscillator();
       g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(start);
      o.stop(start + dur + 0.05);
    }
    function ding() {
       ctx = ensureAudio();
      if (!ctx) return;
       t = ctx.currentTime;
      note(880, t, 0.55, 0.35);
      note(1320, t + 0.05, 0.5, 0.18);
    }
    function fanfare() {
       ctx = ensureAudio();
      if (!ctx) return;
       t = ctx.currentTime;
      note(659, t, 0.5, 0.3);
      note(880, t + 0.12, 0.5, 0.3);
      note(1108, t + 0.24, 0.7, 0.32);
      note(1318, t + 0.36, 0.8, 0.3);
    }
    function achSound() {
       ctx = ensureAudio();
      if (!ctx) return;
       t = ctx.currentTime;
      note(523, t, 0.4, 0.28);
      note(659, t + 0.1, 0.4, 0.28);
      note(784, t + 0.2, 0.5, 0.3);
      note(1047, t + 0.32, 0.8, 0.3);
    }

    // ===== Журнал =====
    function todayKey() {
       d = new Date();
      return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    function checkJournalDay() {
       key = todayKey();
      if (state.journalDay === key) return;
      state.journalDay = key;
      state.journal = [];
      save();
      renderJournal(false);
    }

    function log(text, cls) {
      state.journal.unshift({ t: text, c: cls || '' });
      if (state.journal.length > 40) state.journal.length = 40;
      renderJournal(true);
    }
    function renderJournal(isNew) {
       ul = document.getElementById('journalList');
      ul.innerHTML = '';
      if (!state.journal.length) {
         li = document.createElement('li');
        li.textContent = 'Летопись ждёт первого деяния этого дня…';
        li.style.opacity = '.5';
        li.style.fontStyle = 'italic';
        ul.appendChild(li);
        return;
      }
       fragment = document.createDocumentFragment();
      state.journal.forEach((entry, i) => {
         li = document.createElement('li');
        if (entry.c) li.classList.add('j-' + entry.c);
        li.textContent = entry.t;
        if (isNew && i === 0) li.classList.add('new');
        fragment.appendChild(li);
      });
      ul.appendChild(fragment);
    }

    // ===== Парящие награды =====
    function floatText(text, x, y, cls) {
       el = document.createElement('div');
      el.className = 'float ' + cls;
      el.textContent = text;
      el.style.left = Math.min(x, window.innerWidth - 130) + 'px';
      el.style.top = y + 'px';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    }

    // ===== Изображения =====
    function compressImage(file, cb) {
       reader = new FileReader();
      reader.onload = () => {
         tmp = new Image();
        tmp.onload = () => {
           c = document.createElement('canvas');
          c.width = 256; c.height = 256;
           ctx = c.getContext('2d');
           side = Math.min(tmp.width, tmp.height);
          ctx.drawImage(
            tmp,
            (tmp.width - side) / 2, (tmp.height - side) / 2, side, side,
            0, 0, 256, 256
          );
          cb(c.toDataURL('image/jpeg', 0.85));
        };
        tmp.onerror = () => cb(null);
        tmp.src = reader.result;
      };
      reader.onerror = () => cb(null);
      reader.readAsDataURL(file);
    }

    function bindPortrait(inputId, apply) {
       input = document.getElementById(inputId);
      input.addEventListener('change', () => {
         file = input.files && input.files[0];
        if (!file) return;
        compressImage(file, (data) => {
          if (!data) return;
          state.portrait = data;
          apply();
          savePortrait();
        });
        input.value = '';
      });
    }

    function bindFrame(frameId, inputId) {
       frame = document.getElementById(frameId);
       input = document.getElementById(inputId);
      frame.addEventListener('click', () => input.click());
      frame.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          input.click();
        }
      });
    }

    function renderPortrait() {
       img = document.getElementById('portraitImg');
       ph = document.getElementById('portraitPlaceholder');
       startImg = document.getElementById('startImg');
       startPh = document.getElementById('startPlaceholder');
      if (state.portrait) {
        img.src = state.portrait;
        img.style.display = 'block';
        ph.style.display = 'none';
        startImg.src = state.portrait;
        startImg.style.display = 'block';
        startPh.style.display = 'none';
      } else {
        img.style.display = 'none';
        ph.style.display = 'flex';
        startImg.style.display = 'none';
        startPh.style.display = 'flex';
      }
    }

    // ===== Модальные окна =====
    let lastFocusEl = null;
    function openModal(id) {
      lastFocusEl = document.activeElement;
      document.getElementById(id).classList.remove('hidden');
    }
    function closeModal(id) {
       modal = document.getElementById(id);
      if (modal.classList.contains('hidden')) return;
      modal.classList.add('hidden');
      if (lastFocusEl && typeof lastFocusEl.focus === 'function') lastFocusEl.focus();
      lastFocusEl = null;
    }
    function bindModal(modalId, closeBtnId) {
       modal = document.getElementById(modalId);
      document.getElementById(closeBtnId).addEventListener('click', () => closeModal(modalId));
      modal.addEventListener('click', e => { if (e.target === modal) closeModal(modalId); });
    }

    function openShop() { renderShop(); openModal('shopModal'); }
    function openInventory() { renderInventory(); openModal('invModal'); }
    function openAchievements() { renderAchievements(); openModal('achModal'); }

    // ===== Применение косметики =====
    function applyCosmetics() {
       body = document.body;
       BG_CLASSES = ['bg-embers', 'bg-frost', 'bg-gold', 'bg-violet', 'bg-gray', 'bg-blue-check', 'bg-chess'];
       THEME_CLASSES = ['theme-white', 'theme-red', 'theme-nature', 'theme-gothic', 'theme-angelic', 'theme-pink', 'theme-blue'];
      BG_CLASSES.forEach(c => body.classList.remove(c));
      THEME_CLASSES.forEach(c => body.classList.remove(c));
      if (state.equipped.background) body.classList.add(state.equipped.background);
      if (state.equipped.theme) body.classList.add(state.equipped.theme);

       pf = document.getElementById('portraitFrame');
       sf = document.getElementById('startFrame');
       FRAME_CLASSES = ['frame-red', 'frame-green', 'frame-white', 'frame-black', 'frame-black-dash', 'frame-black-dot'];
      FRAME_CLASSES.forEach(c => { pf.classList.remove(c); sf.classList.remove(c); });
      if (state.equipped.frame) {
        pf.classList.add(state.equipped.frame);
        sf.classList.add(state.equipped.frame);
      }
    }

    // ===== Лавка =====
    function buyItem(id) {
       item = SHOP_ITEMS[id];
      if (!item || state.owned.includes(id)) return;
      if (state.coins < item.price) return;
      state.coins -= item.price;
      state.owned.push(id);
      log(`${state.heroName} купил «${item.name}» за ${item.price} монет`);
      renderCoins(true);
      save();
      renderShop();
      renderInventory();
      ding();
      checkAchievements();
    }

    // Смена косметики в журнал не пишется
    function equipItem(id) {
       item = SHOP_ITEMS[id];
      if (!item || !state.owned.includes(id)) return;
       slot = item.type;
       takingOff = state.equipped[slot] === id;
      state.equipped[slot] = takingOff ? null : id;
      save();
      applyCosmetics();
      renderShop();
      renderInventory();
    }

    function renderShop() {
       container = document.getElementById('shopList');
      document.getElementById('shopCoins').textContent = state.coins;
      container.innerHTML = '';

      SHOP_GROUPS.forEach(gr => {
         title = document.createElement('div');
        title.className = 'shop-group-title';
        title.textContent = gr.title;
        container.appendChild(title);

        Object.keys(SHOP_ITEMS).filter(id => SHOP_ITEMS[id].type === gr.type).forEach(id => {
           item = SHOP_ITEMS[id];
           owned = state.owned.includes(id);

           row = document.createElement('div');
          row.className = 'shop-item';

           info = document.createElement('div');
          info.className = 'si-info';
           nm = document.createElement('div');
          nm.className = 'si-name';
          nm.textContent = item.name;
           ds = document.createElement('div');
          ds.className = 'si-desc';
          ds.textContent = item.desc;
          info.append(nm, ds);
          row.appendChild(info);

          if (owned) {
            // Куплено: метка вместо кнопки — менять косметику можно только в инвентаре
             tag = document.createElement('span');
            tag.className = 'buy-btn owned';
            tag.style.cursor = 'default';
            tag.textContent = 'В инвентаре ✓';
            row.appendChild(tag);
          } else {
             btn = document.createElement('button');
            btn.className = 'buy-btn';
            btn.textContent = `Купить · ${item.price} 🪙`;
            btn.disabled = state.coins < item.price;
            btn.title = state.coins < item.price ? 'Не хватает монет' : 'Купить';
            btn.addEventListener('click', () => buyItem(id));
            row.appendChild(btn);
          }

          container.appendChild(row);
        });
      });
    }

    // ===== Инвентарь: предметы сгруппированы по типам =====
    function renderInventory() {
       container = document.getElementById('invList');
      container.innerHTML = '';

      if (!state.owned.length) {
        container.innerHTML = '<div class="empty-note">Сундук пуст. Заглянь в лавку чудес!</div>';
        return;
      }

      SHOP_GROUPS.forEach(gr => {
         ids = state.owned.filter(id => SHOP_ITEMS[id] && SHOP_ITEMS[id].type === gr.type);
        if (!ids.length) return;

         title = document.createElement('div');
        title.className = 'shop-group-title';
        title.textContent = gr.title;
        container.appendChild(title);

        ids.forEach(id => {
           item = SHOP_ITEMS[id];
           equipped = state.equipped[item.type] === id;

           row = document.createElement('div');
          row.className = 'shop-item';

           info = document.createElement('div');
          info.className = 'si-info';
           nm = document.createElement('div');
          nm.className = 'si-name';
          nm.textContent = item.name;
           ds = document.createElement('div');
          ds.className = 'si-desc';
          ds.textContent = item.desc;
          info.append(nm, ds);
          row.appendChild(info);

           btn = document.createElement('button');
          btn.className = 'buy-btn' + (equipped ? ' owned' : '');
          btn.textContent = equipped ? 'Снять' : 'Надеть';
          btn.addEventListener('click', () => equipItem(id));
          row.appendChild(btn);

          container.appendChild(row);
        });
      });
    }

    // ===== Достижения =====
    function renderAchievements() {
       container = document.getElementById('achList');
      container.innerHTML = '';

      ACHIEVEMENTS.forEach(a => {
         unlocked = state.achievements.includes(a.id);
        if (a.secret && !unlocked) return; // секретные скрыты до получения

         row = document.createElement('div');
        row.className = 'ach-item ' + (unlocked ? 'unlocked' : 'locked');

         icon = document.createElement('div');
        icon.className = 'ach-icon';
        icon.textContent = a.icon;
        row.appendChild(icon);

         info = document.createElement('div');
        info.className = 'si-info';
         nm = document.createElement('div');
        nm.className = 'si-name';
        nm.textContent = a.name;
         ds = document.createElement('div');
        ds.className = 'si-desc';
        ds.textContent = (unlocked ? a.desc : 'Условие: ' + a.desc) + ` · Награда: ${ACH_REWARD} 🪙`;
        info.append(nm, ds);
        row.appendChild(info);

        container.appendChild(row);
      });

      if (ACHIEVEMENTS.some(a => a.secret && !state.achievements.includes(a.id))) {
         note = document.createElement('div');
        note.className = 'empty-note';
        note.textContent = 'В летописи есть и тайные деяния — узнаешь о них, когда совершишь.';
        container.appendChild(note);
      }
    }

    function showToast(ach, reward) {
       el = document.createElement('div');
      el.className = 'ach-toast';
      el.setAttribute('role', 'status');

       icon = document.createElement('div');
      icon.className = 'ach-icon';
      icon.textContent = ach.icon;

       info = document.createElement('div');
       capEl = document.createElement('div');
      capEl.className = 'ach-cap';
      capEl.textContent = 'Достижение получено';
       title = document.createElement('div');
      title.className = 'ach-title';
      title.textContent = ach.name;
       desc = document.createElement('div');
      desc.className = 'ach-desc';
      desc.textContent = ach.desc;
      info.append(capEl, title, desc);

      if (reward) {
         rw = document.createElement('div');
        rw.className = 'ach-desc';
        rw.style.color = 'var(--gold-bright)';
        rw.style.fontWeight = 'bold';
        rw.textContent = `Награда: +${reward} 🪙`;
        info.append(rw);
      }

      el.append(icon, info);
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4800);
    }

    function unlockAchievement(id) {
      if (state.achievements.includes(id)) return;
       ach = ACHIEVEMENTS.find(a => a.id === id);
      if (!ach) return;
      state.achievements.push(id);
      state.coins += ACH_REWARD;
      save();
      renderCoins(true);
      showToast(ach, ACH_REWARD);
      achSound();
      log(`${state.heroName} получил достижение «${ach.name}» и ${ACH_REWARD} монет!`, 'ach');
      renderAchievements();
    }


    // ===== Стартовая страница =====
    function showStartScreen() {
      const screen = document.getElementById('startScreen');
      const nameInput = document.getElementById('startNameInput');
      screen.classList.remove('hidden');
      nameInput.value = '';
      setTimeout(() => nameInput.focus(), 50);
    }

    function setupStartScreen() {
      const screen = document.getElementById('startScreen');
      const nameInput = document.getElementById('startNameInput');
      const btn = document.getElementById('startBtn');

      if (!state.firstLaunch) {
        screen.classList.add('hidden');
        return;
      }
      screen.classList.remove('hidden');

      bindFrame('startFrame', 'startPortraitInput');

      const begin = () => {
        const name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        state.heroName = name;
        state.firstLaunch = false;
        save();
        renderHeroName();
        screen.classList.add('hidden');
        ensureAudio();
        openIntro(); // инструкция сразу после старта
      };

      btn.addEventListener('click', begin);
      nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') begin(); });
      bindPortrait('startPortraitInput', renderPortrait);
    }

    function renderHeroName() {
      document.getElementById('heroNameDisplay').textContent = state.heroName;
    }

    // ===== Инструкция =====
    function openIntro() {
      drawIntroRadar();
      openModal('introModal');
    }

    // Миниатюра «паутинки» для шага 3 инструкции
    function drawIntroRadar() {
      const canvas = document.getElementById('introRadar');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) / 2 - 40;
      const n = 6;
      const values = [0.75, 0.45, 0.6, 0.3, 0.55, 0.4];
      const labels = ['сила', 'вын.', 'инт.', 'лов.', 'хар.', 'тел.'];

      ctx.clearRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(212,169,78,.25)';
      ctx.lineWidth = 1;
      for (let ring = 1; ring <= 5; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = (i % n) * (2 * Math.PI / n) - Math.PI / 2;
          const r = R * ring / 5;
          const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(212,169,78,.35)';
      const labelR = R + 22;
      values.forEach((_, i) => {
        const a = i * (2 * Math.PI / n) - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
        ctx.stroke();

        ctx.fillStyle = '#e8d9b5';
        ctx.font = '10px "Bookman Old Style", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labels[i], cx + labelR * Math.cos(a), cy + labelR * Math.sin(a));
      });

      const poly = values.map((v, i) => {
        const a = i * (2 * Math.PI / n) - Math.PI / 2;
        const r = R * v;
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      });

      const grad = ctx.createRadialGradient(cx, cy, 6, cx, cy, R);
      grad.addColorStop(0, 'rgba(245,212,122,.45)');
      grad.addColorStop(1, 'rgba(163,59,46,.35)');

      ctx.beginPath();
      poly.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#f5d47a';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(245,212,122,.8)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      poly.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#f5d47a';
        ctx.shadowColor = 'rgba(245,212,122,.9)';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // ===== Счётчик выполненных заданий =====
    const COUNTER_DEFS = [
      { key: 'regular',   icon: '🔁', label: 'Регулярные' },
      { key: 'common',    icon: '⭐', label: 'Обычные' },
      { key: 'legendary', icon: '👑', label: 'Легендарные' }
    ];

    function renderQuestCounter() {
      const box = document.getElementById('questCounter');
      box.innerHTML = '';
      COUNTER_DEFS.forEach(d => {
        const chip = document.createElement('div');
        chip.className = 'qc-chip qc-' + d.key;
        chip.title = d.label + ' — выполнено: ' + state.completed[d.key];

        const ic = document.createElement('span');
        ic.className = 'qc-icon';
        ic.textContent = d.icon;
        const val = document.createElement('span');
        val.className = 'qc-value';
        val.textContent = String(state.completed[d.key]);
        chip.append(ic, val);
        box.appendChild(chip);
      });
    }

    // ===== Монеты =====
    function renderCoins(bump) {
      document.getElementById('coinsValue').textContent = state.coins;
      document.getElementById('shopCoins').textContent = state.coins;
      if (bump) {
        const box = document.getElementById('coinsBox');
        box.classList.remove('bump');
        void box.offsetWidth;
        box.classList.add('bump');
      }
    }

    // ===== Строка характеристики/навыка =====
    function buildStatRow(item, pulseKey, onDelete) {
      const row = document.createElement('div');
      row.className = 'stat-row';

      const name = document.createElement('div');
      name.className = 'stat-name';
      name.textContent = item.nom ? cap(item.nom) : item.name;

      const pulse = pulses.has(pulseKey);
      const orb = document.createElement('div');
      orb.className = 'level-orb' + (pulse ? ' pulse' : '');
      if (pulse) pulses.delete(pulseKey); // пульс «сгорает» при отрисовке

      const label = document.createElement('span');
      label.className = 'lvl-label';
      label.textContent = 'ур.';
      const val = document.createElement('span');
      val.className = 'lvl-value';
      val.textContent = String(levelOf(item));
      orb.append(label, val);

      const cells = document.createElement('div');
      cells.className = 'cells';
      const filled = cellsOf(item);
      for (let i = 0; i < CELLS; i++) {
        const c = document.createElement('div');
        c.className = 'cell' + (i < filled ? ' filled' : '');
        cells.appendChild(c);
      }

      row.append(name, orb, cells);
      if (onDelete) row.appendChild(onDelete);
      return row;
    }

    // ===== Кузня характеристик =====
    function renderStats() {
      const container = document.getElementById('stats');
      container.innerHTML = '';
      const fragment = document.createDocumentFragment();
      state.stats.forEach(s => {
        fragment.appendChild(buildStatRow(s, 'stat:' + s.nom));
      });
      container.appendChild(fragment);
    }

    function gainStatPoints(s, pts) {
      const before = levelOf(s);
      s.total += pts;
      const after = levelOf(s);
      if (after > before) {
        log(`${state.heroName} повысил ${s.nom} до ${after} уровня`, 'stat');
        ding();
        pulses.add('stat:' + s.nom);
        startRadar();
      }
    }

    // ===== Гримуар навыков =====
    function renderSkills() {
      const container = document.getElementById('skills');
      container.innerHTML = '';

      if (!state.skills.length) {
        container.innerHTML = '<div class="empty-note">Гримуар пуст. Впиши первый навык!</div>';
        return;
      }

      const fragment = document.createDocumentFragment();
      state.skills.forEach(sk => {
        const del = document.createElement('button');
        del.className = 'row-del';
        del.textContent = '✕';
        del.title = 'Вычеркнуть навык';
        del.setAttribute('aria-label', 'Вычеркнуть навык ' + sk.name);
        del.addEventListener('click', () => {
          state.skills = state.skills.filter(x => x.id !== sk.id);
          state.quests.forEach(q => { if (q.skill === sk.id) q.skill = null; });
          save();
          renderSkills();
          renderQuestMaker();
        });

        fragment.appendChild(buildStatRow(sk, 'skill:' + sk.id, del));
      });
      container.appendChild(fragment);
    }

    function gainSkillPoints(sk, pts) {
      const before = levelOf(sk);
      sk.total += pts;
      const after = levelOf(sk);
      if (after > before) {
        log(`${state.heroName} повысил навык «${sk.name}» до ${after} уровня`, 'stat');
        ding();
        pulses.add('skill:' + sk.id);
         }
        checkAchievements();
      }

    function addSkill() {
      const input = document.getElementById('skillText');
      const name = input.value.trim();
      if (!name) { input.focus(); return; }
      if (state.skills.some(sk => sk.name.toLowerCase() === name.toLowerCase())) {
        input.focus(); return;
      }
      state.skills.push({ id: uid(), name, total: 0 });
      input.value = '';
      save();
      renderSkills();
      renderQuestMaker();
    }

    // ===== Паутина =====
    let disp = state.stats.map(() => 0);

    function targetValue(s) {
      const maxLevel = Math.max(5, ...state.stats.map(levelOf));
      const v = levelOf(s) + cellsOf(s) / CELLS;
      return v / maxLevel;
    }

    function sizeCanvas() {
      const canvas = document.getElementById('radar');
      const wrap = document.getElementById('radarWrap');
      const size = Math.round(
        Math.max(280, Math.min(wrap.clientWidth - 8, window.innerHeight * 0.55, 760))
      );
      if (canvas.width !== size) {
        canvas.width = size;
        canvas.height = size;
      }
    }

    function drawRadar() {
      const canvas = document.getElementById('radar');
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2;
      const R = Math.min(W, H) / 2 - Math.max(34, W * 0.12);
      const n = state.stats.length;
      const labelR = R + Math.max(20, W * 0.055);
      const fontSize = Math.max(11, Math.round(W * 0.028));

      ctx.clearRect(0, 0, W, H);

      const maxLevel = Math.max(5, ...state.stats.map(levelOf));

      ctx.strokeStyle = 'rgba(212,169,78,.25)';
      ctx.lineWidth = 1;
      for (let ring = 1; ring <= maxLevel; ring++) {
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = (i % n) * (2 * Math.PI / n) - Math.PI / 2;
          const r = R * ring / maxLevel;
          const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(212,169,78,.35)';
      state.stats.forEach((s, i) => {
        const a = i * (2 * Math.PI / n) - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
        ctx.stroke();

        const lx = cx + labelR * Math.cos(a);
        const ly = cy + labelR * Math.sin(a);
        ctx.fillStyle = '#e8d9b5';
        ctx.font = `${fontSize}px "Bookman Old Style", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${s.nom} [${levelOf(s)}]`, lx, ly);
      });

      const poly = state.stats.map((s, i) => {
        const a = i * (2 * Math.PI / n) - Math.PI / 2;
        const r = R * disp[i];
        return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      });

      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
      grad.addColorStop(0, 'rgba(245,212,122,.45)');
      grad.addColorStop(1, 'rgba(163,59,46,.35)');

      ctx.beginPath();
      poly.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#f5d47a';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(245,212,122,.8)';
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.shadowBlur = 0;

      poly.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#f5d47a';
        ctx.shadowColor = 'rgba(245,212,122,.9)';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // Анимация радара крутится только пока есть движение
    let radarRunning = false;
    function radarTick() {
      sizeCanvas();
      let moving = false;
      state.stats.forEach((s, i) => {
        const target = targetValue(s);
        const diff = target - disp[i];
        if (Math.abs(diff) > 0.002) {
          disp[i] += diff * 0.12;
          moving = true;
        } else {
          disp[i] = target;
        }
      });
      if (moving) {
        drawRadar();
        requestAnimationFrame(radarTick);
      } else {
        radarRunning = false;
      }
    }
    function startRadar() {
      if (radarRunning) return;
      radarRunning = true;
      radarTick();
    }
    function redrawRadar() {
      sizeCanvas();
      drawRadar();
    }

    // ===== Уровень и опыт героя =====
    function renderHero() {
      document.getElementById('heroLevelValue').textContent = state.heroLevel;
      document.getElementById('xpFill').style.width = (state.xp / XP_PER_LEVEL * 100) + '%';
      document.getElementById('xpText').textContent = `Опыт: ${state.xp} / ${XP_PER_LEVEL}`;
    }

        function gainXp(amount) {
      state.xp += amount;
      while (state.xp >= XP_PER_LEVEL) {
        state.xp -= XP_PER_LEVEL;
        state.heroLevel++;
        log(`${state.heroName} повысил уровень до ${state.heroLevel}`, 'gold');
        fanfare();
      }
      renderHero();
      const orb = document.getElementById('heroOrb');
      orb.classList.remove('pulse');
      void orb.offsetWidth;
      orb.classList.add('pulse');
           }
      checkAchievements();
    

    // ===== Задания =====
    function renderQuestMaker() {
      const statSel = document.getElementById('questStat');
      statSel.innerHTML = '';
      state.stats.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nom;
        opt.textContent = cap(s.nom);
        statSel.appendChild(opt);
      });

      const skillSel = document.getElementById('questSkill');
      const prev = skillSel.value;
      skillSel.innerHTML = '';
      const none = document.createElement('option');
      none.value = '';
      none.textContent = 'Навык: никакой';
      skillSel.appendChild(none);
      state.skills.forEach(sk => {
        const opt = document.createElement('option');
        opt.value = sk.id;
        opt.textContent = 'Навык: ' + sk.name;
        skillSel.appendChild(opt);
      });
      if ([...skillSel.options].some(o => o.value === prev)) skillSel.value = prev;
    }

    // Ближайшая полуночь ПОСЛЕ момента ts — по локальным часам устройства
    function nextMidnight(ts) {
      const d = new Date(ts);
      d.setHours(24, 0, 0, 0);
      return d.getTime();
    }

    function remainingTime(doneAt) {
      const left = Math.max(0, nextMidnight(doneAt) - Date.now());
      if (left <= 0) return 'обновляется сейчас';
      const h = Math.floor(left / 3600000);
      const m = Math.floor((left % 3600000) / 60000);
      if (h === 0 && m === 0) return 'обновится меньше чем через минуту';
      return `обновится в 00:00 через ${h} ч ${m} мин`;
    }

    function buildQuestRow(q) {
      const rar = RARITIES[q.rarity];
      const row = document.createElement('div');
      row.className = `quest r-${q.rarity}` + (q.done ? ' done' : '');

      const checkWrap = document.createElement('label');
      checkWrap.className = 'q-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = 'chk-' + q.id;
      input.checked = q.done;
      input.disabled = q.done;
      input.addEventListener('change', () => completeQuest(q, row));
      checkWrap.appendChild(input);
      row.appendChild(checkWrap);

      const body = document.createElement('label');
      body.className = 'q-body';
      body.htmlFor = 'chk-' + q.id;
      const text = document.createElement('div');
      text.className = 'q-text';
      text.textContent = q.text;
      const stat = state.stats.find(s => s.nom === q.stat);
      const skill = q.skill ? state.skills.find(sk => sk.id === q.skill) : null;

      const meta = document.createElement('div');
      meta.className = 'q-meta';
      const badge = document.createElement('span');
      badge.className = 'badge r-' + q.rarity;
      badge.textContent = cap(rar.adj);
      meta.appendChild(badge);
      meta.appendChild(document.createTextNode(
        `${xpWord(rar.xp)} · ${ptsWord(rar.pts, stat ? stat.dat : '')}`
      ));
      if (q.skill && skill) {
        meta.appendChild(document.createTextNode(' · '));
        const skillSpan = document.createElement('span');
        skillSpan.className = 'q-skill';
        skillSpan.textContent = `+1 к навыку «${skill.name}»`;
        meta.appendChild(skillSpan);
      }
      body.append(text, meta);

      if (q.done && rar.repeat) {
        const timer = document.createElement('div');
        timer.className = 'q-timer';
        timer.dataset.doneAt = q.doneAt;
        timer.textContent = remainingTime(q.doneAt);
        body.appendChild(timer);
      } else if (q.done) {
        const t = document.createElement('div');
        t.className = 'q-timer';
        t.textContent = 'выполнено';
        body.appendChild(t);
      }
      row.appendChild(body);

      const del = document.createElement('button');
      del.className = 'q-del';
      del.textContent = '✕';
      del.title = 'Убрать задание из свитка';
      del.setAttribute('aria-label', 'Убрать задание: ' + q.text);
      del.addEventListener('click', () => {
        state.quests = state.quests.filter(x => x.id !== q.id);
        save();
        renderQuests();
      });
      row.appendChild(del);

      return row;
    }

    function renderQuests() {
      const container = document.getElementById('questList');
      container.innerHTML = '';

      if (!state.quests.length) {
        container.innerHTML = '<div class="empty-note">Свиток пуст. Начертай первое задание!</div>';
        return;
      }

      QUEST_GROUPS.forEach(gr => {
        const list = state.quests
          .filter(q => q.rarity === gr.key)
          .sort((a, b) => (a.done === b.done) ? 0 : (a.done ? 1 : -1));
        if (!list.length) return;

        const title = document.createElement('div');
        title.className = 'q-group-title';
        title.textContent = gr.title;
        container.appendChild(title);

        const fragment = document.createDocumentFragment();
        list.forEach(q => fragment.appendChild(buildQuestRow(q)));
        container.appendChild(fragment);
      });
    }

    function completeQuest(q, row) {
      if (q.done) return;
      const rar = RARITIES[q.rarity];
      q.done = true;
      if (rar.repeat) q.doneAt = Date.now();

      const stat = state.stats.find(s => s.nom === q.stat);
      const skill = q.skill ? state.skills.find(sk => sk.id === q.skill) : null;

      state.completed[q.rarity] = (state.completed[q.rarity] || 0) + 1;
      renderQuestCounter();
      state.doneLog.push(Date.now());

      if (row) {
        const rect = row.getBoundingClientRect();
        row.classList.add('flash');
        floatText(`+${rar.xp} опыта`, rect.left + 90, rect.top + 4, 'gold');
        floatText(`+${rar.pts} к ${stat ? stat.dat : ''}`, rect.left + 90, rect.top + 30, rar.floatClass);
        floatText(`+${rar.xp} 🪙`, rect.left + 90, rect.top + 56, 'gold');
        if (skill) floatText(`+1 к «${skill.name}»`, rect.left + 90, rect.top + 82, 'blue');
      }

      gainXp(rar.xp);
      state.coins += rar.xp;
      renderCoins(true);
      if (stat) gainStatPoints(stat, rar.pts);
      if (skill) gainSkillPoints(skill, 1);

      let msg = `${state.heroName} выполнил ${rar.adj} задание "${q.text}", получил ${xpWord(rar.xp)}`;
      if (stat) msg += ` и повысил ${stat.acc} на ${plural(rar.pts, 'очко', 'очка', 'очков')}`;
      if (skill) msg += (stat ? ' и навык' : ' и повысил навык') + ` «${skill.name}» на ${plural(1, 'очко', 'очка', 'очков')}`;
      msg += '.';
      log(msg, q.rarity === 'legendary' ? 'legend' : '');

      save();
      checkAchievements();

      if (rar.repeat) {
        setTimeout(() => { renderStats(); renderSkills(); renderQuests(); renderJournal(false); }, 550);
      } else {
        setTimeout(() => {
          if (row) row.classList.add('vanish');
        }, 500);
        setTimeout(() => {
          state.quests = state.quests.filter(x => x.id !== q.id);
          save();
          renderStats(); renderSkills(); renderQuests(); renderJournal(false);
        }, 1150);
      }
    }

    function addQuest() {
      const textInput = document.getElementById('questText');
      const text = textInput.value.trim();
      if (!text) { textInput.focus(); return; }

      const q = {
        id: uid(),
        text,
        stat: document.getElementById('questStat').value,
        rarity: document.getElementById('questRarity').value,
        skill: document.getElementById('questSkill').value || null,
        done: false,
        doneAt: null
      };
      const rar = RARITIES[q.rarity];
      const stat = state.stats.find(s => s.nom === q.stat);
      const skill = q.skill ? state.skills.find(sk => sk.id === q.skill) : null;
      let msg = `${state.heroName} получил ${rar.adj} задание "${q.text}", ${xpWord(rar.xp)}, ${ptsWord(rar.pts, stat ? stat.dat : '')}`;
      if (skill) msg += `, +1 ${plural(1, 'очко', 'очка', 'очков')} к навыку «${skill.name}»`;
      log(msg + '.');

      state.quests.push(q);
      textInput.value = '';
      save();
      renderQuests();
    }

    function tick() {
      let changed = false;
      const now = Date.now();
      state.quests.forEach(q => {
        // Обнуление регулярных заданий — после полуночи по часам устройства
        if (q.done && RARITIES[q.rarity].repeat && now >= nextMidnight(q.doneAt)) {
          q.done = false;
          q.doneAt = null;
          changed = true;
        }
      });
      document.querySelectorAll('.q-timer[data-done-at]').forEach(el => {
        el.textContent = remainingTime(+el.dataset.doneAt);
      });
      if (changed) { save(); renderQuests(); }

      checkJournalDay();
    }

        // ===== Кнопка обнуления =====
    function doReset() {
      try {
        localStorage.removeItem(SAVE_KEY);
        localStorage.removeItem(PORTRAIT_KEY);
      } catch (e) {}
      state = defaultState();
      disp = state.stats.map(() => 0);
      pulses.clear();
      renderPortrait();
      renderHeroName();
      renderCoins(false);
      applyCosmetics();
      renderStats();
      renderSkills();
      renderHero();
      renderQuestMaker();
      renderQuests();
      renderJournal(false);
      renderQuestCounter();
      redrawRadar();
      showStartScreen();
    }

    // ===== Выпадающее меню =====
    function setupMenu() {
      const btn = document.getElementById('menuBtn');
      const drop = document.getElementById('menuDrop');

      btn.addEventListener('click', e => {
        e.stopPropagation();
        drop.classList.toggle('hidden');
      });
      document.addEventListener('click', e => {
        if (!drop.classList.contains('hidden') && !drop.contains(e.target) && e.target !== btn) {
          drop.classList.add('hidden');
        }
      });

      document.getElementById('helpBtn').addEventListener('click', () => {
        drop.classList.add('hidden');
        openIntro();
      });
      document.getElementById('devBtn').addEventListener('click', () => {
        drop.classList.add('hidden');
        openDev();
      });

      // Обнуление — с тем же подтверждением в два клика, что было раньше
      const resetBtn = document.getElementById('resetBtn');
      let armed = false, timer = null;
      resetBtn.addEventListener('click', () => {
        if (!armed) {
          armed = true;
          resetBtn.textContent = '🗑 Точно обнулить?';
          timer = setTimeout(() => {
            armed = false;
            resetBtn.textContent = '🗑 Обнулить весь прогресс';
          }, 3000);
        } else {
          clearTimeout(timer);
          armed = false;
          resetBtn.textContent = '🗑 Обнулить весь прогресс';
          drop.classList.add('hidden');
          doReset();
        }
      });
    }

    // ===== Режим разработчика =====
    const DEV_PASS = 'd8t@ng&';

    function openDev() { renderDevControls(); openModal('devModal'); }

    function renderDevControls() {
      // Пароль спрашиваем заново при каждом открытии
      document.getElementById('devLock').classList.remove('hidden');
      document.getElementById('devPanel').classList.add('hidden');
      const pass = document.getElementById('devPass');
      pass.value = '';

      const statSel = document.getElementById('devStat');
      statSel.innerHTML = '';
      state.stats.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.nom;
        opt.textContent = cap(s.nom);
        statSel.appendChild(opt);
      });

      const skillSel = document.getElementById('devSkill');
      skillSel.innerHTML = '';
      if (!state.skills.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Нет навыков';
        opt.disabled = true;
        skillSel.appendChild(opt);
      } else {
        state.skills.forEach(sk => {
          const opt = document.createElement('option');
          opt.value = sk.id;
          opt.textContent = sk.name;
          skillSel.appendChild(opt);
        });
      }
    }

    function devUnlock() {
      const input = document.getElementById('devPass');
      if (input.value === DEV_PASS) {
        document.getElementById('devLock').classList.add('hidden');
        document.getElementById('devPanel').classList.remove('hidden');
        input.value = '';
        input.blur();
      } else {
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        input.value = '';
        input.focus();
      }
    }

    function devReadNum(id) {
      const n = parseInt(document.getElementById(id).value, 10);
      return (isFinite(n) && n > 0) ? Math.min(n, 100000) : null;
    }

    function devAddCoins() {
      const n = devReadNum('devCoins');
      if (!n) return;
      state.coins += n;
      renderCoins(true);
      log(`${state.heroName} получил ${n} ${plural(n, 'монету', 'монеты', 'монет')} (сила разработчика)`, 'gold');
      save();
      checkAchievements();
    }

    function devAddLevel() {
      const n = devReadNum('devLevel');
      if (!n) return;
      state.heroLevel = Math.min(state.heroLevel + n, 999);
      log(`${state.heroName} повысил уровень до ${state.heroLevel}`, 'gold');
      renderHero();
      save();
      checkAchievements();
    }

    function devAddStat() {
      const n = devReadNum('devStatPts');
      const stat = state.stats.find(s => s.nom === document.getElementById('devStat').value);
      if (!n || !stat) return;
      gainStatPoints(stat, n);
      renderStats();
      save();
    }

    function devAddSkill() {
      const n = devReadNum('devSkillPts');
      const skill = state.skills.find(sk => sk.id === document.getElementById('devSkill').value);
      if (!n || !skill) return;
      gainSkillPoints(skill, n);
      renderSkills();
      save();
    }

    function setupDev() {
      bindModal('devModal', 'devClose');
      document.getElementById('devUnlock').addEventListener('click', devUnlock);
      document.getElementById('devPass').addEventListener('keydown', e => {
        if (e.key === 'Enter') devUnlock();
      });
      document.getElementById('devAddCoins').addEventListener('click', devAddCoins);
      document.getElementById('devAddLevel').addEventListener('click', devAddLevel);
      document.getElementById('devAddStat').addEventListener('click', devAddStat);
      document.getElementById('devAddSkill').addEventListener('click', devAddSkill);
    }
 

    // ===== Инициализация =====
    function init() {
      load();

      setupStartScreen();
      bindPortrait('portraitInput', renderPortrait);
      bindFrame('portraitFrame', 'portraitInput');

      document.getElementById('addQuestBtn').addEventListener('click', addQuest);
      document.getElementById('questText').addEventListener('keydown', e => {
        if (e.key === 'Enter') addQuest();
      });
      document.getElementById('addSkillBtn').addEventListener('click', addSkill);
      document.getElementById('skillText').addEventListener('keydown', e => {
        if (e.key === 'Enter') addSkill();
      });

      document.getElementById('shopBtn').addEventListener('click', openShop);
      document.getElementById('invBtn').addEventListener('click', openInventory);
      document.getElementById('achBtn').addEventListener('click', openAchievements);
      document.getElementById('introDoneBtn').addEventListener('click', () => closeModal('introModal'));
      document.getElementById('introClose').addEventListener('click', () => closeModal('introModal'));
      bindModal('shopModal', 'shopClose');
      bindModal('invModal', 'invClose');
      bindModal('achModal', 'achClose');
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          closeModal('shopModal');
          closeModal('invModal');
          closeModal('achModal');
          closeModal('introModal');
          closeModal('devModal');
        }
      });

      setupMenu();
      setupDev();
      renderPortrait();
      renderHeroName();
      renderCoins(false);
      applyCosmetics();
      renderQuestMaker();
      renderStats();
      renderSkills();
      renderHero();
      renderQuests();
      renderJournal(false);
      renderQuestCounter();
      startRadar();
      checkAchievements();

      // Таймеры меняются раз в минуту — тикаем раз в минуту, а не каждую секунду
      setInterval(tick, 60000);
      // Возврат на вкладку: сразу обновляем таймеры и радар
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          tick();
          redrawRadar();
        }
      });

      window.addEventListener('resize', redrawRadar);
      window.addEventListener('orientationchange', redrawRadar);
    }

    init();
