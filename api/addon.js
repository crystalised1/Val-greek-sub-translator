const express = require('express');
const { addonBuilder } = require('stremio-addon-sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const translate = require('@vitalets/google-translate-api');
const NodeCache = require('node-cache');

const app = express();

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

  if (!translatedCache.has(id)) {
    const englishSrt = await downloadSrt(englishUrl);
    if (!englishSrt) return { subtitles: [] };

    const translatedSrt = await translateSrtContent(englishSrt);
    if (!translatedSrt) return { subtitles: [] };

    translatedCache.set(id, translatedSrt);
  }

  const translatedUrl = `http://localhost:${process.env.PORT || 7000}/translated/${id}.srt`;

  subs.push({ id: 'el-auto', lang: 'el', name: 'Greek (Auto-translated)', url: translatedUrl });
  subsCache.set(id, subs);

  return { subtitles: subs };
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/manifest.json', (req, res) => {
  res.json(builder.getManifest());
});

app.get('/subtitles/:id.srt', (req, res) => {
  const id = req.params.id;
  const srt = translatedCache.get(id);
  if (srt) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(srt);
  } else {
    res.status(404).send('Subtitle not found');
  }
});

app.use(builder.getInterface());

const port = process.env.PORT || 7000;
app.listen(port, () => {
  console.log(`Addon server running at http://localhost:${port}`);
});
