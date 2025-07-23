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
    console.error("Error fetching Greek subtitles:", error);
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
    console.error("Error fetching English subtitles:", error);
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

  const greekUrl = await fetchGreekFromSubseeker(id);
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

module.exports = async (req, res) => {
  return serveHTTP(builder.getInterface())(req, res);
};
