// ============================================================
// ПЛЕЙЛИСТ — вставляй ссылки из ВК сюда
// ============================================================

var PLAYLIST = [
  "https://vkvideo.ru/video-236922133_456239096",
  // Добавляй свои видео:
  // "https://vkvideo.ru/video-123456789_987654321",
];

// ============================================================
// Парсим ссылки
// ============================================================

function parseVkUrl(url) {
  var oid = null, id = null;

  var match = url.match(/video(-?\d+)_(\d+)/);
  if (match) {
    oid = match[1];
    id = match[2];
    return { oid: oid, id: id };
  }

  match = url.match(/[?&]oid=(-?\d+)/);
  if (match) oid = match[1];
  match = url.match(/[?&]id=(\d+)/);
  if (match) id = match[1];
  if (oid && id) return { oid: oid, id: id };

  return { raw: url };
}

function buildEmbedUrl(item) {
  if (item.raw) return item.raw;
  return 'https://vk.com/video_ext.php?oid=' + item.oid + '&id=' + item.id + '&hd=2&autoplay=1';
}

var PARSED_PLAYLIST = [];

for (var i = 0; i < PLAYLIST.length; i++) {
  var parsed = parseVkUrl(PLAYLIST[i]);
  PARSED_PLAYLIST.push({
    url: PLAYLIST[i],
    embed: buildEmbedUrl(parsed),
    oid: parsed.oid || null,
    id: parsed.id || null
  });
}

console.log('📺 Загружено ' + PARSED_PLAYLIST.length + ' видео');
