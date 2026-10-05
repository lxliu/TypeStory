(function(root){
  const colors={pinky:'#df919e',ring:'#d9ad62',middle:'#85bca8',index:'#8aafe0',thumb:'#c5b8d5'};
  const names={pinky:'小指',ring:'无名指',middle:'中指',index:'食指',thumb:'拇指'};
  const rows=[];
  function key(code,base,upper,hand,finger,width=1){return {code,base,upper:upper||base,hand,finger,width};}
  rows.push([key('Backquote','`','~','left','pinky'),...'1234567890'.split('').map((c,i)=>key('Digit'+c,c,'!@#$%^&*()'[i],i<5?'left':'right',['pinky','ring','middle','index','index','index','index','middle','ring','pinky'][i])),key('Minus','-','_','right','pinky'),key('Equal','=','+','right','pinky'),key('Backspace','delete',null,null,null,1.5)]);
  function letters(s){return [...s].map(c=>{let hand='qwertasdfgzxcvb'.includes(c)?'left':'right';let finger='qazp'.includes(c)?'pinky':'wsxol'.includes(c)?'ring':'edcik'.includes(c)?'middle':'index';return key('Key'+c.toUpperCase(),c,c.toUpperCase(),hand,finger);});}
  rows.push([key('Tab','tab',null,null,null,1.5),...letters('qwertyuiop'),key('BracketLeft','[','{','right','pinky'),key('BracketRight',']','}','right','pinky'),key('Backslash','\\','|','right','pinky')]);
  rows.push([key('CapsLock','caps lock',null,null,null,1.8),...letters('asdfghjkl'),key('Semicolon',';',':','right','pinky'),key('Quote',"'",'"','right','pinky'),key('Enter','return',null,null,null,1.7)]);
  rows.push([key('ShiftLeft','shift',null,'left','pinky',2.2),...letters('zxcvbnm'),key('Comma',',','<','right','middle'),key('Period','.','>','right','ring'),key('Slash','/','?','right','pinky'),key('ShiftRight','shift',null,'right','pinky',2.2)]);
  rows.push([key('Fn','fn',null,null,null),key('ControlLeft','control',null,null,null),key('AltLeft','option',null,null,null),key('MetaLeft','⌘',null,null,null),key('Space',' ',' ','both','thumb',6),key('MetaRight','⌘',null,null,null),key('AltRight','option',null,null,null),key('ArrowLeft','←',null,null,null),key('ArrowDown','↓',null,null,null),key('ArrowUp','↑',null,null,null),key('ArrowRight','→',null,null,null)]);
  const keys=rows.flat();
  function find(char){return keys.find(k=>k.base.length===1&&(k.base===char||k.upper===char));}
  function guidance(char){let k=find(char);if(!k)return null;return {key:k,shift:k.upper===char&&k.base!==char,shiftCode:k.hand==='left'?'ShiftRight':'ShiftLeft',label:(k.hand==='both'?'任意一只手的':k.hand==='left'?'左手':'右手')+names[k.finger]};}
  root.TSKeyboard={rows,keys,find,guidance,colors,names};
})(typeof window==='undefined'?globalThis:window);
