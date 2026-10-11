// Run the real app scripts against a lightweight DOM. No browser/layout claims.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
class Element{
 constructor(tag='div',doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.parentElement=null;this.attributes={};this.dataset={};this.style={setProperty(){}};this.handlers={};this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.open=false;this._text='';this.className='';this.classList={add:(...c)=>{this.className=[...new Set([...this.className.split(' '),...c])].join(' ').trim();},remove:(...c)=>{this.className=this.className.split(' ').filter(x=>!c.includes(x)).join(' ');}};}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
 append(...children){for(const c of children){c.parentElement=this;this.children.push(c);}}replaceChildren(...children){this.children=[];this._text='';this.append(...children);}
 setAttribute(k,v){this.attributes[k]=String(v);if(k==='class')this.className=v;if(k==='id')this.id=v;if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(v);if(['hidden','disabled','checked'].includes(k))this[k]=true;if(k==='value')this.value=v;}
 getAttribute(k){if(k.startsWith('data-'))return this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]??null;return k==='class'?this.className:k==='src'?this.src:this.attributes[k]??null;}
 all(){return this.children.flatMap(c=>[c,...c.all()]);}
 matches(selector){return selector.split(',').some(s=>{s=s.trim();if(s.startsWith('#'))return this.id===s.slice(1);if(s.startsWith('.'))return this.className.split(' ').includes(s.slice(1));const m=/^(\w+)?(?:\[([^=\]]+)(?:="([^"]*)")?\])?$/.exec(s);if(!m)return false;if(m[1]&&this.tagName!==m[1].toUpperCase())return false;if(!m[2])return true;const value=m[2]==='open'?(this.open?'':null):this.getAttribute(m[2]);return m[3]===undefined?value!==null:value===m[3];});}
 querySelectorAll(s){return this.all().filter(c=>c.matches(s));}querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(s){return this.matches(s)?this:this.parentElement?.closest(s)||null;}
 addEventListener(name,fn){(this.handlers[name]??=[]).push(fn);}dispatch(name,event={}){const e={target:this,preventDefault(){this.prevented=true;},stopPropagation(){},...event};this['on'+name]?.(e);for(const fn of this.handlers[name]||[])fn(e);return e;}
 click(){if(!this.disabled)this.dispatch('click');}focus(){this.doc.activeElement=this;}select(){}remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);}showModal(){assert.ok(!this.doc.querySelector('dialog[open]'),'no stacked modals');this.open=true;this.shows=(this.shows||0)+1;}close(){this.open=false;}
}
function boot(saved={},failStorage=false,random=Math.random,viewport={width:1280,height:700}){
 const document=new Element('document');document.doc=document;document.createElement=tag=>new Element(tag,document);document.getElementById=id=>document.querySelector('#'+id);document.hasFocus=()=>true;document.hidden=false;document.addEventListener=Element.prototype.addEventListener;
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),stack=[document];
 for(const token of html.match(/<[^>]+>|[^<]+/g)){
  if(token.startsWith('</')){stack.pop();continue;}if(token.startsWith('<!'))continue;
  if(token.startsWith('<')){const m=/^<([\w-]+)/.exec(token);if(!m)continue;const el=document.createElement(m[1]);for(const a of token.matchAll(/([\w-]+)(?:="([^"]*)")?/g)){if(a.index<2)continue;el.setAttribute(a[1],a[2]??'');}stack.at(-1).append(el);if(!['meta','link','img','input','br'].includes(m[1]))stack.push(el);
  }else stack.at(-1)._text+=token;
 }
 document.body=document.querySelector('body');const storage=new Map(Object.entries(saved)),events={},eventOptions={},audio=[];let now=0,nextFrame;
 const context={document,console,Math:Object.assign(Object.create(Math),{random}),Date,Set,Map,Blob,URL,crypto:{randomUUID:()=>`id-${now}-${Math.random()}`},performance:{now:()=>now},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(failStorage)throw Error('blocked');storage.set(k,v);},removeItem:k=>storage.delete(k)},innerWidth:viewport.width,innerHeight:viewport.height,matchMedia:()=>({matches:false}),addEventListener:(name,fn,options)=>{events[name]=fn;eventOptions[name]=options;},requestAnimationFrame:fn=>nextFrame=fn,setTimeout:fn=>fn(),TSAudio:Object.fromEntries(['enable','play','startMusic','pauseMusic','stopMusic','silence','duckMusic'].map(k=>[k,(...args)=>audio.push([k,...args])]))};context.window=context;vm.createContext(context);
 for(const file of ['keyboard','lessons','core','app'])vm.runInContext(fs.readFileSync(path.join(root,'js',file+'.js'),'utf8'),context,{filename:file+'.js'});
 const $=id=>document.getElementById(id);
 const codeFor=key=>key===' '?'Space':context.TSKeyboard.rows.flat().find(k=>k.base===key||k.upper===key)?.code||key;
 const key=(key,extra={})=>{
  const e={key,code:codeFor(key),target:document.activeElement||document.body,shiftKey:false,getModifierState:()=>false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},...extra};
  // Model capture -> target ordering and Enter's native button activation.
  if(eventOptions.keydown===true)events.keydown(e);
  if(!e.stopped)e.target.dispatch('keydown',e);
  if(eventOptions.keydown!==true&&!e.stopped)events.keydown(e);
  if(key==='Enter'&&!e.prevented&&!e.repeat&&e.target.tagName==='BUTTON')e.target.click();
  return e;
 };
 return {$,document,storage,key,codeFor,stages:context.TSLessons.stages,tap(char,extra={}){const e=key(char,extra);events.keyup({...e});},time(t){now=t;},events,eventOptions,audio,resize(width,height){context.innerWidth=width;context.innerHeight=height;events.resize?.();},advance(t){now=t;nextFrame(t);},keyup(caps,shift=false,code='CapsLock'){events.keyup({code,shiftKey:shift,getModifierState:()=>caps});},data(){return JSON.parse(storage.get('typestory.v2'));}};
}
let app=boot(),$=app.$;assert.equal($('stage-options').children.length,4);assert.equal($('overlay-label').textContent,'开始');
assert.equal($('scene-overlay').hidden,false);assert.equal($('keyboard-area').inert,true);assert.equal($('primary-action').hidden,true);
$('stage-options').children[2].click();$('help').checked=false;$('help').dispatch('change');assert.equal(app.data().settings.stage,2);assert.equal(app.data().settings.help,false);
app.key('Enter');assert.equal($('scene-overlay').hidden,true);assert.equal($('holes').children.length,3);assert.equal(app.document.querySelectorAll('.hole-ground').length,3);assert.equal($('primary-label').textContent,'暂停');assert.equal($('help').disabled,true);$('stage-options').children[0].click();assert.equal(app.data().settings.stage,2);
app.key('Enter',{repeat:true});assert.equal($('primary-label').textContent,'暂停');app.advance(1000);app.key('Escape');app.advance(5000);assert.equal($('time').textContent,'59');assert.equal($('overlay-label').textContent,'继续');app.key('Enter');assert.equal($('primary-label').textContent,'暂停');
$('settings-button').click();assert.equal($('settings').open,true);app.key('Enter');assert.equal($('overlay-label').textContent,'继续');app.document.querySelector('[data-close="settings"]').click();assert.equal($('overlay-label').textContent,'继续');app.key('Enter');
app.key('Enter',{shiftKey:true});assert.equal($('confirm-dialog').open,false);assert.equal($('scene-overlay').hidden,true);
app.key('Escape');assert.equal($('scene-overlay').hidden,false);assert.equal($('overlay-title').textContent,'已暂停');app.key('Enter',{shiftKey:true});assert.equal($('overlay-title').textContent,'已暂停');
$('end').click();assert.equal($('overlay-title').textContent,'本局已结束');assert.equal($('overlay-description').textContent,'本局成绩未记录');assert.equal(app.document.querySelector('dialog[open]'),null);assert.equal(app.data().lastResults['2:0'],undefined);assert.equal(app.data().boards['2:0'].length,0);
app=boot(Object.fromEntries(app.storage));$=app.$;assert.equal(app.data().settings.stage,2);assert.ok($('last-result').textContent.includes('还没练过'));app.key('Enter');const target=app.document.querySelector('.mole-letter').textContent;app.tap(target);app.tap('x');assert.equal($('score').textContent,'1');app.advance(60000);assert.equal($('name-dialog').open,true);assert.equal(app.data().lastResults['2:0'].completed,true);
$('player-name').value='Leo';$('name-form').dispatch('submit');assert.equal(app.data().boards['2:0'].length,1);assert.equal($('name-dialog').open,false);app.advance(61000);assert.equal(app.data().boards['2:0'].length,1);
$('leaderboard-button').click();$('board-stages').children[0].click();assert.equal(app.data().settings.stage,2);assert.equal($('board-rows').children.length,10);assert.equal($('board-empty').hidden,false);app.document.querySelector('[data-close="leaderboard"]').click();
app.key('CapsLock',{getModifierState:()=>true});const label=code=>app.document.querySelector(`[data-code="${code}"]`).children[0].textContent;assert.equal(label('KeyA'),'A');app.keyup(false);assert.equal(label('KeyA'),'a');app.key('Shift',{code:'ShiftLeft',shiftKey:true,getModifierState:()=>true});assert.equal(label('KeyA'),'a');assert.equal(label('Digit1'),'!');app.keyup(true,false,'ShiftLeft');assert.equal(label('KeyA'),'A');assert.equal(label('Digit1'),'1');
const legacy={version:1,settings:{layout:'mac',size:'large',volume:45,mute:false,moleStage:5},progress:{}};const migrated=boot({'typestory.v1':JSON.stringify(legacy)});assert.equal(migrated.data().settings.stage,3);assert.ok(migrated.storage.has('typestory.v1'));
const noStore=boot({},true);assert.equal(noStore.$('storage-warning').hidden,false);noStore.key('Enter');assert.equal(noStore.$('primary-label').textContent,'暂停');
// Early termination must preserve the previous complete result and scores.
const completedBefore=JSON.stringify(app.data().lastResults['2:0']);app.key('Enter');app.key('Escape');app.key('Escape');assert.equal($('overlay-title').textContent,'已暂停');$('end').click();assert.equal(JSON.stringify(app.data().lastResults['2:0']),completedBefore);assert.equal(app.data().boards['2:0'].length,1);assert.equal($('help').disabled,false);
// Hide old incomplete last results without changing stored records.
const old=app.data();old.lastResults['2:0']={...old.lastResults['2:0'],completed:false,elapsed:1000};const oldApp=boot({'typestory.v2':JSON.stringify(old)});assert.ok(oldApp.$('last-result').textContent.includes('还没练过'));
console.log('PASS: actual app initialization, preferences, locks, shortcuts, dialogs, state overlays, direct end/discard, blur, grouped results, naming once, filters, Caps Lock and storage failure');
// Additional end-state and import transactions, using real event handlers.
(async()=>{
 let x=boot(),get=x.$;x.key('Enter');const first=x.document.querySelector('.mole-letter').textContent;x.tap(first);x.advance(100);const actor=x.document.querySelector('.mole-actor');assert.ok(actor);x.key('Escape');const frozen=get('time').textContent;x.advance(9000);assert.equal(get('time').textContent,frozen);assert.equal(get('overlay-label').textContent,'继续');x.key('Enter');x.advance(69000);assert.equal(get('name-dialog').open,true);assert.equal(get('scene-overlay').hidden,false);assert.equal(get('overlay-title').textContent,'本局完成');assert.equal(get('score').textContent,'1');assert.equal(get('overlay-description').textContent,'准确率100%');get('name-skip').click();assert.equal(x.data().boards['0:1'].length,0);assert.equal(x.data().lastResults['0:1'].score,1);
 x=boot();get=x.$;x.key('Enter');x.advance(60000);assert.equal(x.document.querySelector('dialog[open]'),null);assert.equal(x.data().lastResults['0:1'].completed,true);assert.equal(x.data().boards['0:1'].length,0);assert.equal(get('overlay-description').textContent,'准确率100%');assert.equal(get('primary-action').hidden,true);
 get('settings-button').click();get('import-file').files=[{size:50,text:async()=>'{broken'}];const before=x.storage.get('typestory.v2');await get('import-file').onchange();assert.equal(x.storage.get('typestory.v2'),before);assert.ok(get('import-status').textContent.startsWith('未导入'));
 const incoming=x.data();incoming.settings.stage=3;incoming.settings.help=false;incoming.lastName='Test';get('import-file').files=[{size:500,text:async()=>JSON.stringify(incoming)}];await get('import-file').onchange();assert.equal(get('confirm-dialog').open,true);get('confirm-cancel').click();assert.equal(get('settings').open,true);assert.equal(x.data().settings.stage,0);
 await get('import-file').onchange();get('confirm-ok').click();assert.equal(x.data().settings.stage,3);assert.equal(x.data().settings.help,false);assert.equal(get('settings').open,true);assert.equal(get('help-state').textContent,'关闭');
 x.document.querySelector('[data-close="settings"]').click();x.key('Enter');get('settings-button').click();assert.equal(get('import').disabled,true);get('settings').dispatch('cancel');assert.equal(get('overlay-label').textContent,'继续');
 console.log('PASS: help-scene hit pause, zero-score exclusion, name skip, transactional import cancel/accept/failure and active-game import lock');
})().catch(error=>{console.error(error);process.exitCode=1;});

