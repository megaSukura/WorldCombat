// Private integration fixture. It is not a move or a content-authoring example.
WorldEffects.fieldRule('checks:detached', {});
WorldCombat.registerAction('checks:authored_cooldown', '1', 20, 'self', 1, function (action) {
    action.commit(120); action.finish();
});
var kernelBoundCounts = {};
WorldCombat.on('checks:author/bound', 'world_combat:actor_bound', '', function (event) {
    var key = String(event.actor().key());
    kernelBoundCounts[key] = (kernelBoundCounts[key] || 0) + 1;
});
WorldCombat.on('checks:author/kernel', 'checks:author/kernel', '', function (event) {
    var world = event.world(), actor = event.actor(), data = JSON.parse(String(event.data())), result = {};
    if (data.op === 'cooldown') {
        var at = world.observe(actor).position();
        result.id = world.cast('checks:authored_cooldown', actor, at, WorldCombat.point(0, 0, 1), '{}');
        result.remaining = world.cooldown('checks:authored_cooldown');
    }
    if (data.op === 'window') result.id = NativeEffects.boostWindow(world, actor, { atk: data.amount }, data.ticks, 'checks:window');
    if (data.op === 'carried') {
        var carrier = MobEffects.apply(world, actor, 'minecraft:glowing', data.ticks, 0);
        if (carrier === null) throw new Error('Fixture carrier was refused');
        result.id = NativeEffects.boostWindow(world, actor, { atk: data.amount }, data.ticks, 'checks:carried', carrier);
    }
    if (data.op === 'clear-carrier') MobEffects.consume(world, actor, 'minecraft:glowing');
    if (data.op === 'carrier') result.present = MobEffects.read(world, actor, 'minecraft:glowing') !== null;
    if (data.op === 'base') NativeEffects.boost(world, actor, 'atk', data.amount, true);
    if (data.op === 'reset') NativeEffects.resetStages(world, actor, true);
    if (data.op === 'inspect') result.stage = NativeEffects.effectiveStage(world, actor, 'atk');
    if (data.op === 'bound') {
        result.count = kernelBoundCounts[String(actor.key())] || 0;
        result.models = world.effects(actor, 'cobblemon_world_combat:individual').length;
    }
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
