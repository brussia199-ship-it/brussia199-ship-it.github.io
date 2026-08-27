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

  var playlist = window.PARSED_PLAYLIST || [];

  // ============================================================
  // СОСТОЯНИЕ (получаем с сервера)
  // ============================================================
  var currentIndex = 0;
  var currentTime = 0;
  var serverTimeOffset = 0;
  var isSynced = false;

  // Адрес сервера (если не на локальном сервере — поменяй)
  var API_URL = 'state.php';

  // ============================================================
  // ЗАГРУЗКА СОСТОЯНИЯ С СЕРВЕРА
  // ============================================================
  function fetchState() {
    fetch(API_URL + '?action=get&t=' + Date.now())
      .then(function(response) { return response.json(); })
      .then(function(state) {
        if (state && state.index !== undefined) {
          currentIndex = state.index;
          currentTime = state.time || 0;
          serverTimeOffset = Date.now() - (state.updated * 1000);
          isSynced = true;
          
          console.log('📡 Состояние с сервера: видео #' + (currentIndex + 1) + 
                      ', время: ' + Math.floor(currentTime) + 'с');
          
          // Загружаем видео
          loadVideo(currentIndex, true);
        }
      })
      .catch(function(err) {
        console.warn('⚠️ Не удалось получить состояние с сервера:', err);
        // Если сервер недоступен — начинаем с первого видео
        currentIndex = 0;
        currentTime = 0;
        loadVideo(0, false);
      });
  }

  // ============================================================
  // ОТПРАВКА СОСТОЯНИЯ НА СЕРВЕР (администратор)
  // ============================================================
  function setState(index, time, key) {
    var url = API_URL + '?action=set&index=' + index + '&time=' + time + '&key=' + key;
    fetch(url)
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.status === 'ok') {
          console.log('✅ Состояние обновлено на сервере');
        } else {
          console.warn('⚠️ Ошибка обновления:', data.message);
        }
      })
      .catch(function(err) {
        console.warn('⚠️ Не удалось обновить состояние:', err);
      });
  }

  // ============================================================
  // ЗАГРУЗКА ВИДЕО
  // ============================================================
  function loadVideo(index, keepPosition) {
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

    // Пытаемся восстановить позицию
    if (keepPosition && currentTime > 0) {
      setTimeout(function() {
        trySeekTo(currentTime);
      }, 2000);
    }
  }

  // ============================================================
  // ПЕРЕМОТКА В НУЖНОЕ ВРЕМЯ
  // ============================================================
  function trySeekTo(seconds) {
    try {
      var doc = frame.contentDocument || frame.contentWindow.document;
      var videos = doc.querySelectorAll('video');
      if (videos.length > 0) {
        var video = videos[0];
        if (video.duration && video.duration > seconds) {
          video.currentTime = seconds;
          console.log('⏱ Перемотка на ' + Math.floor(seconds) + 'с');
        }
      }
    } catch(e) {}
  }

  // ============================================================
  // СЛЕДУЮЩЕЕ ВИДЕО
  // ============================================================
  function nextVideo() {
    var next = (currentIndex + 1) % playlist.length;
    currentTime = 0;
    // Администраторский ключ (по умолчанию tv2024)
    var adminKey = 'tv2024';
    setState(next, 0, adminKey);
    loadVideo(next, false);
    resetAutoTimer();
  }

  // ============================================================
  // СИНХРОНИЗАЦИЯ С СЕРВЕРОМ (каждые 5 секунд)
  // ============================================================
  function syncWithServer() {
    if (!isSynced) return;

    // Сколько прошло времени с момента синхронизации
    var elapsed = (Date.now() - serverTimeOffset) / 1000;
    var currentServerTime = currentTime + elapsed;

    // Отправляем на сервер наше текущее время
    var url = API_URL + '?action=sync&time=' + currentServerTime + '&t=' + Date.now();
    fetch(url)
      .then(function(response) { return response.json(); })
      .then(function(data) {
        if (data.status === 'sync') {
          // Сервер говорит, что мы отстаём — синхронизируемся
          currentTime = data.time;
          currentIndex = data.index;
          serverTimeOffset = Date.now() - (currentTime * 1000);
          
          // Перематываем видео
          trySeekTo(currentTime);
          
          console.log('🔄 Синхронизация: видео #' + (currentIndex + 1) + 
                      ', время: ' + Math.floor(currentTime) + 'с');
        }
      })
      .catch(function(err) {});
  }

  // ============================================================
  // АВТОПЕРЕКЛЮЧЕНИЕ
  // ============================================================
  var autoTimer = null;
  var SWITCH_DELAY = 50000;

  function resetAutoTimer() {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    autoTimer = setTimeout(function() {
      // Проверяем, не переключилось ли уже на сервере
      fetchState();
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
  // ПОЛНЫЙ ЭКРАН
  // ============================================================
  function toggleFullscreen() {
    var el = tvContainer;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) el.msRequestFullscreen();
      fullscreenBtn.classList.add('active');
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      fullscreenBtn.classList.remove('active');
    }
  }

  // ============================================================
  // ЗВУК
  // ============================================================
  var isMuted = false;

  function toggleMute() {
    isMuted = !isMuted;
    if (isMuted) {
      muteBtn.classList.add('muted');
      muteLabel.textContent = '🔇 Без звука';
    } else {
      muteBtn.classList.remove('muted');
      muteLabel.textContent = '🔊 Звук';
    }
    tryMuteAllVideos(isMuted);
  }

  function tryMuteAllVideos(muted) {
    try {
      var doc = frame.contentDocument || frame.contentWindow.document;
      var videos = doc.querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        videos[i].muted = muted;
      }
    } catch(e) {}
    
    setTimeout(function() {
      try {
        var doc2 = frame.contentDocument || frame.contentWindow.document;
        var videos2 = doc2.querySelectorAll('video');
        for (var j = 0; j < videos2.length; j++) {
          videos2[j].muted = muted;
        }
      } catch(e) {}
    }, 1000);
  }

  // ============================================================
  // ОБРАБОТЧИКИ
  // ============================================================

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  videoWrap.addEventListener('dblclick', toggleFullscreen);
  muteBtn.addEventListener('click', toggleMute);

  videoWrap.addEventListener('mousemove', resetAutoTimer);
  videoWrap.addEventListener('click', resetAutoTimer);
  videoWrap.addEventListener('touchstart', resetAutoTimer);

  document.addEventListener('fullscreenchange', function() {
    if (document.fullscreenElement) fullscreenBtn.classList.add('active');
    else fullscreenBtn.classList.remove('active');
  });
  document.addEventListener('webkitfullscreenchange', function() {
    if (document.webkitFullscreenElement) fullscreenBtn.classList.add('active');
    else fullscreenBtn.classList.remove('active');
  });

  // ============================================================
  // ЗАПУСК
  // ============================================================

  updateClock();
  setInterval(updateClock, 30000);

  // Загружаем состояние с сервера
  fetchState();

  // Синхронизация каждые 5 секунд
  setInterval(syncWithServer, 5000);

  // Автопереключение
  resetAutoTimer();

  // При загрузке iframe восстанавливаем позицию
  frame.addEventListener('load', function() {
    setTimeout(function() {
      trySeekTo(currentTime);
      tryMuteAllVideos(isMuted);
    }, 2000);
  });

  console.log('📡 INTERNET TV работает в реальном времени через сервер');
  console.log('🔑 Ключ администратора: tv2024');
})();
