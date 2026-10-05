const assert=require('node:assert/strict');
const originalSet=global.setInterval,originalClear=global.clearInterval;
let timers=new Map(),next=0;
global.setInterval=fn=>{timers.set(++next,fn);return next;};global.clearInterval=id=>timers.delete(id);
require('../js/audio.js');const a=TSAudio;let notes=0;a.context={currentTime:0};a.note=()=>notes++;
const s={musicEnabled:true,musicVolume:20,mute:false};
a.startMusic(s);assert.equal(timers.size,1);assert.ok(notes>0);const step=a.step;a.startMusic(s);assert.equal(timers.size,1);assert.equal(a.step,step);
a.pauseMusic();assert.equal(timers.size,0);assert.equal(a.step,step);a.startMusic(s);assert.equal(timers.size,1);assert.equal(a.step,step+1);
a.startMusic({...s,mute:true});assert.equal(timers.size,0);a.startMusic({...s,musicEnabled:false});assert.equal(timers.size,0);a.startMusic({...s,musicVolume:0});assert.equal(timers.size,0);
a.startMusic(s);a.stopMusic();assert.equal(timers.size,0);assert.equal(a.step,0);a.startMusic(s);assert.equal(timers.size,1);a.stopMusic();
global.setInterval=originalSet;global.clearInterval=originalClear;
console.log('PASS: music start idempotency, pause/resume, mute, disabled, zero volume, stop/restart');
// Ducking affects only the music gain; the pop/glissando use the effect bus.
let calls=[],duck=[];a.context={currentTime:10};a.musicBus={gain:{cancelScheduledValues:t=>duck.push(['cancel',t]),setValueAtTime:(v,t)=>duck.push(['set',v,t]),linearRampToValueAtTime:(v,t)=>duck.push(['ramp',v,t])}};
a.note=(...args)=>calls.push(args);a.play('mole-hit',{volume:50,mute:false});assert.equal(calls.length,3);assert.ok(calls.every(n=>n[3]==='effect'));assert.ok(duck.some(n=>n[0]==='set'&&n[1]===.28));assert.ok(duck.some(n=>n[0]==='ramp'&&n[1]===1));calls=[];a.play('mole-hit',{volume:50,mute:true});assert.equal(calls.length,0);
a.play('key',{volume:50,mute:false});assert.equal(calls.length,1);assert.equal(calls[0][3],'effect');
console.log('PASS: independent hit/music routing, music duck envelope, silent mode and keyboard click');
