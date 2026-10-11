const assert=require('node:assert/strict');
require('../js/lessons.js');require('../js/core.js');
const Guard=TSCore.InputGuard;
for(const duration of [39,40,41]){
 const guard=new Guard(),first={char:'a'},second={char:'s'};
 guard.press('KeyA',first,0);guard.press('KeyS',second,10);
 const release=guard.release('KeyA',10+duration);assert.equal(release.blocked,duration>40);assert.equal(release.candidate,duration>40?null:first);
 const remaining=guard.release('KeyS',60);assert.equal(remaining.blocked,duration>40);assert.equal(guard.down.size,0);assert.equal(guard.invalid,false);
}
{
 const guard=new Guard();guard.press('KeyA',{char:'a'},0);guard.press('KeyS',{char:'s'},1);guard.press('KeyD',{char:'d'},2);
 assert.equal(guard.release('KeyS',3).blocked,true);guard.press('KeyF',{char:'f'},4);assert.equal(guard.release('KeyF',5).blocked,true);
 assert.equal(guard.release('KeyA',6).blocked,true);assert.equal(guard.release('KeyD',7).blocked,true);
 guard.press('KeyA',{char:'a'},8);assert.equal(guard.release('KeyA',9).candidate.char,'a');
}
{
 const guard=new Guard();guard.press('KeyA',{char:'a'},0);guard.press('KeyA',{char:'A'},10);assert.equal(guard.down.size,1);assert.equal(guard.release('KeyA',20).candidate.char,'a');
 guard.press('KeyA',{char:'a'},30);guard.cancel();assert.equal(guard.release('KeyA',40).candidate,null);
 guard.press('KeyA',{char:'a'},50);guard.reset();assert.equal(guard.release('KeyA',60).candidate,undefined);
 guard.press('KeyA',{},70);guard.press('KeyS',{},80);assert.equal(guard.check(120),false);assert.equal(guard.check(121),true);assert.equal(guard.check(122),false);
}
console.log('PASS: overlap boundaries without frames, group lock, repeat suppression, captured values, cancel and reset');
