# TAPE//CLUB

A working, browser-local 3D cassette listening room, built from the supplied `tape_club_3d_interactive_cassette_player.html`. The original procedural cassette shells, reel assemblies, tape packs, label geometry, player mechanisms, controls, graphite prism shader, studio environment, synth WAV generator, and mechanical sounds are retained and adapted.

## Start

Install Node.js 20 or later, open a terminal in this folder, and run:

```sh
npm start
```

Open **http://127.0.0.1:4173**. No dependency installation or internet connection is needed to run the website: Three.js 0.162.0, OrbitControls, and GSAP 3.12.5 are included locally. Use an HTTP server rather than double-clicking the HTML file. Any static host can serve the contents of `dist/`.

## Listen

1. Choose a cassette in the 3D rack or the collection below it. Hover lifts it. Its original storage slot is retained.
2. Choose **Inspect tape**, or drag the selected tape, to turn the real model freely. Choose **Return to shelf** or press Escape to return.
3. Press **Insert cassette**. The lid opens to 105°; the exact selected object lifts clear of the rack, travels through the front corridor, turns flat, aligns with the spindle hubs, seats, and the lid closes.
4. Press **Play**. Audio and reels follow actual playback. Play toggles pause. Previous/next change tracks; rewind/forward wind until paused or a boundary is reached. Seek and volume work directly.
5. Press **Eject** to return the same object to its slot. Choose another cassette and repeat.

Drag an empty part of the room to orbit; scroll/pinch to zoom. The deck’s real transport keys and volume knob are interactive. **Room** and **Deck** offer camera presets. Space plays/pauses and left/right arrows seek five seconds when focus is outside a form control.

## Your music

The **Dark mode / Light mode** switch changes both the interface and the 3D studio. It follows your system preference initially and remembers your choice on this device. All five cassettes remain in the collection, with cropped reference-art thumbnails instead of symbolic icons.

The **Record store** includes five curated genre samplers: pop, rock, electronic, jazz and funk. **Add to tape** adds a sampler's two full-length recordings to the selected cassette, without duplicate additions or replacing local files. Insert that cassette and press Play, or select a new track if it is already loaded. Sampler additions persist in this browser, in the selected cassette and language group. Ten MP3 recordings are bundled locally; they play without a third-party streaming service or internet access.

The music is by Kevin MacLeod, licensed under **CC BY 4.0**, free to use with attribution. These are curated samplers, not official artist albums or chart rankings. The recordings are copyrighted, not public domain. Full credits, source links and license links are in **Music credits & licenses** on the site and `MUSIC-LICENSES.md`. Keep these credits with redistributions.

**Upload audio** accepts several local files and adds them to the selected cassette’s own playlist. MP3, WAV, and browser-supported M4A, Ogg, FLAC, AAC, and Opus work. Unsupported/corrupted files are rejected; the limit is 150 MB per file. Playlists are saved in localStorage, and local audio files are saved in IndexedDB on this device. Supported files restore after reload. Nothing is uploaded to a server. If storage is blocked or full, the interface reports that the file is available only for this tab. Clearing site data removes saved playlists and files. Storage is separate for each browser/device and site origin.

For permanent playlists, put audio you own or have licensed in `dist/audio/`, then edit `dist/js/playlists.js`:

```js
{ title: 'My track', artist: 'Artist name', sourceType: 'audio', language: 'en', src: './audio/my-track.mp3',
  attribution: 'Artist name · Licensed by the project owner · license details' }
```

Prefer same-origin audio. Remote files need appropriate CORS headers for Web Audio analysis. The included two 32-second tracks per cassette are browser-synthesized studies from the original engine; they contain no commercial recordings. Track attribution appears in the footer. This project does not supply licenses to commercial recordings.

## Songs and language groups

English is selected on each fresh page load. Tabs then follow Tamil, Hindi, Malayalam and Telugu. Each cassette has separate groups; switching languages changes the playback queue. Empty and YouTube-only groups keep deck audio controls disabled until an audio track is added.

**Add song** accepts a YouTube link or a direct licensed audio URL. Choose the destination cassette and language. **Get title & artist** attempts YouTube oEmbed metadata; network restrictions, private/deleted videos or unavailable metadata fall back to manual title/artist fields. Duration is optional and entered manually because oEmbed does not provide it. YouTube entries open the original video in a new tab. There is no hidden player, audio extraction or simulated YouTube reel synchronization. External YouTube playback requires internet access. Hosted audio requires an accessible file URL and appropriate CORS headers.

**Manage** reveals Move up, Move down, Edit and Remove controls. Edit can also move a song to a different cassette or language. Reordering retains the identity of an already playing track. Removing or moving the active track safely stops it and selects a remaining playable track. Next/previous and automatic advance stay within the current language and skip link-only entries.

## Central configuration

Edit `dist/js/config.js`:

```js
languageTabsConfig = {
  defaultLanguage: 'en',
  languages: [{id:'en', label:'English'}, {id:'ta', label:'Tamil'}, /* ... */]
};
CASSETTE_FINISH.themes.cosmic = {
  colorStops: ['#8d54e8', '#cbb3ff', '#a5f6ff'],
  sheenIntensity: .7, sheenSpeed: .035, reflectionStrength: .9,
  glowStrength: .15, hoverBoost: .5, fresnelStrength: .45,
  roughness: .1, transmission: 0, opacity: .72
};
```