// Exercise each normal-mode location and the actual DOM animation lifecycle.
for(let position=0;position<3;position++){
 const x=boot({},false,()=> (position+.1)/3),get=x.$;
 get('help').checked=false;get('help').dispatch('change');
 assert.equal(get('holes').children.length,3);
 x.key('Enter');
 let occupied=x.document.querySelector('.occupied');
 assert.equal(Number(occupied.dataset.position),position);
 assert.equal(occupied.querySelector('.mole-letter').parentElement.className,'hole-sign');
 assert.equal(occupied.querySelector('.mole-actor').parentElement.className,'hole-burrow');
 const target=occupied.querySelector('.mole-letter').textContent;
 x.tap(target==='a'?'s':'a');assert.equal(get('score').textContent,'0');assert.equal(Number(x.document.querySelector('.occupied').dataset.position),position);assert.ok(occupied.querySelector('.mole-body').src.split('?')[0].endsWith('mole-hit.svg'));assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='wrong').length,1);
 x.tap(target);x.tap(target);x.tap('!');assert.equal(get('score').textContent,'1');
 x.advance(100);
 const body=occupied.querySelector('.mole-body');assert.ok(body.src.split('?')[0].endsWith('mole-hit.svg'));
 assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='mole-contact').length,1);
 x.key('Escape');const pose=body.style.transform;x.advance(5000);assert.equal(body.style.transform,pose);
 assert.equal(get('help').disabled,true);assert.equal(get('scene-overlay').hidden,false);
 x.key('Enter');x.advance(5120);assert.ok(body.style.transform.includes('translateY'));
 x.advance(5400);assert.ok(body.style.transform.includes('translateY'));
 x.advance(5480);assert.equal(body.style.opacity,'0');
 assert.equal(get('holes').children.length,3);
 assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='mole-contact').length,1);assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='mole-bounce').length,1);
 x.advance(5550);occupied=x.document.querySelector('.occupied');
 assert.equal(Number(occupied.dataset.position),position);
 assert.equal(occupied.querySelector('.mole-body').style.opacity,'1');
 assert.equal(x.document.querySelectorAll('.mole-actor').length,1);
 x.key('Escape');get('end').click();assert.equal(x.document.querySelectorAll('.mole-actor').length,0);
 get('overlay-action').click();assert.equal(get('score').textContent,'0');assert.equal(get('scene-overlay').hidden,true);
 assert.equal(get('holes').children.length,3);assert.equal(x.document.querySelectorAll('.mole-actor').length,1);
}
console.log('PASS: all three normal locations, unified scene structure, hit once, frozen animation, retreat, respawn and restart cleanup');

