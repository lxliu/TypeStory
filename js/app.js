(() => {
 'use strict';
 const $=id=>document.getElementById(id),K=TSKeyboard,C=TSCore,L=TSLessons;
 let data=C.defaults(),mode=null,session=null,shift=false,caps=false,hole=0,phraseId=null,finished=false,storageOK=true,lastFreeChar=null,freeAutoStart=false;
 const storageKey='typestory.v1';
 function storageWarning(){storageOK=false;$('storage-warning').hidden=false;$('storage-warning').textContent='此浏览器暂时无法自动保存进度。仍然可以练习，请在设置中导出备份。';}
 try{localStorage.setItem(storageKey+'.probe','1');localStorage.removeItem(storageKey+'.probe');const saved=localStorage.getItem(storageKey);if(saved)data=C.validate(JSON.parse(saved));}catch(_){storageWarning();}
 function save(){try{localStorage.setItem(storageKey,JSON.stringify(data));if(!storageOK){storageOK=true;$('storage-warning').hidden=true;}}catch(_){storageWarning();}}
 function syncMusic(){if(mode==='mole'&&session&&session.active&&!session.paused){TSAudio.startMusic(data.settings);if(session.moleEffect?.kind==='hit')TSAudio.duckMusic((1-session.hitProgress)*.45);}else TSAudio.pauseMusic();}
 function sound(kind){TSAudio.play(kind,data.settings);}
 function textChar(c){return c===' '?'空格':c;}
 function selectedStage(){return Number($('stage').value)||0;}
 function applySettings(){document.body.dataset.size=data.settings.size;for(const id of ['layout','size','volume','mute','musicEnabled','musicVolume']){if(id==='mute'||id==='musicEnabled')$(id).checked=data.settings[id];else $(id).value=data.settings[id];}renderKeyboard();syncMusic();}
 function renderKeyboard(){
  $('keyboard').replaceChildren();K.rows.forEach(row=>{const div=document.createElement('div');div.className='key-row';row.forEach(k=>{const el=document.createElement('div');el.className='key'+(k.base.length>1?' function':'')+(['KeyF','KeyJ'].includes(k.code)?' home':'');el.dataset.code=k.code;el.style.setProperty('--width',k.width);if(k.finger)el.style.setProperty('--finger',K.colors[k.finger]);const label=document.createElement('span');let value=k.base;if(k.base.length===1)value=(/^Key/.test(k.code)?shift!==caps:shift)?k.upper:k.base;if(k.code==='Space')value='空格';if(data.settings.layout==='windows'){value=({AltLeft:'alt',AltRight:'alt',MetaLeft:'win',MetaRight:'win',Enter:'enter',Backspace:'backspace',Fn:'menu'})[k.code]||value;}label.className='key-label';label.textContent=value;el.append(label);if(k.code==='ArrowUp'){const stack=document.createElement('div');stack.className='arrow-stack';stack.append(el);div.append(stack);}else if(k.code==='ArrowDown'){div.querySelector('.arrow-stack').append(el);}else div.append(el);});$('keyboard').append(div);});
  renderTarget();
 }
 function keyEl(code){return $('keyboard').querySelector('[data-code="'+code+'"]');}
 function teaching(char){const g=K.guidance(char);if(!g)return '';return (char===' '?'按最下面的长空格键 · 拇指':g.key.base.toUpperCase()+' 键 · '+g.label)+(g.shift?' · 按住任意 Shift':'');}
 function renderTarget(){
  document.querySelectorAll('.target,.shift-target').forEach(el=>el.classList.remove('target','shift-target'));
  document.querySelectorAll('.target-content,.finger-label,.shift-instruction').forEach(el=>el.remove());
  const playing=session&&session.active,show=mode==='free'||$('help').checked;
  $('scene').dataset.help=show?'true':'false';
  $('keyboard-area').hidden=!show;
  $('hint-card').hidden=!(playing&&!show&&session.hinted);
  $('hint-card').replaceChildren();
  if(playing&&!show&&session.hinted){const letter=document.createElement('strong');letter.textContent=textChar(session.expected);const description=document.createElement('span');description.textContent=teaching(session.expected);$('hint-card').append(letter,description);}
  if(mode==='mole')renderHoles();
  const char=mode==='free'?lastFreeChar:playing?session.expected:null,g=char===null?null:K.guidance(char);
  if(g&&show){
   const el=keyEl(g.key.code);el.classList.add('target');
   const finger=document.createElement('span');finger.className='finger-label';finger.textContent=g.label;
   if(mode==='mole'){
    const content=document.createElement('div');content.className='target-content';
    const letter=document.createElement('span');letter.className='mole-letter';letter.textContent=char;
    content.append(letter,makeMole(),finger);el.append(content);
   }else el.append(finger);
   if(g.shift)g.shiftCodes.forEach(code=>{const shiftKey=keyEl(code);shiftKey.classList.add('shift-target');const instruction=document.createElement('span');instruction.className='shift-instruction';instruction.textContent='按住';shiftKey.append(instruction);});
  }
  if(mode==='phrase'&&session){const board=$('phrase-board');board.replaceChildren();[...session.target].forEach((c,i)=>{const el=document.createElement('span');el.className=(c===' '?'space-char ':'')+'char '+(i<session.index?'done':i===session.index?'current':'pending');el.textContent=textChar(c);el.setAttribute('aria-label',(i<session.index?'已完成 ':i===session.index?'当前输入 ':'未开始 ')+(c===' '?'空格':c));board.append(el);});}
 }

 function makeMole(){
  const actor=document.createElement('div');actor.className='mole-actor';
  const image=document.createElement('img');image.className='mole-body';image.src='assets/images/mole-bust.svg';image.alt='等待输入的地鼠';
  const hammer=document.createElement('img');hammer.className='mole-hammer';hammer.src='assets/images/hammer.svg';hammer.alt='';
  const stars=document.createElement('span');stars.className='mole-stars';stars.textContent='✦ ✧';stars.setAttribute('aria-hidden','true');
  const plus=document.createElement('span');plus.className='mole-plus';plus.textContent='+1';plus.setAttribute('aria-hidden','true');
  actor.append(image,hammer,stars,plus);return actor;
 }
 function renderHoles(){
  const visible=mode==='mole'&&!$('help').checked;$('holes').hidden=!visible;$('holes').replaceChildren();if(!visible)return;
  for(let i=0;i<9;i++){const div=document.createElement('div');div.className='hole';if(i===hole&&session&&session.active){const char=document.createElement('span');char.className='mole-letter';char.textContent=session.expected;div.append(char,makeMole());}$('holes').append(div);}
 }
 const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 function paintMoleEffect(){
  if(mode!=='mole')return;
  const effect=session?.moleEffect,age=effect?session.elapsed-effect.start:0;
  for(const actor of document.querySelectorAll('.mole-actor')){
   const body=actor.querySelector('.mole-body'),hammer=actor.querySelector('.mole-hammer'),stars=actor.querySelector('.mole-stars'),plus=actor.querySelector('.mole-plus');
   body.style.transform='none';body.style.opacity='1';hammer.style.opacity='0';stars.style.opacity='0';plus.style.opacity='0';
   if(!effect||!session.active)continue;
   if(effect.kind==='wrong'){if(age<300&&!reducedMotion.matches)body.style.transform='rotate('+Math.sin(age/300*Math.PI*4)*9+'deg)';continue;}
   const p=session.hitProgress;
   stars.style.opacity=p>.12&&p<.85?'1':'0';plus.style.opacity=p>.15?'1':'0';
   body.alt='打中了，地鼠正在跑回洞里';
   if(reducedMotion.matches){body.style.opacity=p>.75?'0':'1';continue;}
   hammer.style.opacity=p<.42?'1':'0';hammer.style.transform='rotate('+(-45+Math.sin(Math.min(1,p/.3)*Math.PI)*80)+'deg)';
   if(p<.25)body.style.transform='scale('+(1+.18*Math.sin(p/.25*Math.PI))+','+(1-.3*Math.sin(p/.25*Math.PI))+')';
   else if(p<.6)body.style.transform='translateY('+(-14*Math.sin((p-.25)/.35*Math.PI))+'%)';
   else {body.style.transform='translateY('+((p-.6)/.4*85)+'%) scale('+(1-(p-.6)/.4*.65)+')';body.style.opacity=String(1-(p-.6)/.4);}
   stars.style.transform='scale('+(1+p*.3)+')';plus.style.transform='translateY('+(-p*16)+'px)';
  }
 }
 function updateStats(){const stage=selectedStage();$('stage-progress').hidden=mode!=='phrase';if(mode==='phrase'){const p=C.stageProgress(data.progress,stage);$('stage-progress').textContent='本阶段已完成 '+p.completed+'/'+p.total;}if(!session){$('score').textContent='准备开始';$('time').textContent='';$('accuracy').textContent='';$('progress').textContent='';return;}$('score').textContent=mode==='mole'?'⭐ '+session.correct+' 分':'✓ '+session.correct+' 次正确';$('time').textContent=mode==='mole'?'⏱ 剩余 '+Math.ceil((60000-session.elapsed)/1000)+' 秒':'⏱ '+Math.floor(session.elapsed/1000)+' 秒';$('accuracy').textContent='准确率 '+session.accuracy+'%';$('progress').textContent=mode==='phrase'?'进度 '+session.index+'/'+session.target.length+' · 求助 '+session.hints+' 次':'求助 '+session.hints+' 次';}
 function selectMode(next){stop();mode=next;$('home').hidden=true;$('play').hidden=false;document.body.dataset.mode=mode;$('reset-stage').hidden=mode!=='phrase';$('mode-title').textContent={free:'键盘探索',mole:'地鼠出没',phrase:'短句小径'}[mode];$('free-display').hidden=mode!=='free';$('phrase-board').hidden=mode!=='phrase';$('phrase-board').replaceChildren();$('stage-label').hidden=mode==='free';$('help-label').hidden=mode==='free';$('stage').replaceChildren();(mode==='phrase'?L.phrases:L.stages).forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=s.name;$('stage').append(o);});if(mode==='phrase'){$('stage').value=data.progress.stage;$('help').checked=data.progress.help;}$('message').textContent=mode==='free'?'点击开始，然后用实体键盘探索。':'选择阶段与帮助模式，准备好了就开始。';$('start').textContent=mode==='phrase'?'继续练习':'开始练习';freeAutoStart=mode==='free';renderKeyboard();updateStats();}
 function stop(){freeAutoStart=false;TSAudio.stopMusic();lastFreeChar=null;session=null;finished=false;if($('result').open)$('result').close();$('pause').hidden=true;$('end').hidden=true;$('hint').hidden=true;$('holes').hidden=true;$('start').hidden=false;$('stage').disabled=false;$('help').disabled=false;}
 function newMole(){const chars=L.stages[selectedStage()].chars;const pool=[...chars].filter(c=>c!==session.target);session.target=pool[Math.floor(Math.random()*pool.length)]||chars[0];session.hinted=false;hole=Math.floor(Math.random()*9);}
 function start(){freeAutoStart=false;TSAudio.stopMusic();TSAudio.enable();finished=false;if($('result').open)$('result').close();const now=performance.now();if(mode==='phrase'){data.progress.stage=selectedStage();data.progress.help=$('help').checked;phraseId=C.pickPhrase(data.progress,selectedStage());data.progress.current=phraseId;const [s,i]=phraseId.split(':').map(Number);session=new C.Session(mode,L.phrases[s].texts[i],now);save();}else{session=new C.Session(mode,'',now);if(mode==='mole')newMole();}$('stage').disabled=true;$('help').disabled=false;$('start').hidden=true;$('pause').hidden=false;$('end').hidden=false;$('pause').textContent='暂停';$('hint').hidden=mode==='free'||$('help').checked;$('message').textContent=mode==='free'?'双手轻放在 F 和 J，随意敲一敲。':'准确比快更重要，地鼠会等你。';renderTarget();updateStats();syncMusic();}
 function pause(){if(!session||!session.active||session.paused)return;session.pause(performance.now());TSAudio.silence('effect');syncMusic();if(!session.active){finish();return;}$('pause').textContent='继续练习';$('message').textContent='已暂停，准备好后点击继续练习。';}
 function finish(completed=true){if(finished)return;finished=true;TSAudio.stopMusic();if(completed)sound('complete');if(mode==='phrase'&&completed){data.progress.completed[phraseId]=true;data.progress.last[selectedStage()]=phraseId;data.progress.current=null;const old=data.progress.best[phraseId];data.progress.best[phraseId]={accuracy:Math.max(old?old.accuracy:0,session.accuracy),seconds:Math.min(old?old.seconds:Infinity,session.elapsed/1000)};save();}$('pause').hidden=true;$('end').hidden=true;$('hint').hidden=true;$('stage').disabled=false;$('help').disabled=false;$('start').hidden=false;$('start').textContent=mode==='phrase'?'下一条练习':'再挑战一次';if(!$('result').open)$('result').showModal();$('result').replaceChildren();const h=document.createElement('h2');h.textContent=mode==='phrase'?(completed?'🌼 小句子完成啦！':'这条短句还没完成'):'🌼 这一局，做得不错！';const p=document.createElement('p');p.textContent=(mode==='mole'?'得分 '+session.correct+' · ':'耗时 '+(session.elapsed/1000).toFixed(1)+' 秒 · ')+'准确率 '+session.accuracy+'% · 求助 '+session.hints+' 次';const mistakes=document.createElement('p');const top=Object.entries(session.mistakes).sort((a,b)=>b[1]-a[1]).slice(0,3);mistakes.textContent=!completed&&mode==='phrase'?'这条题目已保留，下次从开头继续练习。':top.length?'下次一起练：'+top.map(([c,n])=>textChar(c)+'（'+n+' 次）').join('、'):'每一次都输入正确，继续保持！';const again=document.createElement('button');again.className='primary';again.textContent=mode==='phrase'?(completed?'继续下一条':'重新练这一条'):'再玩一次';again.onclick=start;const stay=document.createElement('button');stay.textContent='留在这里';stay.onclick=()=>{$('result').close();};const back=document.createElement('button');back.textContent='返回首页';back.onclick=goHome;$('result').append(h,p,mistakes,again,stay,back);$('message').textContent='休息一下手指，也看看远处。';updateStats();renderTarget();}
 function goHome(){stop();mode=null;delete document.body.dataset.mode;$('home').hidden=false;$('play').hidden=true;}
 function flash(el,cls){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),250);}
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>selectMode(b.dataset.mode));$('back').onclick=goHome;document.querySelector('.brand').onclick=e=>{e.preventDefault();goHome();};$('start').onclick=start;$('pause').onclick=()=>{if(session.paused){TSAudio.enable();session.resume(performance.now());syncMusic();$('pause').textContent='暂停';$('message').textContent='继续出发，小手指！';}else pause();};$('hint').onclick=()=>{if(session&&session.hint()){renderTarget();updateStats();}};
 $('stage').onchange=()=>{if(mode==='phrase'){data.progress.stage=selectedStage();save();}updateStats();};$('help').onchange=()=>{if(session){session.hinted=false;if(mode==='mole'&&!$('help').checked)hole=Math.floor(Math.random()*9);}$('hint').hidden=!session||!session.active||mode==='free'||$('help').checked;if(mode==='phrase'){data.progress.help=$('help').checked;save();}renderTarget();};
 window.addEventListener('keydown',e=>{
  if(e.isComposing||e.key==='Process'){if(session&&session.active)$('message').textContent='请先切换到 ABC / 英文输入源。';return;}
  const nextCaps=e.getModifierState('CapsLock'),nextShift=e.shiftKey;if(nextCaps!==caps||nextShift!==shift){caps=nextCaps;shift=nextShift;$('caps').hidden=!caps;renderKeyboard();}
  if(!mode||$('settings').open||$('result').open||$('confirm-dialog').open||window.innerWidth<1280||window.innerHeight<700||(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&e.target.id!=='help'))return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(mode==='free'&&freeAutoStart&&!e.repeat&&keyEl(e.code))start();
  if(session&&session.active&&!session.paused&&e.key.length===1)e.preventDefault();
  if(session&&session.active&&['Tab','Backspace','Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
  const el=keyEl(e.code);if(el)el.classList.add('pressed');if(e.repeat||!session||!session.active||session.paused)return;
  if(mode==='free'){if(el){TSAudio.enable();sound('key');}if(e.key.length===1){lastFreeChar=e.key;$('typed').textContent=textChar(e.key);renderTarget();}return;}
  if(e.key.length!==1)return;
  const expected=session.expected,outcome=session.input(e.key,performance.now());if(outcome==='ignored'){if(!session.active)finish();return;}
  if(outcome==='wrong'){
   sound('wrong');if(mode==='phrase')flash($('phrase-board').querySelector('.current'),'wrong-feedback');
   $('message').textContent=caps&&/[a-z]/.test(expected)&&e.key===expected.toUpperCase()?'当前开启了大写锁定，按 Caps Lock 关闭再试试。':'再试一次，目标是 '+textChar(expected)+'。';
  }else{
   sound(mode==='mole'?'mole-hit':'correct');$('message').textContent=mode==='mole'?'打中了！+1':'找到了！继续加油。';
   if(outcome==='complete'){finish();return;}
   if(mode==='phrase'){session.hinted=false;renderTarget();}
  }
  paintMoleEffect();updateStats();
 });
 window.addEventListener('keyup',e=>{const el=keyEl(e.code);if(el)el.classList.remove('pressed');if(shift!==e.shiftKey){shift=e.shiftKey;renderKeyboard();}});
 window.addEventListener('blur',()=>{if(pendingConfirmation)confirmationLostFocus=true;pause();shift=false;document.querySelectorAll('.pressed').forEach(el=>el.classList.remove('pressed'));renderKeyboard();});document.addEventListener('visibilitychange',()=>{if(document.hidden){if(pendingConfirmation)confirmationLostFocus=true;pause();}});
 function frame(now){
  if(session&&session.active&&!session.paused){
   session.tick(now);
   if(!session.active)finish();
   else if(mode==='mole'&&session.takeNextMole()){newMole();renderTarget();}
   updateStats();
  }
  paintMoleEffect();requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 $('settings-button').onclick=()=>{pause();$('saved-progress').textContent=L.phrases.map((p,i)=>{const count=C.stageProgress(data.progress,i);return p.name+'：'+count.completed+'/'+count.total;}).join(' · ');$('settings').showModal();};
 for(const id of ['layout','size','volume','mute','musicEnabled','musicVolume'])$(id).onchange=()=>{data.settings[id]=['mute','musicEnabled'].includes(id)?$(id).checked:['volume','musicVolume'].includes(id)?Number($(id).value):$(id).value;applySettings();save();};
 $('home-settings').onclick=$('settings-button').onclick;
 $('export').onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='typestory-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('import').onclick=()=>$('import-file').click();$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>1000000)throw Error('文件过大');const incoming=C.validate(JSON.parse(await file.text()));data=incoming;save();applySettings();if(mode==='phrase')selectMode('phrase');$('saved-progress').textContent=L.phrases.map((p,i)=>{const count=C.stageProgress(data.progress,i);return p.name+'：'+count.completed+'/'+count.total;}).join(' · ');$('import-status').textContent='进度已导入。';}catch(error){$('import-status').textContent='未导入：'+error.message;}$('import-file').value='';};

 let pendingConfirmation=null,confirmationLostFocus=false;
 function askConfirmation(title,description,action){
  confirmationLostFocus=false;const original=session,wasPaused=!!(session&&session.paused);pause();
  if(original&&!original.active&&title==='结束练习？')return;
  pendingConfirmation={action,original,wasPaused};$('confirm-title').textContent=title;$('confirm-description').textContent=description;$('confirm-dialog').showModal();
 }
 function resolveConfirmation(accepted){const pending=pendingConfirmation;if(!pending)return;pendingConfirmation=null;$('confirm-dialog').close();if(accepted)pending.action();else if(session===pending.original&&session&&session.active&&!pending.wasPaused&&!confirmationLostFocus&&!document.hidden&&document.hasFocus()&&!$('settings').open){session.resume(performance.now());syncMusic();$('pause').textContent='暂停';$('message').textContent='继续出发，小手指！';}}
 $('confirm-cancel').onclick=()=>resolveConfirmation(false);$('confirm-ok').onclick=()=>resolveConfirmation(true);$('confirm-dialog').addEventListener('cancel',e=>{e.preventDefault();resolveConfirmation(false);});
 $('end').onclick=()=>askConfirmation('结束练习？',mode==='phrase'?'这条短句尚未完成，结束后下次从本题开头重新练习。':'结束后会停止本次练习并显示已有成绩。',()=>{if(!session)return;session.end(performance.now());if(mode==='free'){stop();$('message').textContent='已结束，可以重新开始探索。';updateStats();renderTarget();}else finish(false);});
 function requestReset(stage){askConfirmation(stage===null?'重置全部短句进度？':'重置本阶段进度？','将清除'+(stage===null?'全部短句':'当前阶段')+'的完成记录与最好成绩，无法撤销。键盘、字号和声音设置保留。',()=>{C.resetProgress(data.progress,stage);save();if($('settings').open)$('settings').close();if(mode)selectMode(mode);});}
 $('reset-stage').onclick=()=>requestReset(selectedStage());$('reset-all').onclick=()=>requestReset(null);
 document.querySelectorAll('[data-settings-tab]').forEach(button=>button.onclick=()=>{const tab=button.dataset.settingsTab;$('settings-display').hidden=tab!=='display';$('settings-progress').hidden=tab!=='progress';document.querySelectorAll('[data-settings-tab]').forEach(b=>b.setAttribute('aria-selected',b===button));});
 window.addEventListener('resize',()=>{if(window.innerWidth<1280||window.innerHeight<700)pause();});
 applySettings();
})();
