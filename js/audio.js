(function(root){
 const melody=[72,76,79,76,74,77,81,77,76,79,84,79,74,77,79,null,72,76,79,81,79,76,74,72,69,72,76,72,71,74,79,null];
 const audio={context:null,musicBus:null,effectBus:null,timer:null,step:0,nodes:new Set(),settings:null,
  enable(){try{
   if(!this.context){this.context=new(root.AudioContext||root.webkitAudioContext)();this.musicBus=this.context.createGain();this.effectBus=this.context.createGain();this.musicBus.connect(this.context.destination);this.effectBus.connect(this.context.destination);}
   this.context.resume().catch(()=>{});
  }catch(_){}},
  note(frequency,volume,duration=.2,channel='effect',delay=0,endFrequency=null){
   if(!this.context||!volume)return;
   const ctx=this.context,start=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(frequency,start);if(endFrequency)osc.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.006);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   osc.connect(gain);gain.connect(channel==='music'?this.musicBus:this.effectBus);
   const entry={osc,gain,channel};this.nodes.add(entry);osc.onended=()=>{this.nodes.delete(entry);osc.disconnect();gain.disconnect();};osc.start(start);osc.stop(start+duration+.02);
  },
  play(kind,s){
   if(s.mute||!this.context)return;
   const volume=s.volume/100;
   if(kind==='mole-hit'){
    this.duckMusic(.45);
    this.note(480,volume*.17,.11,'effect',0,140);
    this.note(660,volume*.085,.15,'effect',.09,880);
    this.note(990,volume*.06,.18,'effect',.19);
   }else if(kind==='complete'){
    [440,554,659].forEach((f,i)=>this.note(f,volume*.07,.2,'effect',i*.09));
   }else if(kind==='wrong')this.note(270,volume*.07,.14,'effect',0,210);
   else if(kind==='key')this.note(650,volume*.1,.045,'effect',0,340);
   else this.note(659,volume*.07,.15);
  },
  duckMusic(seconds=.45){
   if(!this.musicBus||!this.context)return;
   const gain=this.musicBus.gain,now=this.context.currentTime;
   gain.cancelScheduledValues(now);gain.setValueAtTime(.28,now);gain.setValueAtTime(.28,now+Math.max(0,seconds-.1));gain.linearRampToValueAtTime(1,now+seconds);
  },
  startMusic(s){this.settings=s;if(s.mute||!s.musicEnabled||!s.musicVolume){this.pauseMusic();return;}if(this.timer!==null||!this.context)return;this.beat();this.timer=setInterval(()=>this.beat(),250);},
  beat(){const s=this.settings;if(!s||s.mute||!s.musicEnabled)return;const midi=melody[this.step%melody.length];if(midi!==null){const f=440*Math.pow(2,(midi-69)/12);this.note(f,s.musicVolume/100*.11,.22,'music');this.note(f*2,s.musicVolume/100*.018,.075,'music');}if(this.step%4===0)this.note(440*Math.pow(2,([48,53,55,48][Math.floor(this.step/8)%4]-69)/12),s.musicVolume/100*.055,.4,'music');this.step=(this.step+1)%melody.length;},
  silence(channel){for(const {osc,gain,channel:kind} of this.nodes){if(channel&&kind!==channel)continue;try{gain.gain.cancelScheduledValues(this.context.currentTime);gain.gain.setTargetAtTime(.0001,this.context.currentTime,.01);osc.stop(this.context.currentTime+.04);}catch(_){}}},
  pauseMusic(){if(this.timer!==null){clearInterval(this.timer);this.timer=null;}this.silence('music');},
  stopMusic(){this.pauseMusic();this.silence('effect');this.step=0;if(this.musicBus){const gain=this.musicBus.gain;gain.cancelScheduledValues(this.context.currentTime);gain.setValueAtTime(1,this.context.currentTime);}}
 };
 root.TSAudio=audio;
})(typeof window==='undefined'?globalThis:window);
