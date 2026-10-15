// Change language order and the initial language in this one object.
export const languageTabsConfig={defaultLanguage:'en',languages:[
  {id:'en',label:'English'},{id:'ta',label:'Tamil'},{id:'hi',label:'Hindi'},
  {id:'ml',label:'Malayalam'},{id:'te',label:'Telugu'}
]};
export const UI_CONFIG={storageKey:'tape-club-playlists-v1',maxTracksPerCassette:250,metadataTimeout:6000,showThumbnails:true};

// Transmission defaults to zero: existing transparent acrylic + environment
// reflections avoid an additional transmission render pass on mobile.
export const CASSETTE_FINISH={
  defaults:{sheenIntensity:.7,sheenSpeed:.035,reflectionStrength:.9,glowStrength:.15,hoverBoost:.5,hoverSpeedBoost:.5,fresnelStrength:.45,roughness:.1,transmission:0,opacity:.72,selectedBoost:.22,insertedScale:.64,insertedSpeedScale:.6,playingPulse:.045,labelSheen:.12,colorStops:['#b6b5c9','#d5e4ec','#f4f4f4']},
  themes:{
    cosmic:{colorStops:['#8d54e8','#cbb3ff','#a5f6ff']},
    midnight:{colorStops:['#342c34','#b91536','#ff626b'],opacity:.88,sheenIntensity:.52,glowStrength:.12},
    aqua:{colorStops:['#1477c9','#18cfca','#bcf8ff']},
    pixel:{colorStops:['#a6df13','#f5ed43','#56e5ed'],sheenIntensity:.61},
    golden:{colorStops:['#f4cc43','#ffad36','#ef6b30'],sheenIntensity:.62}
  }
};

// Viewer analytics (GoatCounter, free and cookie-free). Create a site at
// https://www.goatcounter.com, then put its code here, e.g. 'tapeclub' for
// https://tapeclub.goatcounter.com. Leave empty to disable tracking entirely.
// showVisitCount needs "Allow adding visitor counts on your website" enabled
// in GoatCounter's site settings.
export const ANALYTICS_CONFIG={goatcounterCode:'',showVisitCount:true};
