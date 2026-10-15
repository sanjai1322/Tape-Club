// Default tracklist for each cassette. Each tape opens with two full-length
// recordings from the bundled record store (Kevin MacLeod, CC BY 4.0), then the
// two short synth studies from the original engine.
// Add owner-provided or licensed files here. Paths are relative to index.html.
// Keep attribution and license information with every published track.
import {ALBUMS} from './library.js';

const sampler=id=>ALBUMS.find(a=>a.id===id).tracks.map(t=>({...t,sourceType:'audio'}));
const study=(title,generated)=>({title,artist:'TAPE//CLUB synth study',generated,attribution:'Procedurally synthesized in this browser · no sampled recordings'});

// Which record-store sampler suits each cassette's mood.
export const TAPE_SAMPLERS={cosmic:'electronic',midnight:'rock',aqua:'jazz',pixel:'pop',golden:'funk'};

export const PLAYLISTS = {
  cosmic:[...sampler(TAPE_SAMPLERS.cosmic),study('Lavender orbit','cosmic'),study('After the stars','cosmic:alternate')],
  midnight:[...sampler(TAPE_SAMPLERS.midnight),study('Night lane','midnight'),study('Last exit','midnight:alternate')],
  aqua:[...sampler(TAPE_SAMPLERS.aqua),study('Below the surface','aqua'),study('Blue refraction','aqua:alternate')],
  pixel:[...sampler(TAPE_SAMPLERS.pixel),study('Insert coin','pixel'),study('High score','pixel:alternate')],
  golden:[...sampler(TAPE_SAMPLERS.golden),study('Honey light','golden'),study('The long goodbye','golden:alternate')]
};
