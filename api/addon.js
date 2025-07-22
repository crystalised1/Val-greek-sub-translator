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

const cache = new NodeCache({ stdTTL: 3600 });

async function fetchGreekFromSubseeker(imdbId) {
  try {
    const url = `https://www.subseeker.com/movie/${imdbId}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let links = [];
    $('a[href$=".srt"]').each((i, el) => {
      const lang = $(el).closest('tr').find('img[alt]').attr('alt');
      if (lang && lang.toLowerCase().includes('greek')) {
        links.push($(el).attr('href'));
      }
    });
    return links.length ? links[0] : null;
  } catch (error) {
    return null;
  }
}

async function fetchEnglishSub(imdbId) {
  try {
    const url = `https://www.subseeker.com/movie/${imdbId}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let links = [];
    $('a[href$=".srt"]').each((i, el) => {
      const lang = $(el).closest('tr').find('img[alt]').attr('alt');
      if (lang && lang.toLowerCase().includes('english')) {
        links.push($(el).attr('href'));
      }
    });
    return links.length ? links[0] : null;
  } catch (error) {
    return null;
  }
}

async function autoTranslateSubtitle(subUrl) {
  try {
    const { data } = await axios.get(subUrl);
    const lines = data.split('\n');
    const out = [];
    for (let line of lines) {
      if (/^\d+$/.test(line) || /-->/g.test(line) || line.trim() === '') {
        out.push(line);
      } else {
        try {
          const { text } = await translate(line, { to: 'el' });
          out.push(text);
        } catch {
          out.push(line);
        }
      }
    }
    return out.join('\n');
  } catch (error) {
    return null;
  }
}

builder.defineSubtitlesHandler(async ({ id }) => {
  let subs = [];
  let auto = false;
  const cached = cache.get(id);
  if (cached) {
    return { subtitles: cached };
  }
  let greekUrl = await fetchGreekFromSubseeker(id);
  if (greekUrl) {
    subs.push({ lang: 'el', url: greekUrl, id: 'val-greek-original', name: 'Greek (Original)' });
  } else {
    const eng = await fetchEnglishSub(id);
    if (eng) {
      auto = true;
      subs.push({ lang: 'el', url: eng, id: 'val-greek-auto', name: 'Greek (Auto-translated)' });
    }
  }
  cache.set(id, subs);
  return {
    subtitles: subs,
    behaviorHints: auto ? { notice: 'Μετάφραση με Google Translate' } : {}
  };
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
