// Private integration fixture. It is not a move or a content-authoring example.
WorldEffects.fieldRule('checks:detached', {});
WorldCombat.on('checks:author/kernel', 'checks:author/kernel', '', function (event) {
    var world = event.world(), actor = event.actor(), data = JSON.parse(String(event.data())), result = {};
    if (data.op === 'window') result.id = NativeEffects.boostWindow(world, actor, { atk: data.amount }, data.ticks, 'checks:window');
    if (data.op === 'base') NativeEffects.boost(world, actor, 'atk', data.amount, true);
    if (data.op === 'reset') NativeEffects.resetStages(world, actor, true);
    if (data.op === 'inspect') result.stage = NativeEffects.effectiveStage(world, actor, 'atk');
    if (data.op === 'terrain') {
        result = JSON.parse(world.terrainResult(JSON.stringify({ cells: data.cells, bestEffort: true, replace: true, linger: true }), 8));
    }
    if (data.op === 'native') {
        result.unknown = world.mobEffect(actor, 'checks:missing_effect') === null;
        world.sound('checks:resource_pack_sound', world.observe(actor).position(), 10, '{}');
    }
    if (data.op === 'detached') result.id = WorldEffects.detachedField(world, 'checks:detached', world.observe(actor).position(), 3, {}, 15);
    if (data.op === 'areas') result.count = WorldEffects.areas(world, 'checks:detached').length;
    if (data.op === 'party') result = JSON.parse(CobblemonCombat.party(world, actor));
    if (data.op === 'revive') {
        result = JSON.parse(CobblemonCombat.reviveResult(world, actor, data.slot, 0.5));
        if (typeof PokemonSkills !== 'undefined' && PokemonSkills.partyReserve) {
            var reserve = PokemonSkills.partyReserve(PokemonSkills.partyRoster(world, actor));
            if (!reserve || reserve.slot !== data.slot) throw new Error('Shared party selection did not expose the revived reserve');
        }
    }
    if (data.op === 'switch') result = JSON.parse(CobblemonCombat.switchOut(world, actor, data.slot, null));
    event.data(JSON.stringify(result));
});
