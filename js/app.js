(() => {
 'use strict';
 const $=id=>document.getElementById(id),C=TSCore,K=TSKeyboard,L=TSLessons,A=TSAudio;
 const HOLE_COUNT=3;
 const storageKey='typestory.v2',pressedCodes=new Set(),reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 let data=C.defaults(),session=null,finished=false,shift=false,caps=false,hole=0,storageOK=true,pendingScore=null,confirmation=null,boardStage=0,boardHelp=true,newRecordId=null;
 function storageWarning(){storageOK=false;$('storage-warning').hidden=false;}
 function save(){try{localStorage.setItem(storageKey,JSON.stringify(data));storageOK=true;$('storage-warning').hidden=true;}catch(_){storageWarning();}}
 try{const current=localStorage.getItem(storageKey),legacy=current===null?localStorage.getItem('typestory.v1'):null;if(current!==null)data=C.validate(JSON.parse(current));else if(legacy!==null)data=C.validate(JSON.parse(legacy));localStorage.setItem(storageKey+'.probe','1');localStorage.removeItem(storageKey+'.probe');if(current===null)save();}catch(_){storageWarning();}
 const sound=kind=>A.play(kind,data.settings),running=()=>!!session?.active,openDialog=()=>document.querySelector('dialog[open]');
 function message(value){$('message').textContent=value;}
 function setText(id,value){if($(id).textContent!==String(value))$(id).textContent=value;}
 function syncMusic(){if(running()&&!session.paused&&!openDialog()){A.startMusic(data.settings);if(session.moleEffect?.kind==='hit')A.duckMusic((1-session.hitProgress)*C.MOLE_TIMING.duration/1000);}else A.pauseMusic();}
 function renderControls(){
  const locked=running(),state=session?.state||'ready';
  $('help').checked=data.settings.help;$('help').disabled=locked;$('help-state').textContent=data.settings.help?'开启':'关闭';$('help-note').hidden=!locked;
  setText('stage-note',locked?'本局阶段已固定':'选一个，开始吧');
  [...$('stage-options').children].forEach((button,i)=>{const selected=i===data.settings.stage;button.setAttribute('aria-checked',String(selected));button.setAttribute('aria-disabled',String(locked));button.tabIndex=selected?0:-1;button.querySelector('.stage-check').textContent=selected?'✓ 已选择':'';});
  $('primary-action').style.visibility=state==='running'?'visible':'hidden';$('primary-action').disabled=state!=='running';renderOverlay(state);
  setText('session-state',{ready:'准备',running:'进行中',paused:'已暂停',ended:'已结束'}[state]);
  const last=data.lastResults[C.groupKey(data.settings.stage,data.settings.help)];
  setText('last-result',last?.completed?`上次 ${last.score}分 · 准确率${last.accuracy}%`:'上次：还没练过');
  updateStats();
 }
 function renderOverlay(state){
  const visible=state!=='running',completed=state==='ended'&&session.elapsed===C.DURATION;
  $('scene-overlay').hidden=!visible;$('keyboard-area').inert=visible;$('holes').inert=visible;
  setText('overlay-title',state==='ready'?'准备开始':state==='paused'?'已暂停':completed?'本局完成':'本局已结束');
  setText('overlay-label',state==='paused'?'继续':'开始');$('end').hidden=state!=='paused';
  setText('overlay-description',state==='ready'?'双手放在 F 和 J，眼睛看屏幕。':state==='paused'?'结束后不记录本局成绩':completed?`${session.correct}分 · 准确率${session.accuracy}%`:'本局成绩未记录');
  setText('overlay-hint',state==='paused'?'Enter 继续':state==='ready'?'Enter 开始 · Esc 暂停':'Enter 开始');
  if(visible&&document.activeElement===$('primary-action'))$('overlay-action').focus();
 }
 function updateStats(){setText('score',session?session.correct:0);setText('time',session?Math.ceil((C.DURATION-session.elapsed)/1000):60);}
 function selectStage(index){if(running())return;data.settings.stage=index;session=null;save();renderControls();renderTarget();message('双手放在 F 和 J，眼睛看屏幕。');}
 L.stages.forEach((stage,i)=>{
  const button=document.createElement('button');button.className='stage-option';button.type='button';button.setAttribute('role','radio');button.setAttribute('aria-label',`${i+1} ${stage.name}，示例 ${stage.example}`);
  for(const [cls,text] of [['stage-name',`${i+1} ${stage.name}`],['stage-example',stage.example],['stage-check','']]){const span=document.createElement('span');span.className=cls;span.textContent=text;button.append(span);}
  button.onclick=()=>selectStage(i);button.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.stopPropagation();return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(running())return;const next=e.key==='Home'?0:e.key==='End'?3:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:3))%4;selectStage(next);$('stage-options').children[next].focus();};$('stage-options').append(button);
  const filter=document.createElement('button');filter.textContent=stage.name;filter.onclick=()=>{boardStage=i;renderBoard();};$('board-stages').append(filter);
 });
 function keyEl(code){return $('keyboard').querySelector('[data-code="'+code+'"]');}
 function renderKeyboard(){
  $('keyboard').replaceChildren();K.rows.forEach(row=>{const div=document.createElement('div');div.className='key-row';row.forEach(k=>{const el=document.createElement('div');el.className='key'+(k.base.length>1?' function':'')+(['KeyF','KeyJ'].includes(k.code)?' home':'');el.dataset.code=k.code;el.style.setProperty('--width',k.width);if(k.finger)el.style.setProperty('--finger',K.colors[k.finger]);const label=document.createElement('span');let value=k.base;if(k.base.length===1)value=(/^Key/.test(k.code)?shift!==caps:shift)?k.upper:k.base;if(k.code==='Space')value='空格';if(data.settings.layout==='windows')value=({AltLeft:'alt',AltRight:'alt',MetaLeft:'win',MetaRight:'win',Enter:'enter',Backspace:'backspace',Fn:'menu'})[k.code]||value;label.className='key-label';label.textContent=value;el.append(label);if(pressedCodes.has(k.code))el.classList.add('pressed');if(k.code==='ArrowUp'){const stack=document.createElement('div');stack.className='arrow-stack';stack.append(el);div.append(stack);}else if(k.code==='ArrowDown')div.querySelector('.arrow-stack').append(el);else div.append(el);});$('keyboard').append(div);});renderTarget();
 }
 function syncModifiers(e){const nextCaps=e.getModifierState('CapsLock'),nextShift=e.shiftKey;if(nextCaps===caps&&nextShift===shift)return;caps=nextCaps;shift=nextShift;$('caps').hidden=!caps;renderKeyboard();}
 function clearPressedKeys(){pressedCodes.clear();shift=false;renderKeyboard();}
 function renderTarget(){
  document.querySelectorAll('.target,.shift-target').forEach(el=>el.classList.remove('target','shift-target'));document.querySelectorAll('.target-content,.shift-instruction').forEach(el=>el.remove());
  $('keyboard-area').hidden=!data.settings.help;$('holes').hidden=data.settings.help;$('holes').replaceChildren();
  if(!data.settings.help){
   for(let i=0;i<HOLE_COUNT;i++){
    const el=document.createElement('div');el.className='hole';el.dataset.position=i;
    const sign=document.createElement('div');sign.className='hole-sign';
    const burrow=document.createElement('div');burrow.className='hole-burrow';
    const ground=document.createElement('img');ground.className='hole-ground';ground.src='assets/images/hole.svg';ground.alt='';burrow.append(ground);
    if(running()&&i===hole){
     el.classList.add('occupied');const letter=document.createElement('span');letter.className='mole-letter';letter.textContent=session.target;sign.append(letter);
     const front=document.createElement('img');front.className='hole-front';front.src='assets/images/hole-front.svg';front.alt='';burrow.append(makeMole(),front);
    }
    el.append(sign,burrow);$('holes').append(el);
   }
  }
  else if(running()){
   const g=K.guidance(session.target),key=keyEl(g.key.code),content=document.createElement('div');key.classList.add('target');content.className='target-content';
   const letter=document.createElement('span');letter.className='mole-letter';letter.textContent=session.target;content.append(letter,makeMole());key.append(content);
   if(g.shift)for(const code of g.shiftCodes){const el=keyEl(code),label=document.createElement('span');el.classList.add('shift-target');label.className='shift-instruction';label.textContent='按住';el.append(label);}
  }
  paintMoleEffect();
 }
 function makeMole(){
  const actor=document.createElement('div');actor.className='mole-actor';
  const image=document.createElement('img');image.className='mole-body';image.src='assets/images/mole-bust.svg';image.alt='等待输入的地鼠';
  const hammer=document.createElement('img');hammer.className='mole-hammer';hammer.src='assets/images/hammer.svg';hammer.alt='';
  const stars=document.createElement('span');stars.className='mole-stars';stars.textContent='✦ ✧';stars.setAttribute('aria-hidden','true');
  const plus=document.createElement('span');plus.className='mole-plus';plus.textContent='+1';plus.setAttribute('aria-hidden','true');
  const mask=document.createElement('div');mask.className='mole-mask';mask.append(image);const rim=document.createElement('div');rim.className='mole-rim';actor.append(mask,rim,hammer,stars,plus);return actor;
 }
 function paintMoleEffect(){
  const effect=session?.moleEffect,age=effect?session.elapsed-effect.start:0,T=C.MOLE_TIMING;
  for(const actor of document.querySelectorAll('.mole-actor')){
   const body=actor.querySelector('.mole-body'),hammer=actor.querySelector('.mole-hammer'),stars=actor.querySelector('.mole-stars'),plus=actor.querySelector('.mole-plus');
   body.style.transform='none';body.style.opacity='1';hammer.style.opacity='0';stars.style.opacity='0';plus.style.opacity='0';
   const struck=effect&&(effect.kind==='wrong'?age<350:age>=T.contact);
   const src='assets/images/'+(struck?'mole-hit.svg':'mole-bust.svg');if(body.getAttribute('src')!==src)body.src=src;
   body.alt=struck?'打中了，地鼠正在跑回洞里':'等待输入的地鼠';
   if(!effect||!session.active)continue;
   if(effect.kind==='wrong'){if(age<350&&!reducedMotion.matches)body.style.transform='translateX('+Math.sin(age/350*Math.PI*4)*8+'%) rotate('+Math.sin(age/350*Math.PI*4)*8+'deg)';continue;}
   const p=session.hitProgress;
   stars.style.opacity=age>=T.contact&&age<T.hidden?'1':'0';plus.style.opacity=age>=T.contact?'1':'0';
   stars.style.transform='translateY('+(-p*8)+'px) scale('+(1+p*.5)+')';plus.style.transform='translateY('+(-p*12)+'px)';
   if(reducedMotion.matches){body.style.opacity=age>=T.hidden?'0':'1';continue;}
   hammer.style.opacity=age<T.bounce?'1':'0';hammer.style.transform='rotate('+(age<T.contact?-65+95*age/T.contact:30-20*(age-T.contact)/(T.bounce-T.contact))+'deg)';
   if(age>=T.contact&&age<T.bounce){const q=(age-T.contact)/(T.bounce-T.contact);body.style.transform='scale('+(1+.32*Math.sin(q*Math.PI))+','+(1-.42*Math.sin(q*Math.PI))+')';}
   else if(age>=T.bounce&&age<T.retreat){const q=(age-T.bounce)/(T.retreat-T.bounce);body.style.transform='translateY('+(-(actor.closest('.key')?16:22)*Math.sin(q*Math.PI))+'%) rotate('+(-12*Math.sin(q*Math.PI))+'deg)';}
   else if(age>=T.retreat){const q=Math.min(1,(age-T.retreat)/(T.hidden-T.retreat));body.style.transform='translateY('+(q*115)+'%)';if(age>=T.hidden)body.style.opacity='0';}
  }
 }
 function start(){if(openDialog()||running()||window.innerWidth<1280||window.innerHeight<700)return;A.stopMusic();A.enable();finished=false;pendingScore=null;session=new C.Session(data.settings.stage,data.settings.help,performance.now());hole=Math.floor(Math.random()*HOLE_COUNT);renderControls();renderTarget();message('找到字符，把地鼠送回家。');syncMusic();}
 function pause(){if(!running())return false;if(!session.paused){session.pause(performance.now());A.silence('effect');A.pauseMusic();if(!session.active){finish();return false;}renderControls();message('已暂停，按 Enter 继续。');}return true;}
 function resume(){if(!running()||!session.paused||openDialog())return;session.resume(performance.now());A.enable();renderControls();message('找到字符，把地鼠送回家。');syncMusic();}
 function finish(){
  if(finished||!session||session.active)return;finished=true;A.stopMusic();const record=session.record(globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`,new Date().toISOString());if(record.completed){data.lastResults[C.groupKey(record.stage,record.help)]=record;save();}A.silence('effect');renderControls();renderTarget();
  message(record.completed?`本局完成，准确率${record.accuracy}%。`:'本局已结束，成绩未记录。');
  const rank=C.rankFor(data,record);if(record.completed)sound('complete');
  if(rank){pendingScore=record;$('name-group').textContent=`${L.stages[record.stage].name} · 帮助${record.help?'开启':'关闭'}`;$('name-score').textContent=`${record.score}分 · ${record.accuracy}%准确率 · 第${rank}名`;$('player-name').value=data.lastName;$('name-error').textContent='';$('name-dialog').showModal();$('player-name').focus();$('player-name').select();}
 }
 function openPanel(id){if(openDialog())return;if(running()&&!pause())return;if(id==='leaderboard'){boardStage=data.settings.stage;boardHelp=data.settings.help;renderBoard();}else if(id==='settings'){$('import').disabled=running();$('import-note').textContent=running()?'结束本局后可导入备份。':'导入会替换当前数据。';}$(id).showModal();}
 function closePanel(id){$(id).close();if(id==='leaderboard')$('leaderboard-button').focus();else if(id==='settings')$('settings-button').focus();}
 function endPaused(){if(openDialog()||!running()||!session.paused)return;session.end(performance.now());finish();$('overlay-action').focus();}
 function resolveConfirmation(accepted){
  const action=confirmation;if(!action)return;confirmation=null;$('confirm-dialog').close();
  if(accepted){data=action.data;session=null;finished=false;pendingScore=null;newRecordId=null;save();applySettings();renderControls();message('备份已导入。');$('import-status').textContent='备份已导入。';}
  $('settings').showModal();$('import').focus();
 }
 function renderBoard(){
  [...$('board-stages').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(boardStage===i)));document.querySelectorAll('[data-board-help]').forEach(b=>b.setAttribute('aria-pressed',String(boardHelp===(b.dataset.boardHelp==='true'))));
  const board=data.boards[C.groupKey(boardStage,boardHelp)];$('board-empty').hidden=!!board.length;$('board-rows').replaceChildren();
  for(let i=0;i<10;i++){const row=document.createElement('tr'),entry=board[i];if(entry?.id===newRecordId)row.className='new-record';const date=entry?new Date(entry.at):null;const values=[i+1,entry?.name||'—',entry?.score??'—',entry?`${entry.accuracy}%`:'—',entry?`${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,'0')}/${String(date.getDate()).padStart(2,'0')}`:'—'];values.forEach((value,j)=>{const cell=document.createElement('td');if(j===0&&entry&&i<3){const badge=document.createElement('span');badge.className=`rank-medal rank-${i+1}`;badge.textContent=value;cell.append(badge);}else cell.textContent=value;if(j===1&&entry)cell.title=entry.name;row.append(cell);});$('board-rows').append(row);}
 }
 function applySettings(){document.body.dataset.size=data.settings.size;for(const id of ['layout','volume','musicVolume','mute','musicEnabled']){if(['mute','musicEnabled'].includes(id))$(id).checked=data.settings[id];else $(id).value=data.settings[id];}for(const id of ['volume','musicVolume'])$(id+'-output').textContent=data.settings[id]+'%';document.querySelectorAll('[data-size]').forEach(b=>{if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(b.dataset.size===data.settings.size));});renderKeyboard();syncMusic();}
 $('primary-action').onclick=()=>{if(running()&&!session.paused)pause();};$('overlay-action').onclick=()=>{if(!running())start();else if(session.paused)resume();};$('end').onclick=endPaused;
 $('help').onchange=()=>{if(running()){$('help').checked=session.help;return;}data.settings.help=$('help').checked;session=null;save();renderControls();renderTarget();message(data.settings.help?'双手放在 F 和 J，眼睛看屏幕。':'试着不看键盘，找到字符。');};
 $('leaderboard-button').onclick=()=>openPanel('leaderboard');$('settings-button').onclick=()=>openPanel('settings');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closePanel(b.dataset.close));
 for(const id of ['leaderboard','settings'])$(id).addEventListener('cancel',e=>{e.preventDefault();closePanel(id);});
 $('confirm-cancel').onclick=()=>resolveConfirmation(false);$('confirm-ok').onclick=()=>resolveConfirmation(true);$('confirm-dialog').addEventListener('cancel',e=>{e.preventDefault();resolveConfirmation(false);});
 function skipName(){pendingScore=null;$('name-dialog').close();message('本局完成，成绩未加入排行榜。');$('overlay-action').focus();}
 $('name-skip').onclick=skipName;$('name-dialog').addEventListener('cancel',e=>{e.preventDefault();skipName();});
 $('name-form').onsubmit=e=>{e.preventDefault();if(!pendingScore)return;try{const rank=C.addScore(data,pendingScore,$('player-name').value);newRecordId=pendingScore.id;pendingScore=null;save();$('name-dialog').close();message(rank?`已保存，第${rank}名。`:'本局完成。');$('overlay-action').focus();}catch(error){$('name-error').textContent=error.message;$('player-name').focus();}};
 document.querySelectorAll('[data-board-help]').forEach(b=>b.onclick=()=>{boardHelp=b.dataset.boardHelp==='true';renderBoard();});
 function selectTab(tab){document.querySelectorAll('[data-tab]').forEach(b=>{const selected=b.dataset.tab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;$('settings-'+b.dataset.tab).hidden=!selected;});}
 const tabs=[...document.querySelectorAll('[data-tab]')];tabs.forEach((b,i)=>{b.onclick=()=>selectTab(b.dataset.tab);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=(i+(e.key==='ArrowRight'?1:2))%3;selectTab(tabs[next].dataset.tab);tabs[next].focus();};});
 for(const id of ['layout','volume','musicVolume','mute','musicEnabled'])$(id).addEventListener(['volume','musicVolume'].includes(id)?'input':'change',()=>{data.settings[id]=['mute','musicEnabled'].includes(id)?$(id).checked:['volume','musicVolume'].includes(id)?Number($(id).value):$(id).value;save();applySettings();});
 document.querySelectorAll('button[data-size]').forEach(b=>b.onclick=()=>{data.settings.size=b.dataset.size;save();applySettings();});
 $('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='typestory-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('import').onclick=()=>{if(!running())$('import-file').click();};$('import-file').onchange=async()=>{const file=$('import-file').files[0];if(!file)return;try{if(file.size>1000000)throw Error('文件过大');const incoming=C.validate(JSON.parse(await file.text()));if(running())throw Error('请先结束本局');if(!$('settings').open)throw Error('请重新打开设置后导入');confirmation={kind:'import',data:incoming};$('settings').close();$('confirm-title').textContent='导入备份？';$('confirm-description').textContent='将替换本机设置、排行榜和上次成绩。建议先导出当前备份。';$('confirm-ok').textContent='导入';$('confirm-dialog').showModal();$('confirm-cancel').focus();}catch(error){$('import-status').textContent='未导入：'+error.message;}$('import-file').value='';};
 window.addEventListener('keydown',e=>{
  syncModifiers(e);if(e.isComposing||e.key==='Process'){if(running())message('请切换到 ABC / 英文输入源。');return;}
  if(openDialog()){if(e.repeat&&['Enter','Escape'].includes(e.key))e.preventDefault();return;}
  if(window.innerWidth<1280||window.innerHeight<700||e.metaKey||e.ctrlKey||e.altKey)return;
  if(e.repeat){if(e.key.length===1||['Enter','Escape'].includes(e.key))e.preventDefault();return;}
  if(e.key==='Escape'){e.preventDefault();if(running()&&!session.paused)pause();return;}
  if(e.key==='Enter'&&e.shiftKey){e.preventDefault();return;}
  if(e.key==='Enter'){
   if(e.target.closest('button,input,select')&&!['primary-action','overlay-action'].includes(e.target.id))return;
   e.preventDefault();if(!running())start();else if(session.paused)resume();return;
  }
  if(e.target.closest('input,select')||e.target.closest('#stage-options'))return;
  const el=keyEl(e.code);if(el){pressedCodes.add(e.code);el.classList.add('pressed');}
  if(!running()||session.paused)return;
  if(e.key.length!==1)return;e.preventDefault();const outcome=session.input(e.key,performance.now());
  if(!session.active){finish();return;}if(outcome==='ignored')return;
  if(outcome==='wrong'){sound('wrong');message(caps&&/[a-z]/.test(session.target)&&e.key===session.target.toUpperCase()?'请关闭大写锁定，再试一次。':'再试一次，地鼠在等你。');}
  else{A.duckMusic(C.MOLE_TIMING.duration/1000);message('打中了！+1');}
  paintMoleEffect();updateStats();
 });
 window.addEventListener('keyup',e=>{pressedCodes.delete(e.code);syncModifiers(e);keyEl(e.code)?.classList.remove('pressed');});
 function loseFocus(){pause();clearPressedKeys();}
 window.addEventListener('blur',loseFocus);document.addEventListener('visibilitychange',()=>{if(document.hidden)loseFocus();});window.addEventListener('resize',()=>{if(window.innerWidth<1280||window.innerHeight<700)pause();});
 function frame(now){if(running()&&!session.paused){session.tick(now);if(!session.active)finish();else{for(const cue of session.takeMoleCues())sound(cue);if(session.takeNextMole()){hole=Math.floor(Math.random()*HOLE_COUNT);renderTarget();}}updateStats();}paintMoleEffect();requestAnimationFrame(frame);}
 applySettings();renderControls();requestAnimationFrame(frame);
})();
