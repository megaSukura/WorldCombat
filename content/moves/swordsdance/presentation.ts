// Three persistent sword images follow authored curves; the native atlas supplies their pixel art.
WorldCombatClient.scene("world_combat:move_swordsdance",1,frame=>{
    const entry=JSON.parse(frame.data()) as CombatSceneEntry, data=entry.data;
    if(entry.lifecycle||data.lifecycle)return;
    const body=JSON.parse(frame.anchor(entry.source));if(!body)return;
    const age=Math.max(0,frame.serverTick()-Number(data.start||0)),duration=Math.max(1,Number(data.duration||1));
    const t=Math.min(1,age/duration),arc=Number(data.arc||1),texture="cobblemon:particle/moves/swordsdance_swords";
    if(data.moment==="hone"){
        const appear=Math.min(1,age/3);
        frame.sprite(texture,body.x,body.y+body.height+.25,body.z,.48*appear,45,0xB3D9EBFF|0,12,true);
        return;
    }
    const drawing=data.moment==="draw", close=drawing?0:Math.max(0,(t-.7)/.3);
    const ease=close*close*(3-2*close),radius=arc*(drawing?.7+.3*t:1-.85*ease);
    const opacity=drawing?Math.min(1,t*4):1;
    const tint=((Math.round(opacity*235)<<24)|0xDCEEFF)|0;
    for(let i=0;i<3;i++){
        const phase=i*Math.PI*2/3+(drawing?-.5+.5*t:t*Math.PI*1.5);
        const x=body.x+Math.cos(phase)*radius,z=body.z+Math.sin(phase)*radius;
        const y=body.y+body.height*(drawing?.35+.1*t:.45+.45*t)+Math.sin(phase)*arc*.22*(1-ease);
        const roll=drawing?45:45+Math.sin(phase)*55*(1-ease);
        frame.sprite(texture,x,y,z,Math.max(.8,Math.min(1.6,arc)),roll,tint,12,true);
    }
});
