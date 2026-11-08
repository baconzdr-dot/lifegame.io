'use strict';

    let state = defaultState();

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
