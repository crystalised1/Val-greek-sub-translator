import * as cheerio from 'cheerio';
import axios from 'axios';
import translate from '@vitalets/google-translate-api';
import NodeCache from 'node-cache';

const subsCache = new NodeCache({ stdTTL: 3600 });
const translatedCache = new NodeCache({ stdTTL: 3600 });

async function fetchSubseekerSubs(imdbId, lang) {
  try {
    const baseUrl = `https://www.subseeker.com`;
    const url = `${baseUrl}/movie/${imdbId}`;
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    let links = [];

    $('a[href$=".srt"]').each((i, el) => {
      const subtitleLang = $(el).closest('tr').find('img[alt]').attr('alt');
      if (subtitleLang && subtitleLang.toLowerCase().includes(lang)) {
        const relativeHref = $(el).attr('href');
        const fullUrl = `${baseUrl}${relativeHref}`;
        links.push(fullUrl);
      }
    });

    console.log('Found subtitle links:', links);
    return links.length ? links[0] : null;

  } catch (err) {
    console.error('Error fetching subtitles:', err.message);
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
  const translatedLines = [];

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

export {
  subsCache,
  translatedCache,
  fetchSubseekerSubs,
  downloadSrt,
  translateSrtContent
};
