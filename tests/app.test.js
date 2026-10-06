// Exercise the actual app handlers with a small DOM substitute; this is not visual QA.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
require('../js/keyboard.js');
const source=fs.readFileSync(require.resolve('../js/app.js'),'utf8');
function declaration(name){const start=source.indexOf(' function '+name+'(');assert.ok(start>=0);const end=source.indexOf('\n function ',start+1);return source.slice(start,end);}
class Element{
 constructor(){this.children=[];this.style={setProperty(){}};this.dataset={};this.className='';this.hidden=false;this.open=false;this.shows=0;this.textContent='';this.classList={add:c=>{this.className+=' '+c;},remove:c=>{this.className=this.className.split(' ').filter(x=>x!==c).join(' ');}};}
 append(...children){this.children.push(...children);}replaceChildren(){this.children=[];}
 querySelector(selector){return this.all().find(el=>selector.startsWith('.')?el.className.split(' ').includes(selector.slice(1)):el.dataset.code===selector.match(/data-code="([^"]+)"/)[1])||null;}
 all(){return this.children.flatMap(el=>[el,...el.all()]);}
 showModal(){this.open=true;this.shows++;}close(){this.open=false;}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const handlers={},context={K:TSKeyboard,$:get,caps:false,shift:false,pressedCodes:new Set(),data:{settings:{layout:'mac'},progress:{}},document:{createElement:()=>new Element(),querySelectorAll:selector=>get('keyboard').all().filter(el=>el.className.split(' ').includes(selector.slice(1)))},window:{addEventListener:(name,fn)=>handlers[name]=fn},renderTarget(){},updateStats(){},sound(){},save(){},selectedStage:()=>0,TSAudio:{stopMusic(){}},finished:false,mode:'mole',session:{correct:3,accuracy:75,hints:1,elapsed:12000,mistakes:{a:1}},goHome(){},start(){},textChar:c=>c};
vm.createContext(context);
for(const name of ['renderKeyboard','syncModifiers','clearPressedKeys','keyEl','finish'])vm.runInContext(declaration(name),context);
const keyup=source.split('\n').find(line=>line.includes("window.addEventListener('keyup'"));vm.runInContext(keyup,context);
context.renderKeyboard();
const event=(caps,shift=false,code='CapsLock')=>({code,shiftKey:shift,getModifierState:()=>caps});
const label=code=>context.keyEl(code).children[0].textContent;
context.syncModifiers(event(true));assert.equal(label('KeyA'),'A');assert.equal(get('caps').hidden,false);
// Mac can report Caps Lock off on keyup rather than on the preceding keydown.
context.pressedCodes.add('CapsLock');context.pressedCodes.add('KeyF');context.renderKeyboard();
context.syncModifiers(event(true));handlers.keyup(event(false));assert.equal(label('KeyA'),'a');assert.equal(get('caps').hidden,true);
assert.equal(context.keyEl('CapsLock').className.includes('pressed'),false);assert.ok(context.keyEl('KeyF').className.includes('pressed'));
for(const code of ['ShiftLeft','ShiftRight']){
 context.syncModifiers(event(true,true,code));assert.equal(label('KeyA'),'a');assert.equal(label('Digit1'),'!');
 handlers.keyup(event(true,false,code));assert.equal(label('KeyA'),'A');assert.equal(label('Digit1'),'1');
}
context.clearPressedKeys();assert.equal(context.pressedCodes.size,0);assert.equal(context.caps,true);assert.equal(get('keyboard').all().some(el=>el.className.includes('pressed')),false);
handlers.keyup(event(false));assert.equal(label('KeyA'),'a');
context.finish(false,false);assert.equal(get('result').shows,0);assert.equal(get('start').textContent,'再挑战一次');assert.equal(get('stage').disabled,false);assert.equal(get('message').textContent,'本局已结束，可以调整难度后再挑战');assert.equal(context.session.correct,3);
context.finish(false,false);assert.equal(get('result').shows,0);
context.finished=false;context.finish();assert.equal(get('result').shows,1);assert.equal(get('result').open,true);
console.log('PASS: Caps Lock release synchronization, Shift combinations, held-key redraw/blur cleanup, early-end without modal and natural-timeout result');
