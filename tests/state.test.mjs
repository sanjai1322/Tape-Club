import test from 'node:test';
import assert from 'node:assert/strict';
import {TransportState} from '../dist/js/state.js';
test('rejects impossible transitions and permits a complete transport cycle',()=>{const s=new TransportState();assert.throws(()=>s.set('playing'));for(const state of ['inserting','ready','starting','playing','paused','rewind','paused','forward','paused','ejecting','empty'])s.set(state);assert.equal(s.value,'empty');});
test('holds one operation through awaits, rejects overlapping operations, and releases after failure',async()=>{const s=new TransportState();let resolve;const first=s.run(()=>new Promise(r=>resolve=r));assert.equal(s.busy,true);assert.equal(await s.run(()=>{throw Error('must not run');}),false);resolve(true);assert.equal(await first,true);assert.equal(s.busy,false);await assert.rejects(s.run(()=>{throw Error('failure');}));assert.equal(s.busy,false);});