// Shortcuts must win over focused controls, including a stage's target handler.
for(const focus of ['help','stage','primary-action','restart','end','settings-button','leaderboard-button']){
 const x=boot(),get=x.$,target=focus==='stage'?get('stage-options').children[2]:get(focus);
 assert.equal(x.eventOptions.keydown,true);
 if(focus==='help'){get('help').checked=false;get('help').dispatch('change');}
 target.focus();let event=x.key('Enter');assert.equal(event.prevented,true);assert.equal(event.stopped,true);
 assert.equal(get('scene-overlay').hidden,true);assert.equal(x.document.querySelector('dialog[open]'),null);
 assert.equal(x.data().settings.stage,0);assert.equal(x.data().settings.help,focus!=='help');
 x.key('Enter');assert.equal(get('scene-overlay').hidden,true); // Does not click a focused button.
 target.focus();event=x.key('Escape');assert.equal(event.prevented,true);assert.equal(get('overlay-title').textContent,'已暂停');
 assert.equal(get('restart').hidden,false);assert.ok([...get('stage-options').children].every(b=>b.disabled));
 assert.equal(get('stage-options').children[0].querySelector('.stage-check').textContent,'当前');
 assert.equal(get('help').disabled,true);x.key('Enter',{shiftKey:true});assert.equal(get('overlay-title').textContent,'已暂停');
 target.focus();x.key('Enter');assert.equal(get('scene-overlay').hidden,true);assert.equal(get('score').textContent,'0');
 x.key('Escape');get('end').click();assert.ok([...get('stage-options').children].every(b=>!b.disabled));
}
// Free practice: sounds and highlights never score or resume a paused animation.
{
 const x=boot(),get=x.$,keyEl=code=>x.document.querySelector(`[data-code="${code}"]`);
 for(const [key,code] of [['a','KeyA'],[' ','Space'],['Shift','ShiftLeft'],['CapsLock','CapsLock'],['Backspace','Backspace'],['ArrowLeft','ArrowLeft'],['ArrowUp','ArrowUp'],['ArrowDown','ArrowDown'],['ArrowRight','ArrowRight'],['Tab','Tab']]){
  const count=x.audio.filter(a=>a[0]==='play'&&a[1]==='key').length;
  x.key(key,{code});assert.ok(keyEl(code).className.split(' ').includes('pressed'));assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='key').length,count+1);
  x.key(key,{code,repeat:true});assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='key').length,count+1);
  x.keyup(false,false,code);assert.ok(!keyEl(code).className.split(' ').includes('pressed'));
 }
 x.key('Enter');x.tap(x.document.querySelector('.mole-letter').textContent);x.advance(130);x.key('Escape');
 const before=x.storage.get('typestory.v2'),score=get('score').textContent,time=get('time').textContent,pose=x.document.querySelector('.mole-body').style.transform;
 x.key('z');x.advance(5000);assert.equal(get('score').textContent,score);assert.equal(get('time').textContent,time);assert.equal(x.document.querySelector('.mole-body').style.transform,pose);assert.equal(x.storage.get('typestory.v2'),before);
 get('settings-button').click();const count=x.audio.filter(a=>a[0]==='play'&&a[1]==='key').length;x.key('z');assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='key').length,count);
 assert.equal(x.document.querySelectorAll('.pressed').length,0);get('settings').dispatch('cancel');assert.equal(get('overlay-title').textContent,'已暂停');
 get('restart').click();assert.equal(get('score').textContent,'0');assert.equal(get('time').textContent,'60');assert.equal(get('scene-overlay').hidden,true);assert.equal(x.storage.get('typestory.v2'),before);assert.equal(x.document.querySelector('.mole-body').style.transform,'none');
 x.advance(6000);assert.equal(get('time').textContent,'59');assert.equal(x.audio.filter(a=>a[0]==='play'&&a[1]==='mole-bounce').length,0);
 x.advance(65000);if(get('name-dialog').open)get('name-skip').click();const saved=JSON.stringify(x.data().lastResults);
 x.key('a');assert.equal(get('overlay-title').textContent,'本局完成');x.key('Enter');x.key('Escape');get('restart').click();assert.equal(JSON.stringify(x.data().lastResults),saved);assert.equal(get('time').textContent,'60');
}
console.log('PASS: capture shortcuts across control focus, native-action suppression, disabled controls, idle sounds, frozen scores and restart isolation');

