const { translatedCache } = require('../utils');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const id = req.query.id.replace('.srt', '');
  const srt = translatedCache.get(id);

  if (srt) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(srt);
  } else {
    res.status(404).send('Subtitle not found');
  }
};
