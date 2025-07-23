const http = require('http');
const { addonBuilder } = require('stremio-addon-sdk');
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
  } catch {
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
  }