// The scene mask must contain no controls; all states use the same external bar.
{
 const x=boot(),get=x.$,bar=x.document.querySelector('.game-bar');
 assert.ok(get('help').closest('.stages'));assert.equal(get('help').closest('.game-bar'),null);
 assert.equal(get('scene-overlay').children.length,0);assert.equal(get('scene-overlay').textContent.trim(),'');
 for(const id of ['overlay-title','overlay-description','score','time','primary-action','overlay-action','restart','end'])assert.equal(get(id).closest('.game-bar'),bar);
 assert.equal(get('overlay-title').textContent,'准备开始');assert.equal(get('overlay-action').hidden,false);assert.equal(get('primary-action').hidden,true);
 x.key('Enter');assert.equal(get('overlay-title').textContent,'进行中');assert.equal(get('overlay-description').hidden,true);assert.equal(get('overlay-action').hidden,true);assert.equal(get('primary-action').hidden,false);
 x.key('Escape');assert.equal(get('overlay-title').textContent,'已暂停');assert.equal(get('overlay-description').hidden,false);assert.equal(get('overlay-action').hidden,false);assert.equal(get('restart').hidden,false);assert.equal(get('end').hidden,false);assert.equal(get('primary-action').hidden,true);
 get('end').click();assert.equal(get('overlay-title').textContent,'本局已结束');assert.equal(get('restart').hidden,true);assert.equal(get('end').hidden,true);
 x.key('a');assert.ok(x.document.querySelector('[data-code="KeyA"]').className.split(' ').includes('pressed'));
 x.key('Enter');x.advance(60000);assert.equal(get('overlay-title').textContent,'本局完成');assert.equal(get('overlay-description').textContent,'准确率100%');assert.equal(get('overlay-action').hidden,false);assert.equal(get('scene-overlay').hidden,false);
}
console.log('PASS: stage-row help, unobstructed scene mask and one consistent status/action bar in all five states');

