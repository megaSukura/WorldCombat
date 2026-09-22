// 糖浆炸弹的可执行设计说明：一只只会糖浆炸弹的宝可梦对两只挤在一起的僵尸投弹。
// 必然事实：本招被提交过；僵尸身上出现过共享身份 syrupbomb；被裹住且还活着的僵尸移动速度属性下降
//   （掉速按级别落到属性上，僵尸一被砸中就可能死，所以取活下来的那一只来判定）。
// 命中、裹住几只、粘糖洼是否留下，写进 note 供读轨迹判断。
Smoke.scenario("syrupbomb", function (stage) {
    var caster = stage.pokemon({ species: "bulbasaur", level: 35, moves: ["syrupbomb"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    var foeB = stage.mob({ type: "minecraft:zombie", at: [4, 0, 1] });
    var baseA = stage.attribute(foeA, "minecraft:generic.movement_speed");
    var baseB = stage.attribute(foeB, "minecraft:generic.movement_speed");
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.until(900, function () {
        return stage.casts("syrupbomb") > 0 && stage.hadMobEffect(foeA, "world_combat:status/syrupbomb");
    }, function () {
        stage.after(200, function () {
            var victim = foeA.alive() ? foeA : foeB;
            var base = victim === foeA ? baseA : baseB;
            stage.expect(stage.casts("syrupbomb") > 0, "syrupbomb was committed");
            stage.expect(stage.hadMobEffect(foeA, "world_combat:status/syrupbomb"), "the shared syrupbomb identity landed on the target");
            stage.expect(victim.alive() && stage.attribute(victim, "minecraft:generic.movement_speed") < base - 0.001,
                "the surviving coated target's movement speed fell with the Speed drops");
            stage.note("syrupbomb coat", {
                casts: stage.casts("syrupbomb"),
                damageA: Math.round(stage.damageTo(foeA) * 10) / 10,
                damageB: Math.round(stage.damageTo(foeB) * 10) / 10,
                aliveA: foeA.alive(),
                baseSpeed: base,
                speedNow: victim.alive() ? stage.attribute(victim, "minecraft:generic.movement_speed") : -1,
                coatedB: stage.hadMobEffect(foeB, "world_combat:status/syrupbomb"),
                blocks: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "syrup bomb coated");
});
