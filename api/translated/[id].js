import {
  fetchSubseekerSubs,
  downloadSrt,
  translateSrtContent,
  subsCache,
  translatedCache
} from '../utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing IMDb ID' });
  }

  try {
    // Check cache first
    const cached = translatedCache.get(id);
    if (cached) {
      return res.status(200).send(cached);
    }

    // Get subtitle link
    const subUrl = await fetchSubseekerSubs(id, 'english');
    if (!subUrl) {
      return res.status(404).json({ error: 'No subtitles found' });
    }

    // Download .srt content
    const srtContent = await downloadSrt(subUrl);
    if (!srtContent) {
      return res.status(500).json({ error: 'Failed to download subtitle file' });
    }

    // Translate content
    const translated = await translateSrtContent(srtContent);

    // Cache it
    translatedCache.set(id, translated);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(translated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