// Dynamic pictures follow the HTML release, including the hit-expression swap.
{
 const x=boot(),get=x.$,version=x.document.querySelector('meta[name="asset-version"]').getAttribute('content');
 const checkImages=()=>{for(const img of x.document.querySelectorAll('img'))if(img.src){const [file,query]=img.src.split('?');assert.equal(query,'v='+version);assert.ok(fs.existsSync(path.join(root,file)));}};
 x.key('Enter');checkImages();x.tap(x.document.querySelector('.mole-letter').textContent);x.advance(100);checkImages();
 assert.equal(x.document.querySelector('.mole-body').src,'assets/images/mole-hit.svg?v='+version);
 x.key('Escape');get('end').click();get('help').checked=false;get('help').dispatch('change');checkImages();x.key('Enter');checkImages();
 assert.ok(x.document.querySelector('.mole-hammer').src.endsWith('?v='+version));
}
console.log('PASS: dynamic lock, mole, hammer, hole and hit-expression images use the same HTML release');

// Real keydown/keyup pairs, with clock movement independent of rendering.
function startWith(char='a',stage=0){
 let random=0;const x=boot({},false,()=>random);x.$('stage-options').children[stage].click();
 const pool=x.stages[stage].chars;random=(pool.indexOf(char)+.1)/pool.length;x.key('Enter');
 assert.equal(x.document.querySelector('.mole-letter').textContent,char);return x;
}
function releaseChar(x,char,caps=false,shift=false){x.keyup(caps,shift,x.codeFor(char));}
for(const duration of [39,40,41])for(const targetFirst of [true,false])for(const targetReleasedFirst of [true,false]){
 const x=startWith(),get=x.$;
 x.key(targetFirst?'a':'s');assert.equal(get('score').textContent,'0');x.time(10);x.key(targetFirst?'s':'a');
 assert.equal(get('score').textContent,'0');x.time(10+duration);
 releaseChar(x,targetReleasedFirst?'a':'s');releaseChar(x,targetReleasedFirst?'s':'a');
 assert.equal(get('score').textContent,duration<=40?'1':'0');
 if(duration>40){assert.equal(get('message').textContent,'请一次按一个字符键');assert.equal(x.audio.filter(a=>a[0]==='play'&&['wrong','mole-contact','mole-bounce'].includes(a[1])).length,0);x.tap('a');assert.equal(get('score').textContent,'1');}
 x.advance(60000);assert.equal(x.data().lastResults['0:1'].errors,duration>40||targetReleasedFirst?0:1);
}
for(const sequence of [['a','s','d'],['s','a','d'],['s','d','a']]){
 const x=startWith();for(const key of sequence)x.key(key);
 assert.equal(x.$('score').textContent,'0');releaseChar(x,'s');x.tap('f');releaseChar(x,'a');
 assert.equal(x.$('score').textContent,'0');releaseChar(x,'d');x.tap('a');assert.equal(x.$('score').textContent,'1');
 x.advance(60000);assert.equal(x.data().lastResults['0:1'].errors,0);
}
// Shift may be released before the character: judge the captured character.
for(const code of ['ShiftLeft','ShiftRight'])for(const [char,stage] of [['A',2],['!',3],['{',3]]){
 const x=startWith(char,stage);x.key('Shift',{code,shiftKey:true});x.key(char,{shiftKey:true});
 assert.equal(x.$('score').textContent,'0');x.keyup(false,false,code);releaseChar(x,char);
 assert.equal(x.$('score').textContent,'1');
}
{
 const x=startWith('A',2);x.key('CapsLock',{getModifierState:()=>true});x.keyup(true);
 x.key('A',{getModifierState:()=>true});releaseChar(x,'A',true);assert.equal(x.$('score').textContent,'1');
}
// Space is a character key, so it participates in the same overlap guard.
{
 const x=startWith();x.key('a');x.key(' ');x.time(41);releaseChar(x,' ');releaseChar(x,'a');
 assert.equal(x.$('score').textContent,'0');x.advance(60000);assert.equal(x.data().lastResults['0:1'].errors,0);
}
// Interrupted or composing inputs must never score on a late release.
for(const interruption of ['pause','settings','blur','composition','restart','end']){
 const x=startWith();x.key('a');
 if(interruption==='pause'){x.key('Escape');x.key('Enter');}
 if(interruption==='settings'){x.$('settings-button').click();x.$('settings').dispatch('cancel');x.key('Enter');}
 if(interruption==='blur'){x.events.blur();x.key('Enter');}
 if(interruption==='composition')x.events.compositionstart();
 if(interruption==='restart'){x.key('Escape');x.$('restart').click();}
 if(interruption==='end'){x.key('Escape');x.$('end').click();x.key('Enter');}
 releaseChar(x,'a');assert.equal(x.$('score').textContent,'0');x.tap('a');assert.equal(x.$('score').textContent,'1');
}
{
 const x=startWith();x.key('a');x.time(60000);releaseChar(x,'a');assert.equal(x.$('score').textContent,'0');assert.equal(x.data().lastResults['0:1'].score,0);
}
{
 const x=startWith();x.key('a');x.time(59999);releaseChar(x,'a');assert.equal(x.$('score').textContent,'1');x.advance(60000);assert.equal(x.data().lastResults['0:1'].score,1);
}
// An animation key may stay held into the next target but never becomes a candidate.
{
 const x=startWith();x.tap('a');x.key('s');x.advance(650);assert.equal(x.document.querySelector('.mole-letter').textContent,'s');releaseChar(x,'s');assert.equal(x.$('score').textContent,'1');x.tap('s');assert.equal(x.$('score').textContent,'2');
}
{
 const x=startWith();x.key('a');x.key('a',{repeat:true});assert.equal(x.$('score').textContent,'0');releaseChar(x,'a');releaseChar(x,'a');assert.equal(x.$('score').textContent,'1');
}
console.log('PASS: release-only scoring, 39/40/41ms all press/release orders, three-key groups, modifiers, space, cancellations, timer boundary and animation isolation');

