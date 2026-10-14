export const STATES=Object.freeze({EMPTY:'empty',INSERTING:'inserting',READY:'ready',STARTING:'starting',PLAYING:'playing',PAUSED:'paused',REWIND:'rewind',FORWARD:'forward',EJECTING:'ejecting',LID:'lid',TRACK:'track'});
const transitions={
  empty:['inserting','lid'],inserting:['ready','empty'],ready:['starting','ejecting','lid','track','rewind','forward','paused'],
  starting:['playing','paused'],playing:['paused','ejecting','lid','track','rewind','forward'],paused:['starting','ejecting','lid','track','rewind','forward'],
  rewind:['paused','starting','ejecting','track','lid','forward'],forward:['paused','starting','ejecting','track','lid','rewind'],
  ejecting:['empty'],lid:['empty','ready','paused'],track:['ready','paused','starting']
};
export class TransportState {
  constructor(onChange=()=>{}){this.value='empty';this.onChange=onChange;this.busy=false;}
  set(next){if(!transitions[this.value]?.includes(next)&&next!==this.value)throw Error(`Invalid transport transition: ${this.value} → ${next}`);this.value=next;this.onChange(next);}
  async run(task){if(this.busy)return false;this.busy=true;this.onChange(this.value);try{return await task();}finally{this.busy=false;this.onChange(this.value);}}
}
