/** Observe the actual field receipt, rather than counting the cast alone. */
let courtchangeTransferred = false;
WorldCombat.on("world_combat:checks/courtchange", "world_combat:committed", "", event => {
    const action = event.action(); if (!action || action.content() !== "world_combat:courtchange") return;
    const world = event.world(), own = String(event.actor().ref());
    const before = PokemonSkills.courtChangeScan(world, action.targetPosition(), PokemonSkills.p("courtchange", "field", action)).filter(field => !field.friendly);
    const clocks = WorldEffects.areas(world);
    action.after(2, current => {
        const after = WorldEffects.areas(current.sense());
        before.forEach(field => {
            const original = clocks.filter(value => value.id === field.id)[0];
            if (!original || after.some(value => value.id === field.id)) return;
            if (after.some(value => value.source === own && value.rule === original.rule && value.remaining <= original.remaining
                && JSON.stringify(value.position) === JSON.stringify(original.position) && value.radius === original.radius)) courtchangeTransferred = true;
        });
    });
});
Smoke.scenario("courtchange", function (stage) {
    courtchangeTransferred = false;
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "meowscarada", level: 40, moves: ["courtchange"], at: [-2, 0, 0] });
    // A passive enemy owns a transferable hazard clear of the caster. It targets the caster (a real threat for the
    // scan) but is held still, so the caster is free to rest and lay down the swap.
    var holder = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 3] });
    stage.noai(holder);
    stage.hostile(caster, holder);
    stage.field("world_combat:hazard/spikes", [5, 0, 0], 1200, 2, {}, holder);
    stage.until(1150, function () {
        return courtchangeTransferred;
    }, function () {
        stage.expect(stage.casts("courtchange", caster) > 0, "court change was committed with an enemy field in range");
        stage.expect(courtchangeTransferred, "the actual field changed source at the same position without refreshing its clock");
        stage.note("换场扫出中心半径内的所有共享领域效果：敌方的过户给施法者、我方的过户给最近的敌人，领域只换主人、规则与剩余时长不变。实际接管／交出几处随场地数量而变，是时机结果；换场半径随等级与体型、光点随特攻变化，速换与稳换各有代价。", {
            courtCasts: stage.casts("courtchange", caster),
            casterAlive: caster.alive(),
            holderAlive: holder.alive(),
            tick: stage.tick()
        });
        stage.done();
    }, "court change flips the field");
});
