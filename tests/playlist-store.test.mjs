import test from 'node:test';import assert from 'node:assert/strict';
import {PlaylistStore,parseYouTubeLink,validateAudioURL,isPlayable} from '../dist/js/playlist-store.js';
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)}};
test('accepts canonical YouTube formats and rejects disguised or executable links',()=>{
  for(const url of ['https://youtu.be/M7lc1UVf-VE?t=2','https://www.youtube.com/watch?v=M7lc1UVf-VE','https://youtube.com/shorts/M7lc1UVf-VE','https://music.youtube.com/watch?v=M7lc1UVf-VE'])assert.equal(parseYouTubeLink(url).videoId,'M7lc1UVf-VE');
  for(const url of ['javascript:alert(1)','https://youtube.com.evil.test/watch?v=M7lc1UVf-VE','https://evil.test/watch?v=M7lc1UVf-VE','https://youtube.com/playlist?list=abc','https://user:pass@youtube.com/watch?v=M7lc1UVf-VE'])assert.throws(()=>parseYouTubeLink(url));
  assert.throws(()=>validateAudioURL('data:text/html,hello'));assert.throws(()=>validateAudioURL('https://youtu.be/M7lc1UVf-VE'));
});
test('persists cassette, language, ordering, edits and removals; English resets by default',()=>{
  const storage=memory(),s=new PlaylistStore(storage);const a=s.addTrackToCassette('aqua','ta',{title:'Tamil A',artist:'Artist',sourceType:'youtube',url:'https://youtu.be/M7lc1UVf-VE'});const b=s.addTrackToCassette('aqua','ta',{title:'Tamil B',sourceType:'audio',src:'https://example.com/b.mp3'});
  s.setLanguage('aqua','ta');s.move('aqua','ta',b.id,-1);assert.deepEqual(s.group('aqua').map(t=>t.title),['Tamil B','Tamil A']);assert.equal(s.group('cosmic','ta').length,0);assert.equal(isPlayable(a),true);assert.equal(isPlayable(b),true);
  s.update('aqua',a.id,'golden','ml',{title:'Moved and edited'});const reloaded=new PlaylistStore(storage);assert.equal(reloaded.language('aqua'),'en');assert.equal(reloaded.group('golden','ml')[0].title,'Moved and edited');assert.equal(reloaded.group('aqua','ta')[0].id,b.id);
  reloaded.remove('aqua',b.id);assert.equal(new PlaylistStore(storage).group('aqua','ta').length,0);
});
test('corrupt or blocked persistence degrades visibly without preventing use',()=>{
  const s=new PlaylistStore({getItem:()=>'{',setItem:()=>{throw Error('quota')}});assert.ok(s.warning);assert.equal(s.playlists.cosmic.length,4);s.addTrackToCassette('pixel','hi',{title:'New',sourceType:'audio',src:'https://example.com/a.mp3'});assert.equal(s.group('pixel','hi').length,1);assert.match(s.warning,/full or disabled/);
});
