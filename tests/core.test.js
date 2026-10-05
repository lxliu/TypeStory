const assert=require('node:assert/strict');
require('../js/keyboard.js');require('../js/lessons.js');require('../js/core.js');
const C=TSCore,K=TSKeyboard,L=TSLessons;
for(const s of L.stages)for(const char of s.chars)assert.ok(K.find(char),char);
for(const stage of L.phrases)for(const text of stage.texts)for(const char of text)assert.ok(K.find(char),char);
assert.deepEqual(K.guidance('A').shiftCodes,['ShiftLeft','ShiftRight']);assert.deepEqual(K.guidance('{').shiftCodes,['ShiftLeft','ShiftRight']);assert.equal(K.guidance('A').shift,true);assert.equal(K.guidance(' ').key.code,'Space');
let game=new C.Session('mole','a',0);assert.equal(game.input('b',100),'wrong');assert.equal(game.target,'a');assert.equal(game.correct,0);assert.equal(game.input('a',200),'correct');assert.equal(game.accuracy,50);assert.ok(game.hint());assert.equal(game.hint(),false);game.pause(1000);game.tick(5000);assert.equal(game.elapsed,1000);game.resume(5000);game.tick(64000);assert.equal(game.active,false);assert.equal(game.input('a',64001),'ignored');assert.equal(game.correct,1);
game=new C.Session('phrase','a A',0);assert.equal(game.input('x',1),'wrong');assert.equal(game.index,0);assert.equal(game.input('a',2),'correct');assert.equal(game.input(' ',3),'correct');assert.equal(game.input('A',4),'complete');assert.equal(game.input('A',5),'ignored');assert.equal(game.correct,3);
let data=C.defaults();data.progress.current='0:2';assert.equal(C.pickPhrase(data.progress,0),'0:2');data.progress.current=null;data.progress.completed['0:0']=true;assert.notEqual(C.pickPhrase(data.progress,0,()=>0),'0:0');L.phrases[0].texts.forEach((_,i)=>data.progress.completed['0:'+i]=true);data.progress.last[0]='0:0';assert.notEqual(C.pickPhrase(data.progress,0,()=>0),'0:0');assert.deepEqual(C.validate(JSON.parse(JSON.stringify(data))),data);assert.throws(()=>C.validate({...data,version:2}));assert.throws(()=>C.validate({...data,progress:{...data.progress,current:'99:2'}}));assert.throws(()=>C.validate({...data,settings:{...data.settings,volume:-1}}));
data.progress.current='0:0';assert.equal(C.pickPhrase(data.progress,0),'0:0');
console.log('PASS: character mappings, Shift guidance, score/timing/pause, phrase correction/completion, progress cycles and import validation');
// Stage counts are unique and resets retain preferences and unrelated stages.
data=C.defaults();data.progress.stage=2;data.progress.help=false;data.progress.completed={'0:0':true,'0:1':true,'1:0':true};data.progress.best={'0:0':{accuracy:90,seconds:3},'1:0':{accuracy:100,seconds:4}};data.progress.current='0:2';data.progress.last={'0':'0:1','1':'1:0'};
assert.deepEqual(C.stageProgress(data.progress,0),{completed:2,total:8});data.progress.completed['0:0']=true;assert.equal(C.stageProgress(data.progress,0).completed,2);
C.resetProgress(data.progress,0);assert.equal(data.progress.current,null);assert.deepEqual(data.progress.completed,{'1:0':true});assert.ok(data.progress.best['1:0']);assert.equal(data.progress.last[0],undefined);assert.equal(data.progress.stage,2);assert.equal(data.progress.help,false);
C.resetProgress(data.progress);assert.deepEqual(data.progress.completed,{});assert.deepEqual(data.progress.best,{});assert.deepEqual(data.progress.last,{});assert.equal(data.progress.stage,2);assert.equal(data.settings.volume,45);assert.deepEqual(C.validate(JSON.parse(JSON.stringify(data))),data);
game=new C.Session('mole','A',0);game.pause(300);assert.equal(game.input('A',400),'ignored');game.resume(500);game.end(700);assert.equal(game.elapsed,500);assert.equal(game.input('A',701),'ignored');
game=new C.Session('phrase','a b',0);game.input('a',10);game.end(20);assert.equal(game.index,1);assert.equal(game.active,false);assert.equal(game.input(' ',30),'ignored');
game=new C.Session('mole','a',0);game.pause(60000);assert.equal(game.active,false);game.end(60001);assert.equal(game.elapsed,60000);
const arrows=K.rows.at(-1).filter(k=>k.code.startsWith('Arrow')).map(k=>k.code);assert.deepEqual(arrows,['ArrowLeft','ArrowUp','ArrowDown','ArrowRight']);
console.log('PASS: stage progress/reset compatibility, early end, pause cancellation timing, timeout boundary, independent arrow mappings');

