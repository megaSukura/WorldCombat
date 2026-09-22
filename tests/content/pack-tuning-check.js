// Private integration fixture: exercises the production configuration bridge and shared rules.
WorldCombat.on('checks:pack/tuning', 'checks:pack/tuning', '', function(event) {
    var world=event.world(), actor=event.actor();
    NativeEffects.boost(world,actor,'atk',1,true);
    var state=world.effects(actor,CombatStages.definition);
    event.data(JSON.stringify({idle:NativeSemantics.encounterIdle,stageIdle:CombatStages.idleTicks,
        remaining:state.length?state[0].remaining():0,base:NativeMobility.setting('mobilityBase',-1)}));
});
