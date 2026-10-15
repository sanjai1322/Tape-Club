// Page views plus a handful of listening events, sent to GoatCounter when
// ANALYTICS_CONFIG.goatcounterCode is set. GoatCounter ignores localhost.
import {ANALYTICS_CONFIG} from './config.js';

const code=ANALYTICS_CONFIG.goatcounterCode.trim();
const events={
  'insert-button':'insert-cassette',play:'play-pause',eject:'eject',
  'add-song':'open-add-song','upload-button':'open-upload',
  'inspect-button':'inspect-tape','mode-toggle':'toggle-mode','help-button':'open-help'
};

if(code){
  const endpoint=`https://${code}.goatcounter.com`;
  const script=document.createElement('script');
  script.async=true;script.src='https://gc.zgo.at/count.js';script.dataset.goatcounter=`${endpoint}/count`;
  document.head.appendChild(script);

  const send=(name,title)=>window.goatcounter?.count?.({path:name,title:title||name,event:true});
  document.addEventListener('click',e=>{
    const target=e.target.closest('button');if(!target||target.disabled)return;
    if(events[target.id])send(events[target.id]);
    else if(target.dataset.tape)send(`select-tape-${target.dataset.tape}`);
    else if(target.dataset.album)send(`add-album-${target.dataset.album}`);
  },{capture:true});

  if(ANALYTICS_CONFIG.showVisitCount){
    fetch(`${endpoint}/counter/TOTAL.json`).then(r=>r.ok?r.json():null).then(data=>{
      if(!data?.count)return;
      const el=document.getElementById('visit-count');
      el.textContent=`${data.count} VISITS ·`;el.title='Total page views';el.hidden=false;
    }).catch(()=>{});
  }
}
