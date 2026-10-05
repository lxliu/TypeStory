(function(root){
const lower='abcdefghijklmnopqrstuvwxyz',basic='0123456789;\'[],./\\-=`',shift='~!@#$%^&*()_+{}|:"<>?';
const stages=[{name:'1 · 基准位',chars:'asdfjkl;'},{name:'2 · 小写字母',chars:lower},{name:'3 · 大写字母',chars:lower.toUpperCase()},{name:'4 · 数字与基础符号',chars:basic},{name:'5 · Shift 符号',chars:shift},{name:'6 · 综合练习',chars:lower+lower.toUpperCase()+basic+shift}];
const phrases=[{name:'1 · 键位小步',texts:['fff jjj','aaa ;;;','asdf jkl;','sss lll','ddd kkk','fj fj dk sl','as df jk l;','sad flask']},{name:'2 · 英文单词',texts:['cat dog','hello world','red apple','sun and sky','my little garden','happy day','green leaf','type a word']},{name:'3 · 大写与符号',texts:['Hi Tom','Hello Lily','A B C','(a + b)','[1, 2, 3]','{x = 1;}','"Hello!"','a < b && b > 0']},{name:'4 · C++ 小片段',texts:['int main()','return 0;','cout << a;','cin >> n;','if (a > 0)','a = a + 1;','bool ok = true;','// hello'],templates:true}];
if(phrases[3].templates)for(const letter of ['a','b','c'])for(const n of [1,2,3])phrases[3].texts.push('int '+letter+' = '+n+';');
root.TSLessons={stages,phrases};
})(typeof window==='undefined'?globalThis:window);
