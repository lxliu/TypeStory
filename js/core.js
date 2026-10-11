(function(root){
'use strict';
const MOLE_TIMING=Object.freeze({duration:650,contact:100,bounce:220,retreat:400,hidden:580}),DURATION=60000;
const groupKey=(stage,help)=>`${stage}:${help?1:0}`;
const groups=()=>Object.fromEntries(TSLessons.stages.flatMap((_,i)=>[false,true].map(h=>[groupKey(i,h),[]])));
const defaults=()=>({version:2,settings:{layout:'mac',size:'standard',volume:45,mute:false,musicEnabled:true,musicVolume:20,stage:0,help:true},lastName:'',lastResults:{},boards:groups()});
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const accuracy=(score,errors)=>score+errors?Math.round(score/(score+errors)*100):100;
function cleanName(value,optional=false){if(typeof value!=='string')throw Error('名字无效');const name=value.trim();if((!optional&&!name)||[...name].length>12||/[\x00-\x1f\x7f]/.test(name))throw Error('名字需为1–12个字符');return name;}
function readSettings(s,legacy=false){
 if(!s||!['mac','windows'].includes(s.layout)||!['standard','large','huge'].includes(s.size)||!integer(s.volume,0,100)||typeof s.mute!=='boolean')throw Error('设置无效');
 const musicEnabled=s.musicEnabled===undefined&&legacy?true:s.musicEnabled,musicVolume=s.musicVolume===undefined&&legacy?20:s.musicVolume;
 if(typeof musicEnabled!=='boolean'||!integer(musicVolume,0,100))throw Error('音乐设置无效');
 let stage=s.stage,help=s.help;
 if(legacy){const old=s.moleStage===undefined?0:s.moleStage;if(!integer(old,0,5))throw Error('旧版阶段无效');stage=[0,1,2,3,3,3][old];help=true;}
 if(!integer(stage,0,3)||typeof help!=='boolean')throw Error('阶段或帮助设置无效');
 return {layout:s.layout,size:s.size,volume:s.volume,mute:s.mute,musicEnabled,musicVolume,stage,help};
}
function readRecord(r,key,ranked){
 if(!r||!integer(r.stage,0,3)||typeof r.help!=='boolean'||groupKey(r.stage,r.help)!==key||typeof r.id!=='string'||!r.id||r.id.length>100||!integer(r.score,0,1000)||!integer(r.errors,0,100000)||!Number.isFinite(r.elapsed)||r.elapsed<0||r.elapsed>DURATION||typeof r.completed!=='boolean'||r.completed&&r.elapsed!==DURATION||r.accuracy!==accuracy(r.score,r.errors)||typeof r.at!=='string'||!Number.isFinite(Date.parse(r.at)))throw Error('成绩记录无效');
 if(ranked&&(!r.completed||!r.score))throw Error('排行榜只接受完整且有得分的成绩');
 const record={id:r.id,stage:r.stage,help:r.help,score:r.score,errors:r.errors,accuracy:r.accuracy,elapsed:r.elapsed,completed:r.completed,at:r.at};
 if(ranked)record.name=cleanName(r.name);return record;
}
const compare=(a,b)=>b.score-a.score||b.accuracy-a.accuracy;
function validate(raw){
 if(!raw||![1,2].includes(raw.version))throw Error('不是有效的 TypeStory 备份');
 const result=defaults();result.settings=readSettings(raw.settings,raw.version===1);
 if(raw.version===1){if(!raw.progress||typeof raw.progress!=='object'||Array.isArray(raw.progress))throw Error('旧版备份格式无效');return result;}
 result.lastName=cleanName(raw.lastName,true);
 for(const field of ['lastResults','boards'])if(!raw[field]||typeof raw[field]!=='object'||Array.isArray(raw[field]))throw Error('成绩数据无效');
 const keys=Object.keys(result.boards),ids=new Set();
 for(const key of Object.keys(raw.lastResults)){if(!keys.includes(key))throw Error('成绩分组无效');result.lastResults[key]=readRecord(raw.lastResults[key],key,false);}
 for(const key of Object.keys(raw.boards)){
  if(!keys.includes(key)||!Array.isArray(raw.boards[key])||raw.boards[key].length>10)throw Error('排行榜分组无效');
  result.boards[key]=raw.boards[key].map(r=>{const item=readRecord(r,key,true);if(ids.has(item.id))throw Error('重复成绩');ids.add(item.id);return item;}).sort(compare);
 }
 return result;
}
function rankFor(data,record){if(!record.completed||!record.score)return 0;const board=data.boards[groupKey(record.stage,record.help)];if(board.some(r=>r.id===record.id))return 0;const index=board.findIndex(r=>compare(record,r)<0),rank=index<0?board.length+1:index+1;return rank<=10?rank:0;}
function addScore(data,record,name){const rank=rankFor(data,record);if(!rank)return 0;const entry={...record,name:cleanName(name)},key=groupKey(record.stage,record.help);data.boards[key].splice(rank-1,0,entry);data.boards[key]=data.boards[key].slice(0,10);data.lastName=entry.name;return rank;}
// Physical character keys are tracked separately from visual key highlights.
class InputGuard{
 constructor(){this.reset();}
 reset(){this.down=new Map();this.overlapSince=null;this.invalid=false;}
 cancel(){for(const entry of this.down.values())entry.candidate=null;}
 check(now){const wasInvalid=this.invalid;if(this.down.size>=2&&this.overlapSince!==null&&now-this.overlapSince>40)this.invalid=true;return !wasInvalid&&this.invalid;}
 press(code,candidate,now){
  this.check(now);if(this.down.has(code))return;
  this.down.set(code,{candidate,pressedAt:now});
  if(this.down.size===2)this.overlapSince=now;
  if(this.down.size>=3)this.invalid=true;
 }
 release(code,now){
  this.check(now);const entry=this.down.get(code),blocked=!!entry&&this.invalid;
  this.down.delete(code);if(this.down.size<2)this.overlapSince=null;
  if(!this.down.size)this.invalid=false;
  return {candidate:blocked?null:entry?.candidate,blocked};
 }
}
class Session{
 constructor(stage,help,now=0){this.stage=stage;this.help=help;this.active=true;this.paused=false;this.elapsed=0;this.since=now;this.correct=0;this.errors=0;this.target='';this.targetRevision=0;this.moleEffect=null;this.nextTarget();}
 get state(){return !this.active?'ended':this.paused?'paused':'running';}
 get accuracy(){return accuracy(this.correct,this.errors);}
 get hitProgress(){return this.moleEffect?.kind==='hit'?Math.min(1,(this.elapsed-this.moleEffect.start)/MOLE_TIMING.duration):0;}
 tick(now){if(this.active&&!this.paused){this.elapsed=Math.min(DURATION,this.elapsed+Math.max(0,now-this.since));this.since=now;if(this.elapsed>=DURATION){this.active=false;this.moleEffect=null;}}return this.active;}
 pause(now){this.tick(now);if(this.active)this.paused=true;}
 resume(now){if(this.active){this.paused=false;this.since=now;}}
 end(now){this.tick(now);this.active=false;this.moleEffect=null;}
 nextTarget(random=Math.random){this.targetRevision++;const pool=[...TSLessons.stages[this.stage].chars].filter(c=>c!==this.target);this.target=pool[Math.floor(random()*pool.length)];}
 input(char,now){this.tick(now);if(!this.active||this.paused||this.moleEffect?.kind==='hit')return 'ignored';if(char!==this.target){this.errors++;this.moleEffect={kind:'wrong',start:this.elapsed};return 'wrong';}this.correct++;this.moleEffect={kind:'hit',start:this.elapsed,cues:[]};return 'correct';}
 takeMoleCues(){if(!this.active||this.paused||this.moleEffect?.kind!=='hit')return [];const effect=this.moleEffect,age=this.elapsed-effect.start;return [['mole-contact',MOLE_TIMING.contact],['mole-bounce',MOLE_TIMING.bounce]].filter(([name,time])=>{if(age<time||effect.cues.includes(name))return false;effect.cues.push(name);return true;}).map(([name])=>name);}
 takeNextMole(){if(!this.active||this.paused||this.moleEffect?.kind!=='hit'||this.hitProgress<1)return false;this.moleEffect=null;this.nextTarget();return true;}
 record(id,at){return {id,at,stage:this.stage,help:this.help,score:this.correct,errors:this.errors,accuracy:this.accuracy,elapsed:this.elapsed,completed:this.elapsed===DURATION};}
}
root.TSCore={MOLE_TIMING,DURATION,defaults,validate,groupKey,cleanName,rankFor,addScore,InputGuard,Session};
})(typeof window==='undefined'?globalThis:window);
