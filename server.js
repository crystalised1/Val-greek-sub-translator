const { addonBuilder } = require('stremio-addon-sdk')
const axios = require('axios')
const translate = require('@vitalets/google-translate-api')
const builder = new addonBuilder({
    id: 'org.val.greeksubs',
    version: '1.0.0',
    name: "Val's Greek Sub Translator",
    description: "Μεταφράζει υπότιτλους από αγγλικά σε ελληνικά",
    resources: ['subtitles'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    behaviorHints: { configurationRequired: false }
})

builder.defineSubtitlesHandler(async ({ id, type }) => {
    return {
        subtitles: [{
            lang: 'el',
            url: 'https://example.com/subs/translated-subs.srt',
            id: 'val-greek',
            name: "Greek (Μετάφραση)"
        }]
    }
})

module.exports = builder.getInterface()