// Candidates created for the old target must not survive a target revision.
{
 const x=startWith();x.key('a');x.time(10);x.key('s');x.time(20);releaseChar(x,'a');assert.equal(x.$('score').textContent,'1');
 x.advance(670);assert.equal(x.document.querySelector('.mole-letter').textContent,'s');releaseChar(x,'s');assert.equal(x.$('score').textContent,'1');x.tap('s');assert.equal(x.$('score').textContent,'2');
}
// Caps + Shift still judges the lowercase snapshot after Shift is released.
{
 const x=startWith();x.key('CapsLock',{getModifierState:()=>true});x.keyup(true);x.key('Shift',{code:'ShiftRight',shiftKey:true,getModifierState:()=>true});
 x.key('a',{shiftKey:true,getModifierState:()=>true});x.keyup(true,false,'ShiftRight');releaseChar(x,'a',true);assert.equal(x.$('score').textContent,'1');
}
for(const [key,code,flag] of [['Meta','MetaLeft','metaKey'],['Control','ControlLeft','ctrlKey'],['Alt','AltLeft','altKey']]){
 const x=startWith();x.key('a');x.key(key,{code,[flag]:true});releaseChar(x,'a');assert.equal(x.$('score').textContent,'0');
}
console.log('PASS: target revision isolation, Caps/Shift snapshot and system-combination cancellation');