const legacy=C.defaults();delete legacy.settings.musicEnabled;delete legacy.settings.musicVolume;const restored=C.validate(legacy);assert.equal(restored.settings.musicEnabled,true);assert.equal(restored.settings.musicVolume,20);assert.throws(()=>C.validate({...restored,settings:{...restored.settings,musicVolume:200}}));assert.equal(K.guidance(' ').label,'拇指');assert.equal(K.guidance('f').label,'左食指');
console.log('PASS: legacy music defaults and dual Shift guidance');
// Hit timing follows active game time; the old target survives until exit completes.
game=new C.Session('mole','a',0);
assert.equal(game.input('a',100),'correct');assert.equal(game.target,'a');assert.equal(game.moleEffect.kind,'hit');
assert.equal(game.input('a',150),'ignored');assert.equal(game.input('x',200),'ignored');assert.equal(game.correct,1);assert.equal(game.errors,0);
game.pause(250);const frozen=game.hitProgress;game.tick(5000);assert.equal(game.hitProgress,frozen);assert.equal(game.takeNextMole(),false);
game.resume(5000);game.tick(5499);assert.equal(game.takeNextMole(),false);game.tick(5500);assert.equal(game.takeNextMole(),true);assert.equal(game.takeNextMole(),false);
game.target='b';assert.equal(game.input('x',5600),'wrong');assert.equal(game.target,'b');assert.equal(game.moleEffect.kind,'wrong');assert.equal(game.input('b',5650),'correct');assert.equal(game.correct,2);
game.end(5700);assert.equal(game.moleEffect,null);assert.equal(game.takeNextMole(),false);
game=new C.Session('mole','a',0);game.input('a',59900);game.tick(60000);assert.equal(game.active,false);assert.equal(game.takeNextMole(),false);assert.equal(game.moleEffect,null);
const fresh=new C.Session('mole','z',70000);assert.equal(fresh.moleEffect,null);assert.equal(fresh.correct,0);
console.log('PASS: old-target hit lifecycle, input lock, pause/resume frame time, wrong recovery, timeout and restart cleanup');

// Contact and bounce cues follow active time and fire once, even after help re-render.
const cueGame=new C.Session('mole','a',0);cueGame.input('a',0);
cueGame.tick(99);assert.deepEqual(cueGame.takeMoleCues(),[]);
cueGame.tick(100);assert.deepEqual(cueGame.takeMoleCues(),['mole-contact']);assert.deepEqual(cueGame.takeMoleCues(),[]);
cueGame.pause(150);cueGame.tick(9000);assert.deepEqual(cueGame.takeMoleCues(),[]);
cueGame.resume(9000);cueGame.tick(9070);assert.deepEqual(cueGame.takeMoleCues(),['mole-bounce']);assert.deepEqual(cueGame.takeMoleCues(),[]);
cueGame.tick(9429);assert.equal(cueGame.takeNextMole(),false);cueGame.tick(9500);assert.equal(cueGame.takeNextMole(),true);
const stopped=new C.Session('mole','a',0);stopped.input('a',0);stopped.end(80);assert.deepEqual(stopped.takeMoleCues(),[]);
console.log('PASS: 650ms hit duration, contact/bounce cue timing, pause and stop cancellation');

// Mole preference survives storage/JSON, independently of phrase progress.
for(let stage=0;stage<L.stages.length;stage++){
 const saved=C.defaults();saved.settings.moleStage=stage;saved.progress.stage=2;
 const loaded=C.validate(JSON.parse(JSON.stringify(saved)));
 assert.equal(loaded.settings.moleStage,stage);assert.equal(loaded.progress.stage,2);
 C.resetProgress(loaded.progress);assert.equal(loaded.settings.moleStage,stage);
}
const oldBackup=C.defaults();delete oldBackup.settings.moleStage;assert.equal(C.validate(oldBackup).settings.moleStage,0);
for(const value of [-1,6,1.5,'2',null])assert.throws(()=>C.validate({...C.defaults(),settings:{...C.defaults().settings,moleStage:value}}));
console.log('PASS: remembered mole difficulty, JSON round trip, legacy fallback, bounds and reset independence');
