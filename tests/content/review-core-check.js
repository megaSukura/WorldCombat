// Neutral integration fixture, appended only to the private check bundle.
WorldCombat.on('checks:review/stats', 'checks:review/stats', '', function (event) {
    var data = JSON.parse(String(event.data())), world = event.world(), actor = event.actor();
    if (data.stat) NativeEffects.boost(world, actor, data.stat, data.amount);
    var native = String(actor.domain()) === 'cobblemon';
    event.data(JSON.stringify({ stages: NativeEffects.read(world, actor).stages,
        defence: native ? IndividualAttributes.inspect(IndividualAttributes.live(world, actor), 'world_combat:def').value : 0,
        formulaDefence: native ? PokemonSkills.factsOf({world:world, actor:actor}).read('stat.def') : 0 }));
});
