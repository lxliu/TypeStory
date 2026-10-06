const assert=require('node:assert/strict');
require('../js/keyboard.js');require('../js/lessons.js');require('../js/core.js');
const C=TSCore,L=TSLessons,K=TSKeyboard;
assert.equal(L.stages.length,4);assert.equal(L.stages[0].chars,'asdfghjkl;');assert.equal(L.stages[1].chars.length,26);assert.equal(L.stages[2].chars.length,52);
for(const stage of L.stages){assert.equal(new Set(stage.chars).size,stage.chars.length);for(const char of stage.chars)assert.ok(K.find(char),char);}
assert.deepEqual(K.guidance('A').shiftCodes,['ShiftLeft','ShiftRight']);assert.equal(K.guidance(' ').label,'拇指');assert.deepEqual(K.rows.at(-1).filter(k=>k.code.startsWith('Arrow')).map(k=>k.code),['ArrowLeft','ArrowUp','ArrowDown','ArrowRight']);
let game=new C.Session(2,false,0),target=game.target;
assert.equal(game.input(' ',10),'wrong');assert.equal(game.target,target);assert.equal(game.correct,0);
assert.equal(game.input(target,100),'correct');assert.equal(game.input(' ',150),'ignored');assert.equal(game.errors,1);assert.equal(game.accuracy,50);
game.tick(199);assert.deepEqual(game.takeMoleCues(),[]);game.tick(200);assert.deepEqual(game.takeMoleCues(),['mole-contact']);assert.deepEqual(game.takeMoleCues(),[]);
game.pause(250);game.tick(9000);assert.equal(game.elapsed,250);assert.equal(game.takeNextMole(),false);assert.deepEqual(game.takeMoleCues(),[]);assert.equal(game.input(target,9000),'ignored');
game.resume(9000);game.tick(9070);assert.deepEqual(game.takeMoleCues(),['mole-bounce']);game.tick(9499);assert.equal(game.takeNextMole(),false);game.tick(9500);assert.equal(game.takeNextMole(),true);assert.notEqual(game.target,target);assert.equal(game.takeNextMole(),false);
game.end(9600);assert.equal(game.state,'ended');assert.equal(game.moleEffect,null);assert.equal(game.record('one','2026-10-07T00:00:00Z').completed,false);
game=new C.Session(0,true,0);game.input(game.target,59900);game.tick(60000);assert.equal(game.active,false);assert.equal(game.takeNextMole(),false);assert.deepEqual(game.takeMoleCues(),[]);assert.equal(game.record('one','2026-10-07T00:00:00Z').completed,true);
const record=(id,stage=0,help=true,score=10,errors=0)=>({id,stage,help,score,errors,accuracy:Math.round(score/(score+errors)*100),elapsed:60000,completed:true,at:'2026-10-07T00:00:00Z'});
let data=C.defaults();assert.equal(Object.keys(data.boards).length,8);
for(let stage=0;stage<4;stage++)for(const help of [false,true]){const r=record(`${stage}-${help}`,stage,help);assert.equal(C.addScore(data,r,' Leo '),1);assert.equal(data.boards[C.groupKey(stage,help)][0].name,'Leo');data.lastResults[C.groupKey(stage,help)]=r;}
assert.deepEqual(C.validate(JSON.parse(JSON.stringify(data))),data);assert.equal(C.addScore(data,record('0-true'),'duplicate'),0);
data=C.defaults();for(let i=0;i<10;i++)assert.equal(C.addScore(data,record('tie'+i),'玩家'),i+1);assert.equal(C.rankFor(data,record('late')),0);assert.equal(C.rankFor(data,record('high',0,true,11)),1);C.addScore(data,record('high',0,true,11),'第一');assert.equal(data.boards['0:1'].length,10);assert.equal(data.boards['0:1'][9].id,'tie8');
assert.equal(C.rankFor(data,{...record('early'),completed:false,elapsed:30000}),0);assert.equal(C.rankFor(data,{...record('zero'),score:0,accuracy:100}),0);
let accuracyData=C.defaults();C.addScore(accuracyData,record('lower',0,false,10,2),'甲');assert.equal(C.addScore(accuracyData,record('better',0,false,10,0),'乙'),1);
for(let old=0;old<6;old++){const legacy={version:1,settings:{layout:'windows',size:'large',volume:45,mute:false,moleStage:old},progress:{stage:2}};const migrated=C.validate(legacy);assert.equal(migrated.settings.stage,[0,1,2,3,3,3][old]);assert.equal(migrated.settings.help,true);assert.equal(migrated.settings.musicVolume,20);assert.equal(migrated.boards['0:1'].length,0);assert.equal(migrated.settings.layout,'windows');}
assert.equal(C.cleanName(' 小朋友 '),'小朋友');assert.equal(C.cleanName('😀'.repeat(12)).length,24);for(const name of ['', ' '.repeat(3),'a'.repeat(13),'x\ny'])assert.throws(()=>C.cleanName(name));
assert.throws(()=>C.validate({...data,version:9}));assert.throws(()=>C.validate({...data,settings:{...data.settings,stage:4}}));assert.throws(()=>C.validate({...data,lastResults:{'0:1':{...record('bad'),help:false}}}));assert.throws(()=>C.validate({...data,boards:{'0:1':[{...record('bad'),completed:false,name:'A'}]}}));assert.throws(()=>C.validate({...data,boards:{'0:1':[{...record('bad'),accuracy:1,name:'A'}]}}));assert.throws(()=>C.validate({...data,boards:{'0:1':[{...record('dup'),name:'A'},{...record('dup'),name:'B'}]}}));
console.log('PASS: four character sets, timer/hit/cue/pause boundaries, eight isolated boards, tie order and cutoff, legacy migration and backup validation');