// External numeric keypads also produce characters, even without screen keycaps.
{
 const x=startWith('1',3);x.key('1',{code:'Numpad1'});assert.equal(x.$('score').textContent,'0');x.keyup(false,false,'Numpad1');assert.equal(x.$('score').textContent,'1');
}
{
 const x=startWith();x.key('a');x.key('1',{code:'Numpad1'});x.time(41);x.keyup(false,false,'Numpad1');releaseChar(x,'a');assert.equal(x.$('score').textContent,'0');x.advance(60000);assert.equal(x.data().lastResults['0:1'].errors,0);
}
console.log('PASS: external numeric keypad input and mixed-keypad overlap guard');

// Viewport size affects layout only, never gameplay eligibility or pause state.
for(const [width,height] of [[1280,700],[1024,600],[768,600],[390,700],[1280,500],[260,300]]){
 for(const help of [true,false]){
  const x=boot({},false,()=>0,{width,height}),get=x.$;
  assert.equal(get('viewport-warning'),null);
  get('help').checked=help;get('help').dispatch('change');
  x.key('a');assert.ok(x.document.querySelector('[data-code="KeyA"]').className.includes('pressed'));x.keyup(false,false,'KeyA');
  x.key('Enter');assert.equal(get('scene-overlay').hidden,true);assert.equal(get('primary-label').textContent,'暂停');
  x.key('a');x.resize(200,240);x.keyup(false,false,'KeyA');assert.equal(get('score').textContent,'1');
  x.advance(1000);assert.equal(get('time').textContent,'59');assert.equal(get('scene-overlay').hidden,true);
  x.key('Escape');x.advance(5000);assert.equal(get('time').textContent,'59');x.resize(1440,900);assert.equal(get('overlay-title').textContent,'已暂停');
  x.key('Enter');x.advance(6000);assert.equal(get('time').textContent,'58');
  get('settings-button').click();assert.equal(get('settings').open,true);assert.equal(get('overlay-title').textContent,'已暂停');
  x.document.querySelector('[data-close="settings"]').click();x.key('Enter');x.events.blur();assert.equal(get('overlay-title').textContent,'已暂停');
  x.key('Enter');x.advance(64000);assert.equal(get('overlay-title').textContent,'本局完成');assert.equal(x.data().lastResults['0:'+(help?'1':'0')].score,1);
 }
}
console.log('PASS: unrestricted small-window start/input/scoring, resize without auto-pause, explicit pause/resume, dialogs, blur and completion in both scenes');
