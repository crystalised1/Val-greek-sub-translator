const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const translate = require('@vitalets/google-translate-api');
const NodeCache = require('node-cache');

const builder = new addonBuilder({
  id: 'org.val.greeksubs',
  version: '1.1.0',
  name: "Val's Greek Sub Translator",
  description: "Μεταφραστής υποτίτλων στα ελληνικά",
  logo: "https://i.imgur.com/GHxDNia.png",
  background: "https://placehold.co/600x300?text=Background",
  resources: ['subtitles'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  behaviorHints: { configurationRequired: false }
});

const subsCache = new NodeCache({ stdTTL: 3600 });
const translatedCache = new NodeCache({ stdTTL: 3600 });

async function fetchSubseekerSubs(imdbId, lang) {
  try {
    const url = `https://www.subseeker.com/movie/${imdbId}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let links = [];
    $('a[href$=".srt"]').each((i, el) => {
      const subtitleLang = $(el).closest('tr').find('img[alt]').attr('alt');
      if (subtitleLang && subtitleLang.toLowerCase().includes(lang)) {
        links.push($(el).attr('href'));
      }
    });
    return links.length ? links[0] : null;
  } catch {
    return null;
  }
}

async function downloadSrt(url) {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch {
    return null;
  }
}

async function translateSrtContent(srtContent) {
  const lines = srtContent.split('\n');
  let translatedLines = [];

  for (const line of lines) {
    if (/^\d+$/.test(line) || /-->/g.test(line) || line.trim() === '') {
      translatedLines.push(line);
    } else {
      try {
        const res = await translate(line, { to: 'el' });
        translatedLines.push(res.text);
      } catch {
        translatedLines.push(line);
      }
    }
  }

  return translatedLines.join('\n');
}

builder.defineSubtitlesHandler(async ({ id }) => {
  if (subsCache.has(id)) {
    return { subtitles: subsCache.get(id) };
  }

  let subs = [];

  const greekUrl = await fetchSubseekerSubs(id, 'greek');
  if (greekUrl) {
    subs.push({ id: 'el', lang: 'el', name: 'Greek (Original)', url: greekUrl });
    subsCache.set(id, subs);
    return { subtitles: subs };
  }

  const englishUrl = await fetchSubseekerSubs(id, 'english');
  if (!englishUrl) return { subtitles: [] };

  let translatedUrl = translatedCache.get(id);
  if (!translatedUrl) {
    const englishSrt = await downloadSrt(englishUrl);
    if (!englishSrt) return { subtitles: [] };

    const translatedSrt = await translateSrtContent(englishSrt);
    if (!translatedSrt) return { subtitles: [] };

    translatedCache.set(id, translatedSrt);
  }

  translatedUrl = `/translated/${id}.srt`;

  subs.push({ id: 'el-auto', lang: 'el', name: 'Greek (Auto-translated)', url: translatedUrl });
  subsCache.set(id, subs);

  return { subtitles: subs };
});

const port = process.env.PORT || 7000;

const server = serveHTTP(builder.getInterface(), {
  port,
  onRequest: (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
});

server.on('request', async (req, res) => {
  if (req.url.startsWith('/translated/') && req.url.endsWith('.srt')) {
    const id = req.url.split('/')[2].replace('.srt', '');
    const srt = translatedCache.get(id);
    if (srt) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.writeHead(200);
      res.end(srt);
      return;
    }
    res.writeHead(404);
    res.end('Subtitle not found');
    return;
  }
});

console.log(`Addon server τρέχει στο http://localhost:${port}`);
