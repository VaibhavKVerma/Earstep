(function loadArticleAds() {
  var client = 'ca-pub-4765016864072453';
  var src =
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(client);
  if (document.querySelector('script[src="' + src + '"]')) return;
  var script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = src;
  document.head.appendChild(script);
})();
