/* Lecteur commun — piloté par window.STOP, défini dans chaque page.
   Le bouton principal (#s-play) EST le lecteur : au premier clic il
   se transforme sur place (barre de progression + temps).

   Statistiques (GoatCounter, anonymes, sans cookie) — un événement par
   écoute et par étape : <id>-play, <id>-25, <id>-50, <id>-75, <id>-fin. */
(function () {
  var STOP = window.STOP;
  if (!STOP) return;

  var audio   = document.getElementById('audio');
  var btn     = document.getElementById('s-play');
  var svg     = document.querySelector('#s-playicon svg');
  var bar     = document.getElementById('p-bar');
  var fill    = document.getElementById('p-fill');
  var cur     = document.getElementById('p-cur');
  var dur     = document.getElementById('p-dur');
  var err     = document.getElementById('s-err');

  var ICON_PLAY  = '<path d="M0 0l12 7-12 7z"/>';
  var ICON_PAUSE = '<path d="M0 0h4v14H0zM8 0h4v14H8z"/>';

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), x = Math.floor(s % 60);
    return m + ':' + String(x).padStart(2, '0');
  }

  /* ---------- statistiques ---------- */
  var queue = [], sent = {};
  function flush() {
    var gc = window.goatcounter;
    if (!gc || !gc.count) return false;
    while (queue.length) {
      gc.count({ path: STOP.id + '-' + queue.shift(), title: STOP.title, event: true });
    }
    return true;
  }
  function track(name) {
    if (sent[name]) return;          // chaque étape une seule fois par visite
    sent[name] = true;
    queue.push(name);
    if (!flush()) window.addEventListener('load', flush, { once: true });
  }

  /* ---------- état ---------- */
  function setPlaying(on) {
    svg.innerHTML = on ? ICON_PAUSE : ICON_PLAY;
    btn.setAttribute('aria-label', (on ? 'Pause : ' : 'Écouter : ') + STOP.title);
  }
  function showError(on) {
    err.hidden = !on;
    if (on && !audio.currentTime) btn.classList.remove('on');   // rien n'a joué : on repasse au bouton simple
  }

  function paint() {
    var d = audio.duration, t = audio.currentTime;
    if (!isFinite(d) || !d) return;
    fill.style.width = (t / d * 100) + '%';
    cur.textContent = fmt(t);
    dur.textContent = fmt(d);
  }

  /* ---------- lecture ---------- */
  function play() {
    btn.classList.add('on');
    showError(false);
    if (audio.error) audio.load();   // après une coupure réseau : on retente le chargement
    var p = audio.play();
    if (p && p.catch) p.catch(function (e) {
      // NotAllowedError / AbortError : pas une panne, juste un refus ou une interruption
      if (e && (e.name === 'NotAllowedError' || e.name === 'AbortError')) return;
      showError(true);
      setPlaying(false);
    });
  }
  function pause() { audio.pause(); }

  audio.addEventListener('play',    function () { setPlaying(true); });
  audio.addEventListener('playing', function () { track('play'); });   // le son démarre réellement
  audio.addEventListener('pause', function () { setPlaying(false); });
  audio.addEventListener('ended', function () { setPlaying(false); track('fin'); });
  audio.addEventListener('error', function () { showError(true); setPlaying(false); });
  audio.addEventListener('loadedmetadata', paint);
  audio.addEventListener('timeupdate', function () {
    paint();
    var pct = audio.currentTime / audio.duration * 100;
    if (pct >= 25) track('25');
    if (pct >= 50) track('50');
    if (pct >= 75) track('75');
  });

  btn.addEventListener('click', function (e) {
    if (bar.contains(e.target)) return;   // la barre sert à naviguer, pas à mettre en pause
    if (audio.paused) play(); else pause();
  });
  bar.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!audio.duration) return;
    var r = bar.getBoundingClientRect();
    var ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    audio.currentTime = ratio * audio.duration;
  });

  /* ---------- écran verrouillé / notification ---------- */
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: STOP.title,
      artist: 'Balade sonore à Crouy-sur-Ourcq',
      album: 'Médiévales du Houssoy 2026',
      artwork: STOP.illu ? [{ src: STOP.illu, type: 'image/png' }] : []
    });
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
  }

  audio.src = STOP.src;
  setPlaying(false);
})();
