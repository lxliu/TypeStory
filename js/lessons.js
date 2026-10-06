(function(root){
  const lower='abcdefghijklmnopqrstuvwxyz',basic='0123456789;\'[],./\\-=`',shift='~!@#$%^&*()_+{}|:"<>?';
  root.TSLessons={stages:[
    {name:'基础键位',example:'a s d f g h',chars:'asdfghjkl;'},
    {name:'小写字母',example:'a b c',chars:lower},
    {name:'大小写',example:'a A b B',chars:lower+lower.toUpperCase()},
    {name:'字母数字符号',example:'a A 1 { +',chars:lower+lower.toUpperCase()+basic+shift}
  ]};
})(typeof window==='undefined'?globalThis:window);
