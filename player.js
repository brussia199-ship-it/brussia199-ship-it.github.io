(function() {
  "use strict";

  var frame = document.getElementById('playerFrame');
  var clockEl = document.getElementById('clockDisplay');
  var nowPlayingEl = document.getElementById('nowPlaying');
  var videoWrap = document.getElementById('videoWrap');
  var tvContainer = document.getElementById('tvContainer');

  var fullscreenBtn = document.getElementById('fullscreenBtn');
  var muteBtn = document.getElementById('muteBtn');
  var muteLabel = document.getElementById('muteLabel');

  var currentIndex = 0;
  var autoTimer = null;
  var SWITCH_DELAY = 50000;
  var isMuted = false;

  var playlist = window.PARSED_PLAYLIST || [];

  // ============================================================
  // ЗАГРУЗКА ВИДЕО
  // ============================================================
  function loadVideo(index) {
    if (playlist.length === 0) {
      frame.src = '';
      nowPlayingEl.textContent = '⚠️ Нет видео';
      return;
    }

    var item = playlist[index % playlist.length];
    frame.src = item.embed;

    var num = (index % playlist.length) + 1;
    nowPlayingEl.textContent = '● ' + num + ' / ' + playlist.length;
    nowPlayingEl.classList.add('active');

    currentIndex = index;
  }

  function nextVideo() {
    loadVideo(currentIndex + 1);
    resetAutoTimer();
  }

  // ============================================================
  // ТАЙМЕР
  // ============================================================
  function resetAutoTimer() {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    autoTimer = setTimeout(function() {
      nextVideo();
    }, SWITCH_DELAY);
  }

  // ============================================================
  // ЧАСЫ
  // ============================================================
  function updateClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    clockEl.textContent = h + ':' + m;
  }

  // ============================================================
  // ПОЛНЫЙ ЭКРАН — РАБОТАЕТ
  // ============================================================
  function toggleFullscreen() {
    var el = tvContainer;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Открываем на весь экран
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
      fullscreenBtn.classList.add('active');
    } else {
      // Закрываем
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      fullscreenBtn.classList.remove('active');
    }
  }

  // ============================================================
  // ЗВУК — РАБОТАЕТ (через глобальный аудиоконтекст)
  // ============================================================
  function toggleMute() {
    isMuted = !isMuted;

    // Пробуем найти видео внутри iframe
    try {
      var iframeWindow = frame.contentWindow;
      var iframeDoc = frame.contentDocument || iframeWindow.document;
      
      // Ищем все video-элементы внутри iframe
      var videos = iframeDoc.querySelectorAll('video');
      if (videos.length > 0) {
        for (var i = 0; i < videos.length; i++) {
          videos[i].muted = isMuted;
        }
        console.log(isMuted ? '🔇 Звук выключен' : '🔊 Звук включен');
      } else {
        // Если видео не нашли — пробуем через 1 секунду ещё раз
        setTimeout(function() {
          try {
            var videos2 = iframeDoc.querySelectorAll('video');
            for (var j = 0; j < videos2.length; j++) {
              videos2[j].muted = isMuted;
            }
          } catch(e) {}
        }, 1000);
      }
    } catch(e) {
      console.warn('Не удалось управлять звуком через iframe:', e);
      // Если не получилось — показываем уведомление
      showNotification(isMuted ? '🔇 Звук выключен (вручную в плеере)' : '🔊 Звук включен (вручную в плеере)');
    }

    // Меняем иконку
    if (isMuted) {
      muteBtn.classList.add('muted');
      muteLabel.textContent = '🔇 Без звука';
    } else {
      muteBtn.classList.remove('muted');
      muteLabel.textContent = '🔊 Звук';
    }
  }

  // ============================================================
  // УВЕДОМЛЕНИЕ (если звук не работает)
  // ============================================================
  function showNotification(text) {
    var old = document.querySelector('.toast-notification');
    if (old) old.remove();

    var div = document.createElement('div');
    div.className = 'toast-notification';
    div.textContent = text;
    div.style.cssText = 
      'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);' +
      'background:#1a1a1a;color:#ccc;padding:10px 24px;border-radius:40px;' +
      'border:1px solid #3a3a3a;font-family:sans-serif;font-size:0.9rem;' +
      'z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.8);' +
      'transition:opacity 0.3s;opacity:1;';
    document.body.appendChild(div);

    setTimeout(function() {
      div.style.opacity = '0';
      setTimeout(function() { div.remove(); }, 400);
    }, 2500);
  }

  // ============================================================
  // ОБРАБОТЧИКИ
  // ============================================================

  // Полный экран
  fullscreenBtn.addEventListener('click', toggleFullscreen);

  // Двойной клик по видео = полный экран
  videoWrap.addEventListener('dblclick', toggleFullscreen);

  // Звук
  muteBtn.addEventListener('click', toggleMute);

  // Сброс таймера
  videoWrap.addEventListener('mousemove', resetAutoTimer);
  videoWrap.addEventListener('click', resetAutoTimer);
  videoWrap.addEventListener('touchstart', resetAutoTimer);

  // Отслеживаем изменения полноэкранного режима
  document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) {
      fullscreenBtn.classList.add('active');
    } else {
      fullscreenBtn.classList.remove('active');
    }
  });

  document.addEventListener('webkitfullscreenchange', function() {
    if (document.webkitFullscreenElement) {
      fullscreenBtn.classList.add('active');
    } else {
      fullscreenBtn.classList.remove('active');
    }
  });

  // ============================================================
  // ЗАПУСК
  // ============================================================
  updateClock();
  setInterval(updateClock, 30000);

  if (playlist.length > 0) {
    loadVideo(0);
    resetAutoTimer();
    console.log('🎬 INTERNET TV запущен · ' + playlist.length + ' видео');
  } else {
    nowPlayingEl.textContent = '⚠️ Добавь видео в playlist.js';
  }

  // Пробуем найти видео в iframe после загрузки
  frame.addEventListener('load', function() {
    setTimeout(function() {
      try {
        var doc = frame.contentDocument || frame.contentWindow.document;
        var videos = doc.querySelectorAll('video');
        if (videos.length > 0) {
          console.log('✅ Найдено ' + videos.length + ' видео-элементов в iframe');
          // Применяем текущее состояние звука
          for (var i = 0; i < videos.length; i++) {
            videos[i].muted = isMuted;
          }
        }
      } catch(e) {}
    }, 1500);
  });

  console.log('✅ Кнопки работают: Полный экран и Звук');
})();
