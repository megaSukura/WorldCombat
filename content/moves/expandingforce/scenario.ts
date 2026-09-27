/**
 * 广域战力的可执行设计说明。
 *
 * 场面：两只只会「广域战力」的催眠貘各自面对一只被冻结的僵尸，旁边各放一只中立的僵尸探针。
 *   石地打底、夜晚不燃烧，伤害只可能来自本招。甲站在一片夹具精神场地上，乙不站：
 *   场景里注册一片只用于工程验证的场地夹具 `world_combat:smoke/expandingforce_field`，
 *   它带与真场地相同的共享身份 `world_combat:terrain/psychicterrain`，成员被覆盖时挂一段发光，
 *   离开（也就是被消耗掉）时撤掉——正好用来证明那一片场地是否被消耗。
 *
 * 定向事实：
 *   1. 两个施法者都放出了广域战力，各自的目标挨了伤害；
 *   2. 站在有效精神场地上的甲走增强分支：更宽的波前够到了 3 格外、普通半径够不到的探针；
 *   3. 没站场地的乙走普通分支：同样的 3 格探针不在半径内，没被碰到；
 *   4. 甲脚下的夹具场地没有被消耗（甲仍带发光的覆盖标记）；
 *   5. 两发都没有自产减速场（目标从未中过缓慢）；
 *   6. 波前对每个在范围内的身体只结算一次。
 *   分层的纵向容差、暴击与命中浮动写进 note。
 */
const expandingforceSmokeField = "world_combat:smoke/expandingforce_field";
if (!WorldEffects.hasFieldRule(expandingforceSmokeField)) {
    WorldEffects.fieldRule(expandingforceSmokeField, {
        enter: function (world, actor) {
            MobEffects.apply(world, actor, "minecraft:glowing", 40, 0);
        },
        stay: function (world, actor) {
            MobEffects.apply(world, actor, "minecraft:glowing", 40, 0);
        },
        leave: function (world, actor) {
            MobEffects.consume(world, actor, "minecraft:glowing");
        }
    }, { identity: WorldEffects.terrain("psychicterrain"), tags: [WorldEffects.categories.terrain] });
}

Smoke.scenario("expandingforce", function (stage) {
    stage.fill([-14, -1, -10], [14, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var casterA = stage.pokemon({ species: "drowzee", level: 30, moves: ["expandingforce"], at: [-8, 0, 0] });
    var primaryA = stage.mob({ type: "minecraft:zombie", at: [-4, 0, 0] });
    var probeA = stage.mob({ type: "minecraft:zombie", at: [-3.5, 0, 3.5] });
    var casterB = stage.pokemon({ species: "drowzee", level: 30, moves: ["expandingforce"], at: [8, 0, 0] });
    var primaryB = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    var probeB = stage.mob({ type: "minecraft:zombie", at: [4.5, 0, 3.5] });
    stage.noai(primaryA, probeA, primaryB, probeB);
    stage.hostile(casterA, primaryA);
    stage.hostile(casterB, primaryB);
    // 活体生成后过一小段才有可写作用域；每只只留 1 点 PP，保证这一场各只放一次。
    stage.after(1, function () { stage.setPp(casterA, "expandingforce", 1); stage.setPp(casterB, "expandingforce", 1); });
    stage.after(3, function () {
        stage.field(expandingforceSmokeField, [-8, 0, 0], 1200, 4, {}, casterA);
    });
    stage.until(900, function () {
        return stage.damageTo(primaryA) > 0 && stage.damageTo(primaryB) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("expandingforce", casterA) > 0, "广域战力被放出来了（甲）");
            stage.expect(stage.casts("expandingforce", casterB) > 0, "广域战力被放出来了（乙）");
            stage.expect(stage.damageTo(primaryA) > 0, "甲的冲击打到了目标身上");
            stage.expect(stage.damageTo(primaryB) > 0, "乙的冲击打到了目标身上");
            stage.expect(stage.damageTo(probeA) > 0, "站在精神场地上的增强波前够到了 3 格外的探针");
            stage.expect(stage.damageTo(probeB) === 0, "没站场地的普通冲击半径较小，够不到同样的探针");
            stage.expect(stage.hasMobEffect(casterA, "minecraft:glowing"), "甲脚下的精神场地没有被消耗");
            stage.expect(!stage.hadMobEffect(primaryA, "minecraft:slowness"), "甲没有自产减速场");
            stage.expect(!stage.hadMobEffect(primaryB, "minecraft:slowness"), "乙没有自产减速场");
            stage.expect(stage.hits(primaryA, true) === 1, "波前对目标只结算一次");
            stage.expect(stage.hits(probeA, true) === 1, "波前对探针只结算一次");
            stage.note("夹具带共享身份 world_combat:terrain/psychicterrain：被本招借用的场地不会结束，成员持续发光。甲乙用同一套半径，唯一差别是甲脚下有有效场地，因此甲走增强分支（burst 半径、威力 ×1.5），乙走普通分支（半径约为原场地半径的 0.55）。两发都不铺场、不减速、不消耗既有场地。分层容差与命中/暴击浮动不写断言。", {
                castsA: stage.casts("expandingforce", casterA),
                castsB: stage.casts("expandingforce", casterB),
                primaryADamage: Math.round(stage.damageTo(primaryA) * 10) / 10,
                primaryBDamage: Math.round(stage.damageTo(primaryB) * 10) / 10,
                probeADamage: Math.round(stage.damageTo(probeA) * 10) / 10,
                probeBDamage: Math.round(stage.damageTo(probeB) * 10) / 10,
                borrowedTerrainKept: stage.hasMobEffect(casterA, "minecraft:glowing"),
                primaryAHits: stage.hits(primaryA, true),
                probeAHits: stage.hits(probeA, true),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "两只催眠貘各放一发，增强/普通分支按脚下场地分开");
});
