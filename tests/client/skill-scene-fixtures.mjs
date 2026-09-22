// Visual fixtures use the server's scene fields, not a second gameplay simulation.
export const skillScenes = [
  {move:'tackle',style:'leaf',kind:'dash'}, {move:'growl',style:'solar',radius:3},
  {move:'vinewhip',style:'vine',kind:'flight'}, {move:'growth',style:'solar'},
  {move:'leechseed',style:'vine',kind:'flight',relation:'leech_link'},
  {move:'razorleaf',style:'leaf',kind:'flight'},
  {move:'poisonpowder',style:'powder',geometry:'powder_field',field:true,color:0xdd9268bd},
  {move:'sleeppowder',style:'powder',geometry:'powder_field',field:true,color:0xdddfc77c},
  {move:'seedbomb',style:'seed',kind:'flight'}, {move:'takedown',style:'leaf',kind:'dash'},
  {move:'sweetscent',style:'powder',geometry:'powder_field',field:true,color:0xddffa4c8},
  {move:'synthesis',style:'solar',target:true}, {move:'worryseed',style:'seed',kind:'flight'},
  {move:'powerwhip',style:'vine',kind:'flight'}, {move:'solarbeam',style:'solar',geometry:'beam',radius:.35},
  {move:'petaldance',style:'leaf',geometry:'petal_dance',radius:3},
  {move:'petalblizzard',style:'leaf',geometry:'petal_field',field:true},
  {move:'protect',style:'shield',geometry:'shield',target:true},
  {move:'endure',style:'shield',geometry:'shield'},
  {move:'substitute',style:'seed',geometry:'substitute',target:true},
  {move:'helpinghand',style:'aura',geometry:'pulse',target:true},
  {move:'ingrain',style:'aura',geometry:'aura'}, {move:'amnesia',style:'aura',geometry:'pulse'},
  {move:'gigadrain',style:'link',kind:'flight',relation:'link'},
  {move:'venoshock',style:'powder',kind:'flight',projectileStyle:'pulse'},
  {move:'grassyterrain',style:'garden',geometry:'garden',field:true},
  {move:'seedbomb',variant:'field',style:'seed',geometry:'seedbed',field:true},
  {move:'petaldance',variant:'focus',style:'leaf',geometry:'petal_dance',radius:3}
];

export function skillSceneScript() { return `
var skillCases=${JSON.stringify(skillScenes)};
['ALL','MINIMAL'].forEach(function(particleQuality){skillCases.forEach(function(test){
 reset();quality=particleQuality;
 var label='skill-'+test.move+(test.variant?'-'+test.variant:'')+'-'+particleQuality.toLowerCase();
 var flightId=label+'/flight',samples=[],publish={},visiblePeak=false;
 anchorPoints={'source/1':[0,.65,0],'enemy/1':[0,.65,4.8],'helper/1':[2,.65,3]};
 function event(key,data,position){publish[key]={key:key,type:'world_combat:effect',position:position||data.to||[0,0,0],data:data};}
 for(clock=0;clock<=120;clock++){
  publish={};
  var common={move:test.move,style:test.style,actor:'source/1',phase:'active',start:8,duration:32,from:[0,.65,0],to:[0,0,0],
   radius:test.radius||(test.field?3:1),color:test.color,geometry:test.geometry,mode:test.variant==='focus'?'focus':'sweep',
   direction:[0,0,1],rotationTicks:12,strike:1,strikes:3,health:24,maximum:30,capacity:20,charges:1,connected:true};
  if(clock<8)event(label+'/stage',{move:test.move,style:test.style,actor:'source/1',phase:'prepare',stageOnly:true,start:0,duration:8,progress:clock/8,from:[0,.65,0],to:[0,0,4.8]});
  else if(test.kind==='flight'){
   if(clock<=24){var age=clock-8,z=age*.3,y=.65+(test.move==='seedbomb'?Math.sin(age/16*Math.PI)*1.5:0);
    samples.push([clock,0,y,z]);common.geometry='projectile';common.projectileStyle=test.projectileStyle;common.duration=40;
    common.from=samples.length>1?samples[samples.length-2].slice(1):[0,.65,0];common.to=[0,y,z];
    common.motion={id:flightId,birth:[8,0,.65,0],samples:samples.slice(),sequence:age+1};
    if(clock===24)common.motion.terminal={tick:24,reason:'impact',target:'enemy/1'};
    event(label+'/flight',common);
   }
   if(clock>=24&&clock<40){event(label+'/hit',{move:test.move,style:test.move==='venoshock'?'toxin_burst':test.style,
    phase:'impact',actor:'source/1',start:24,duration:12,from:[0,.65,4.8],to:[0,.65,4.8],radius:test.move==='seedbomb'?2:1,motionId:flightId});}
   if(test.relation&&clock>=28&&clock<56)event(label+'/relation',{move:test.move,style:'vine',geometry:test.relation,phase:'active',actor:'source/1',
    fromActor:'source/1',toActor:'enemy/1',from:[0,.65,0],to:[0,.65,4.8],start:28,duration:28,pulseTick:28+Math.floor((clock-28)/12)*12,radius:.4});
  }else if(test.kind==='dash'){
   if(clock<24){var z=(clock-8)*.3;anchorPoints['source/1']=[0,.65,z];common.geometry='dash';common.anchorActor='source/1';common.to=[0,0,z];event(label+'/active',common);}
   if(clock>=24&&clock<36)event(label+'/hit',{move:test.move,style:'leaf',geometry:'dash-impact',phase:'impact',actor:'source/1',
    start:24,duration:8,from:[0,.65,4.8],to:[0,.65,4.8],direction:[0,0,1]});
  }else if(clock<40){
   if(test.field)common.to=[0,0,3];
   if(test.geometry==='beam')common.to=[0,.65,4.8];
   if(test.target){common.to=[2,0,3];common.anchorActor='helper/1';if(test.geometry==='substitute'||test.geometry==='shield'||test.move==='helpinghand')common.actor='helper/1';}
   if(test.geometry==='substitute')common.owner='source/1';
   event(label+'/active',common);
   if(test.geometry==='substitute')event(label+'/link',{move:'substitute',style:'link',geometry:'protection_link',phase:'active',actor:'helper/1',owner:'source/1',from:[0,.65,0],to:[2,.65,3],start:8,duration:32});
  }
  if(clock%4===0)sceneSnapshot=Object.keys(publish).map(function(key){return publish[key];});
  sceneSnapshot.forEach(packet);
  Object.keys(ticks).forEach(function(id){ticks[id]();});Fixture.advance();Fixture.renderFrames(.5);
  if([0,4,8,12,18,24,28,36,42,56,72,120].indexOf(clock)>=0){
   Scene.references(JSON.stringify(anchorPoints));Scene.capture(label,clock);
   if(clock>=8&&clock<=36&&Scene.hasVisiblePixels())visiblePeak=true;
  }
 }
 if(!visiblePeak)throw Error('No visible authored effect throughout active window: '+label);
 Scene.requireEmpty(label);
});});
quality='ALL';
`; }
