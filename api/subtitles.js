const {
  subsCache,
  translatedCache,
  fetchSubseekerSubs,
  downloadSrt,
  translateSrtContent
} = require('./utils');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const imdbId = url.searchParams.get('id');

  if (!imdbId) return res.json({ subtitles: [] });

  if (subsCache.has(imdbId)) {
    return res.json({ subtitles: subsCache.get(imdbId) });
  }

  let subs = [];

  const greekUrl = await fetchSubseekerSubs(imdbId, 'greek');
  if (greekUrl) {
    subs.push({ id: 'el', lang: 'el', name: 'Greek (Original)', url: greekUrl });
    subsCache.set(imdbId, subs);
    return res.json({ subtitles: subs });
  }

  const englishUrl = await fetchSubseekerSubs(imdbId, 'english');
  if (!englishUrl) return res.json({ subtitles: [] });

  if (!translatedCache.has(imdbId)) {
    const englishSrt = await downloadSrt(englishUrl);
    if (!englishSrt) return res.json({ subtitles: [] });

    const translatedSrt = await translateSrtContent(englishSrt);
    translatedCache.set(imdbId, translatedSrt);
  }

  const base = `https://${req.headers.host}/translated/${imdbId}.srt`;
  subs.push({ id: 'el-auto', lang: 'el', name: 'Greek (Auto-translated)', url: base });
  subsCache.set(imdbId, subs);

  res.json({ subtitles: subs });
};
