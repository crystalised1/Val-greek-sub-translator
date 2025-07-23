const { addonBuilder } = require('stremio-addon-sdk');

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

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(builder.getManifest());
};