The actual file exports complete objects; the examples above illustrate the fields. Each theme inherits `CASSETTE_FINISH.defaults`. Additional controls include selectedBoost, insertedScale, hoverSpeedBoost, insertedSpeedScale, playingPulse and labelSheen. `applyCassetteFinish(cassette, options)` reuses the existing shell/rim/label materials and never replaces artwork maps. Hover increases the sheen and sweep speed; pointer movement and view angle steer reflections. Selection raises intensity, inserted tapes calm down, and actual audio activity supplies a subtle pulse. Transmission defaults to zero to avoid an extra GPU render pass; existing alpha acrylic and environment reflections provide the glass-like appearance. The glint is in the material shader, with no bloom postprocessing or extra texture allocations.

`UI_CONFIG` controls the storage key, track limit, metadata timeout and thumbnail visibility. `playlists.js` supplies seed tracks; `library.js` supplies licensed samplers. A track uses `{id, title, artist, language, sourceType, duration?}` plus `url/videoId` for YouTube, `src` for audio, `generated` for synth studies or a browser-owned file reference for local audio. The store exports `addSongFromYouTube`, `addTrackToCassette`, `persistPlaylistState` and validated URL helpers. Saved user playlists take precedence over seeds; changes to a deployment's seed file do not overwrite a listener's edits.

## Reference artwork and materials

All five user-supplied reference images are in `dist/assets/`. Only their printed label area is mapped onto the existing label geometry, with the physical reel window cut out. The reference photos are also used for the panel and collection thumbnails. The mechanisms, reels, shell, screws, rack, and player remain real 3D objects. A view-dependent foil shader adds smooth spectral highlights to every cassette; the neutral graphite player keeps a restrained cyan/violet sheen. Printed labels sit clear of the acrylic bevels with polygon offset to avoid depth fighting; the shader avoids high-frequency glitter that aliases during motion.

## Structure

- `dist/js/cassette.js`, `themes.js`: retained cassette factories, artwork fallback, exact color configuration.
- `player.js`, `rack.js`, `environment.js`: mechanisms, five storage slots, lighting and shadows.
- `transport.js`, `state.js`: guarded operations, inspection, animation paths and transport state.
- `audio.js`, `playlists.js`: actual media playback, local files, synth studies and audio analysis.
- `cassette-finish.js`, `config.js`: reusable interactive finish, per-theme palettes, language ordering and UI settings.
- `playlist-store.js`, `playlist-ui.js`: validated source adapters, persistent language groups, song form and playlist management.
- `resources.js`: batching and geometry reuse.
- `app.js`, `style.css`, `index.html`: responsive interface, raycasting, touch, keyboard and rendering.

Only one mechanical/track operation runs at a time. Reels stop on pause, rejected playback, buffering, and hidden tabs. Playback pauses when this tab is hidden. Reduced-motion preferences shorten mechanical moves and remove decorative animation; angle-dependent sheen remains.

GPU resources are shared and static detail meshes are batched. Tape-pack radius changes scale existing geometry rather than rebuilding it. Pixel ratio is capped, delta time is bounded, and resources/object URLs are disposed on exit.

## Tests

The state tests have no dependencies. Browser tests need Playwright and a current Google Chrome installation. With the server running in another terminal:

```sh
npm install
npm test
```

`BROWSER_CHANNEL=msedge` selects Edge, and `TEST_URL` can select another HTTP origin. See `TEST-RESULTS.json` for the last browser run , `CONTROLS-RESULTS.json` for 3D key/knob and actual touch checks, and `MECHANICS-RESULTS.json` for 7,070 sampled poses across the five insertion/ejection paths, checked against oriented lid and neighboring-cassette bounds. The suite covers five object-preserving cassette cycles, spindle alignment, selection/inspection, real audio analysis, pause/reel synchronization, seek, volume, winding, track navigation, local multi-file playback, invalid audio, ended tracks, rejected play, rapid actions, lid behavior, GPU geometry stability, and a 390px mobile layout. Browser automation verifies decoded playback and analyser output; listening quality and real-device GPU speed remain device dependent.

Three.js licensing is included in `dist/vendor/THREE-LICENSE.txt`. GSAP licensing information is in `dist/vendor/GSAP-LICENSE.txt`. The reference images were supplied by the project owner.

`tests/polish.cjs` additionally checks collection thumbnails, remembered dark mode and scene color, duplicate-safe sampler additions, decoded playback and analyser output for all ten bundled MP3s, label depth separation, normal-motion inspection and mobile dark-mode layout. Results are recorded in `POLISH-RESULTS.json` and `AUDIO-RESULTS.json`.

`tests/playlist-store.test.mjs` checks URL parsing, invalid sources, persistence, language isolation, reordering, moves, removal and storage failures. `tests/music-management.cjs` checks actual UI flows, metadata success/failure, safe rendering, active-track identity, all language groups, local-file restoration, and hover/selection finish response. See `MUSIC-MANAGEMENT-RESULTS.json`; metadata responses are mocked deterministically, while audio decoding and browser storage are exercised directly.
