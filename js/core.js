(function(root){
const MOLE_TIMING={duration:650,contact:100,bounce:220,retreat:400,hidden:580};
const defaults=()=>({version:1,settings:{layout:'mac',size:'standard',volume:45,mute:false,musicEnabled:true,musicVolume:20,moleStage:0},progress:{stage:0,help:true,current:null,completed:{},best:{},last:{}}});
function validate(data){
 if(!data||data.version!==1||!data.settings||!data.progress)throw Error('不是有效的 TypeStory 进度文件');
 const s=data.settings,p=data.progress;
 if(!['mac','windows'].includes(s.layout)||!['standard','large','huge'].includes(s.size)||!Number.isFinite(s.volume)||s.volume<0||s.volume>100||typeof s.mute!=='boolean'||!Number.isInteger(p.stage)||p.stage<0||p.stage>=TSLessons.phrases.length||typeof p.help!=='boolean')throw Error('设置或阶段无效');
 if(s.musicEnabled!==undefined&&typeof s.musicEnabled!=='boolean'||s.musicVolume!==undefined&&(!Number.isFinite(s.musicVolume)||s.musicVolume<0||s.musicVolume>100))throw Error('音乐设置无效');
 if(s.moleStage!==undefined&&(!Number.isInteger(s.moleStage)||s.moleStage<0||s.moleStage>=TSLessons.stages.length))throw Error('地鼠难度无效');
 const result=defaults();result.settings={layout:s.layout,size:s.size,volume:s.volume,mute:s.mute,musicEnabled:s.musicEnabled===undefined?true:s.musicEnabled,musicVolume:s.musicVolume===undefined?20:s.musicVolume,moleStage:s.moleStage===undefined?0:s.moleStage};result.progress.stage=p.stage;result.progress.help=p.help;
 function validId(id){const m=/^(\d+):(\d+)$/.exec(id);return m&&TSLessons.phrases[+m[1]]&&TSLessons.phrases[+m[1]].texts[+m[2]]!==undefined;}
 if(p.current!==null&&!validId(p.current))throw Error('当前题目无效');result.progress.current=p.current;
 for(const map of ['completed','best','last'])if(!p[map]||typeof p[map]!=='object'||Array.isArray(p[map]))throw Error('进度格式无效');
 for(const [id,value] of Object.entries(p.completed)){if(!validId(id)||value!==true)throw Error('完成记录无效');result.progress.completed[id]=true;}
 for(const [id,value] of Object.entries(p.best)){if(!validId(id)||!value||!Number.isFinite(value.accuracy)||value.accuracy<0||value.accuracy>100||!Number.isFinite(value.seconds)||value.seconds<0)throw Error('成绩记录无效');result.progress.best[id]={accuracy:value.accuracy,seconds:value.seconds};}
 for(const [stage,id] of Object.entries(p.last)){if(!validId(id)||id.split(':')[0]!==stage)throw Error('题目顺序无效');result.progress.last[stage]=id;}
 return result;
}
function pickPhrase(progress,stage,random=Math.random){const all=TSLessons.phrases[stage].texts.map((_,i)=>stage+':'+i);if(progress.current&&all.includes(progress.current))return progress.current;let pool=all.filter(id=>!progress.completed[id]);if(!pool.length)pool=all;const filtered=pool.filter(id=>id!==progress.last[stage]);if(filtered.length)pool=filtered;return pool[Math.floor(random()*pool.length)];}
function stageProgress(progress,stage){return {completed:TSLessons.phrases[stage].texts.filter((_,i)=>progress.completed[stage+':'+i]).length,total:TSLessons.phrases[stage].texts.length};}
function resetProgress(progress,stage=null){
 const matches=id=>stage===null||id.startsWith(stage+':');
 for(const map of ['completed','best'])for(const id of Object.keys(progress[map]))if(matches(id))delete progress[map][id];
 if(progress.current&&matches(progress.current))progress.current=null;
 for(const id of Object.keys(progress.last))if(stage===null||Number(id)===stage)delete progress.last[id];
}
class Session{
 constructor(mode,target,now=0){this.mode=mode;this.target=target;this.index=0;this.correct=0;this.errors=0;this.hints=0;this.mistakes={};this.active=true;this.paused=false;this.elapsed=0;this.since=now;this.hinted=false;this.moleEffect=null;}
 tick(now){if(this.active&&!this.paused){this.elapsed+=Math.max(0,now-this.since);this.since=now;if(this.mode==='mole'&&this.elapsed>=60000){this.elapsed=60000;this.active=false;this.moleEffect=null;}}return this.active;}
 pause(now){this.tick(now);if(this.active)this.paused=true;}
 resume(now){if(this.active){this.paused=false;this.since=now;}}
 end(now){this.tick(now);this.active=false;this.moleEffect=null;}
 get hitProgress(){return this.moleEffect&&this.moleEffect.kind==='hit'?Math.min(1,(this.elapsed-this.moleEffect.start)/MOLE_TIMING.duration):0;}
 takeMoleCues(){if(!this.active||this.paused||this.moleEffect?.kind!=='hit')return [];const effect=this.moleEffect,age=this.elapsed-effect.start;return [['mole-contact',MOLE_TIMING.contact],['mole-bounce',MOLE_TIMING.bounce]].filter(([name,time])=>{if(age<time||effect.cues.includes(name))return false;effect.cues.push(name);return true;}).map(([name])=>name);}
 takeNextMole(){if(!this.active||this.paused||!this.moleEffect||this.moleEffect.kind!=='hit'||this.hitProgress<1)return false;this.moleEffect=null;return true;}
 get expected(){return this.mode==='phrase'?this.target[this.index]:this.target;}
 get accuracy(){return this.correct+this.errors?Math.round(this.correct/(this.correct+this.errors)*100):100;}
 input(char,now){this.tick(now);if(!this.active||this.paused||this.mode==='mole'&&this.moleEffect?.kind==='hit')return 'ignored';if(char!==this.expected){if(this.mode==='mole')this.moleEffect={kind:'wrong',start:this.elapsed};this.errors++;this.mistakes[this.expected]=(this.mistakes[this.expected]||0)+1;return 'wrong';}this.correct++;if(this.mode==='mole')this.moleEffect={kind:'hit',start:this.elapsed,cues:[]};if(this.mode==='phrase'){this.index++;if(this.index===this.target.length){this.active=false;return 'complete';}}return 'correct';}
 hint(){if(this.active&&!this.paused&&!this.hinted){this.hints++;this.hinted=true;return true;}return false;}
}
root.TSCore={MOLE_TIMING,defaults,validate,pickPhrase,stageProgress,resetProgress,Session};
})(typeof window==='undefined'?globalThis:window);
