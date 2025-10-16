// Global image fallback, lazy-loading enhancer, and centralized image mapping
// - Sets loading="lazy" and decoding="async" for all images
// - Applies referrerPolicy to reduce hotlinking failures
// - Replaces failed images with local placeholders (poster/avatar/generic art)
// - Optionally swaps generic placeholders for per-character or per-series assets

(function () {
  var path = (location && location.pathname ? location.pathname : '/').replace(/\\/g, '/');
  var inSubdir = path.indexOf('/characters/') !== -1 || path.indexOf('/series/') !== -1;
  var basePrefix = inSubdir ? '../' : '';

  var PLACEHOLDER = {
    poster: basePrefix + 'assets/images/series/poster-generic.svg',
    avatar: basePrefix + 'assets/images/characters/avatar-generic.svg',
    art: basePrefix + 'assets/images/characters/art-generic.svg'
  };

  function enhanceImages() {
    function handleError(e) {
      var img = e && e.target ? e.target : this;
      if (!img || img.tagName !== 'IMG') return;
      if (img.dataset && img.dataset.fallbackApplied) return;
      if (img.removeEventListener) img.removeEventListener('error', handleError);
      if (img.dataset) img.dataset.fallbackApplied = '1';
      var isPoster = img.classList && img.classList.contains('poster');
      var isAvatar = img.classList && (img.classList.contains('avatar-img') || img.classList.contains('profile-image'));
      var ph = isPoster ? PLACEHOLDER.poster : (isAvatar ? PLACEHOLDER.avatar : PLACEHOLDER.art);
      try { img.src = ph; } catch (_) {}
    }

    var imgs = document.images;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      try {
        if (!img.getAttribute('loading')) img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
        if (!img.getAttribute('referrerpolicy')) img.setAttribute('referrerpolicy', 'no-referrer');
        img.addEventListener('error', handleError, false);
        if (img.complete && img.naturalWidth === 0) {
          handleError({ target: img });
        }
      } catch (_) {}
    }
  }

  function centralizeImageSources() {
    // Helper: set src only if currently generic, letting onerror fallback handle missing custom files
    function trySwapGeneric(img, nextSrc) {
      if (!img || !nextSrc) return;
      var src = img.getAttribute('src') || '';
      if (src.indexOf('avatar-generic.svg') !== -1 || src.indexOf('art-generic.svg') !== -1) {
        img.setAttribute('src', nextSrc);
      }
    }

    // Helper: try multiple extensions for a base (svg -> webp -> png)
    function swapWithFormats(img, basePathNoExt) {
      var candidates = [basePathNoExt + '.svg', basePathNoExt + '.webp', basePathNoExt + '.png'];
      for (var i = 0; i < candidates.length; i++) {
        trySwapGeneric(img, candidates[i]);
        // Stop at first attempt; if missing, onerror will cascade to next load
        if (img.getAttribute('src') === candidates[i]) break;
      }
    }

    var file = path.split('/').pop();
    var pageKey = (file || '').replace(/\.html$/i, '');

    // Characters listing at root: derive keys from profile links
    if (path.endsWith('/characters.html') || path.endsWith('characters.html')) {
      var cards = document.querySelectorAll('article.card');
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var a = card.querySelector('a[href*="characters/"]');
        var img = card.querySelector('img.avatar-img');
        if (!a || !img) continue;
        var href = a.getAttribute('href') || '';
        var m = href.match(/characters\/([^\/]+)\.html/i);
        if (!m) continue;
        var key = m[1];
        var avatarBase = basePrefix + 'assets/images/characters/' + key + '-avatar';
        swapWithFormats(img, avatarBase);
      }
    }

    // Character detail pages: use filename as key
    if (path.indexOf('/characters/') !== -1 && pageKey) {
      var avatarImgs = document.querySelectorAll('img.avatar-img, img.profile-image');
      for (var j = 0; j < avatarImgs.length; j++) {
        var av = avatarImgs[j];
        var cAvatarBase = basePrefix + 'assets/images/characters/' + pageKey + '-avatar';
        swapWithFormats(av, cAvatarBase);
      }
      var cGallery = document.querySelectorAll('.gallery-grid img');
      for (var k = 0; k < cGallery.length; k++) {
        var gi = cGallery[k];
        var cArtBase = basePrefix + 'assets/images/characters/' + pageKey + '-art-' + (k + 1);
        swapWithFormats(gi, cArtBase);
      }
    }

    // Series detail pages: use filename as key
    if (path.indexOf('/series/') !== -1 && pageKey) {
      var sGallery = document.querySelectorAll('.series-gallery .gallery-grid img');
      for (var s = 0; s < sGallery.length; s++) {
        var si = sGallery[s];
        var sArtBase = basePrefix + 'assets/images/series/' + pageKey + '-art-' + (s + 1);
        swapWithFormats(si, sArtBase);
      }
    }
  }

  function runAll() {
    enhanceImages();
    centralizeImageSources();
    try { standardizeFooter(); } catch (_) {}
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    runAll();
  } else {
    document.addEventListener('DOMContentLoaded', runAll, { once: true });
  }
})();

// Footer standardization and conditional attribution (IIFE scope above retains basePrefix)
(function(){
  try{
    // If variables aren't visible (in case of minification), recompute minimal context
    var locPath = (location && location.pathname ? location.pathname : '/').replace(/\\/g,'/');
    var isSub = locPath.indexOf('/characters/') !== -1 || locPath.indexOf('/series/') !== -1;
    var prefix = isSub ? '../' : '';

    function buildFooterHTML(){
      var href = prefix + 'ATTRIBUTIONS.md';
      return '<div class="container footer-inner">\n'
        + '  <p>&copy; 2025 Otaku Haven — Built for demo & learning · <a href="' + href + '" class="attributions-link">Attributions</a></p>\n'
        + '  <ul class="social">\n'
        + '    <li><a href="#">Discord</a></li>\n'
        + '    <li><a href="#">Twitter</a></li>\n'
        + '    <li><a href="#">Instagram</a></li>\n'
        + '  </ul>\n'
        + '</div>';
    }

    window.standardizeFooter = function standardizeFooter(){
      var footer = document.querySelector('footer.site-footer');
      if (!footer){
        // create a basic footer if missing
        footer = document.createElement('footer');
        footer.className = 'site-footer';
        document.body.appendChild(footer);
      }
      // Replace content with standardized markup
      footer.innerHTML = buildFooterHTML();

      // After ensuring the footer, optionally hide Attributions if empty file
      try { conditionalAttributions(prefix, footer); } catch(_){}
    };

    function conditionalAttributions(prefix, footer){
      // Only attempt fetch when served via http/https; file:// often blocks
      if (!window.fetch) return;
      if (!location || !/^https?:/i.test(location.protocol)) return;
      var url = prefix + 'ATTRIBUTIONS.md';
      fetch(url, { cache: 'no-store' }).then(function(resp){
        if (!resp || !resp.ok) return '';
        return resp.text();
      }).then(function(txt){
        if (typeof txt !== 'string') return;
        // Determine if there are actual entries (bullet list items)
        var hasEntries = /(\n|^)\s*[-*]\s+/.test(txt);
        if (!hasEntries){
          var p = footer.querySelector('.footer-inner p');
          if (p){
            p.innerHTML = '&copy; 2025 Otaku Haven — Built for demo & learning';
          }
        }
      }).catch(function(){ /* ignore */ });
    }
  }catch(_){/* ignore footer standardization failures */}
})();
