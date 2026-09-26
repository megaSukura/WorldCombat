/**
 * 岩石封锁 / rocktomb —— 可执行设计说明。
 *
 * 一句话：朝方向点或选中的目标投一块重石头，砸中的目标速度下降；落地时脚下立起一圈留有缺口的石柱把行动围住。
 *
 * 场面：会岩石封锁的隆隆岩（40 级，只给这一招）对一只厚血、站桩的卡比兽（50 级，只会跃起）投石；
 * 原负高度硬石场地保留：主伤后必须真立石柱；原生身体探针确认目标未被嵌入石柱、出口全程可通行，
 * 到期石柱和临时地表均归还。伤害数、实际箱体、石柱格数写进 note。
 * 共享状态在施加后的下一个 tick 才触发 `mob_effect_added`，所以断言前等几个 tick 再结算，
 * 否则会读到「效果还没登记」的假阴性。
 */
namespace RocktombReviewScenario {
    var targetRef = "", caster: Smoke.Actor | null = null;
    var footprint: { feet: number[]; width: number; height: number; fits: boolean; gapClear: boolean } | null = null;
    WorldCombat.on("checks:rocktomb/footprint", "world_combat:mob_effect_added", "", function (event) {
        if (!targetRef || String(event.actor().ref()).indexOf(targetRef) !== 0) return;
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== "world_combat:rocktomb_tomb" || caster === null) return;
        var world = event.world(), body = world.observe(event.actor());
        if (body === null) return;
        var min = body.boundsMin(), max = body.boundsMax();
        var feet = WorldCombat.point((min.x() + max.x()) * 0.5, min.y(), (min.z() + max.z()) * 0.5);
        var width = Math.max(max.x() - min.x(), max.z() - min.z()), height = max.y() - min.y();
        var source = caster.position(), direction = WorldGeometry.flatUnit(feet.minus(WorldCombat.point(source[0], feet.y(), source[2])));
        var clear = true;
        // 原生方块/身体碰撞探针：从笼内走到 6 格外，全程检查实际完整箱体。
        for (var distance = 0; distance <= 6; distance += 0.25)
            if (!world.freeSpace(feet.plus(direction.scale(distance)), width, height)) clear = false;
        footprint = { feet: [feet.x(), feet.y(), feet.z()], width: width, height: height,
            fits: world.freeSpace(feet, width, height), gapClear: clear };
    });
Smoke.scenario("rocktomb", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.fill([-9, 0, -7], [9, 0, 7], "minecraft:air");
    stage.fill([-9, 1, -7], [9, 1, 7], "minecraft:air");
    stage.watch([-4, -1, -5], [9, 3, 5]);
    stage.time("day");
    stage.weather("clear");
    var actor = stage.pokemon({ species: "golem", level: 40, moves: ["rocktomb"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: ["splash"], at: [4, 0, 0] });
    caster = actor; targetRef = foe.ref; footprint = null;
    stage.hostile(actor, foe);
    var landedAt = 0;
    stage.until(1200, function () {
        if (landedAt === 0 && stage.casts("rocktomb", actor) >= 1 && stage.damageTo(foe) > 0) {
            landedAt = stage.tick(); stage.setPp(actor, "rocktomb", 0);
        }
        return landedAt > 0 && stage.tick() >= landedAt + 12 && footprint !== null;
    }, function () {
        stage.expect(stage.casts("rocktomb", actor) >= 1, "caster committed rock tomb");
        stage.expect(stage.damageTo(foe) > 0, "rock tomb dealt damage to the foe");
        var changed = stage.changedBlocks(), raised = 0, ground = 0;
        for (var index = 0; index < changed.length; index++) {
            if (String(changed[index].after).indexOf("cobblestone") < 0) continue;
            if (changed[index].at[1] === 0) raised++; else ground++;
        }
        stage.expect(raised > 0, "the negative-height arena received real above-ground pillars");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/encased"), "successful pillars carried the encased identity");
        stage.expect(footprint !== null && footprint.fits, "the native target body still fits inside its cage");
        stage.expect(footprint !== null && footprint.gapClear, "the full native target body fits along the exit through the ring");
        stage.note("actual native footprint and accepted pillar cells; the source arena and both Pokemon remain unchanged", {
            casts: stage.casts("rocktomb", actor),
            damage: Math.round(stage.damageTo(foe) * 10) / 10,
            encased: stage.hadMobEffect(foe, "world_combat:status/encased"),
            pillars: raised,
            ground: ground,
            footprint: footprint,
            cells: changed,
            foeAlive: foe.alive()
        });
        stage.until(280, function () { return stage.changedBlocks().length === 0; }, function () {
            stage.expect(stage.changedBlocks().length === 0, "pillar and surface leases restored the original arena");
            stage.expect(!stage.hasMobEffect(foe, "world_combat:status/encased"), "the cage identity expired with its window");
            stage.note("lease expiry returned the original stone and air", { changed: stage.changedBlocks().length });
            stage.done();
        }, "rock tomb terrain restores after its finite lease");
    }, "rock tomb lands and raises its real cage within 60 s");
});
}
