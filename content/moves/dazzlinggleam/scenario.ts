/**
 * 魔法闪耀 / dazzlinggleam —— 可执行设计说明。
 *
 * 一句话：施法者把微光收拢再放开，整圈强光炸开，身周两个敌人都被闪到并挂上目眩；铁傀儡的移动速度属性被压下去。
 *
 * 场面：一只特攻见长的沙奈朵带这一招，站在一只小敌与一只血厚的铁傀儡中间——两个可见、敌对的敌人满足
 * 「身周至少两人」的出手条件，铁傀儡又不会被一击打死，用来核对命中后确实挂上了目眩减速。
 *
 * 断言只取必然事实：这招被放过、铁傀儡挨到伤害、它身上出现过目眩身份、它的移动速度属性被压下去。
 * 具体挨了几发、暴击与距离衰减、减速持续多久写进 note 供读轨迹判断。
 */
Smoke.scenario("dazzlinggleam", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "gardevoir", level: 45, moves: ["dazzlinggleam"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [2.4, 0, 0] });
    var thick = stage.mob({ type: "minecraft:iron_golem", at: [1.6, 0, 1.8] });
    var baseSpeed = stage.attribute(thick, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.hostile(caster, thick);
    stage.until(1200, function () {
        return stage.casts("dazzlinggleam", caster) >= 1 && stage.damageTo(thick) > 0;
    }, function () {
        stage.after(2, function () {
            stage.expect(stage.casts("dazzlinggleam", caster) >= 1, "gardevoir committed dazzling gleam");
            stage.expect(stage.damageTo(thick) > 0, "the flash hit the iron golem");
            stage.expect(stage.hadMobEffect(thick, "world_combat:status/dazzled"), "the golem was left dazzled");
            stage.expect(stage.attribute(thick, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "dazzle slowed the golem's movement speed");
            stage.note("how many foes were caught, the distance falloff, the crit roll and the exact dazzle duration are positional/random", {
                casts: stage.casts("dazzlinggleam", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                thickDamage: Math.round(stage.damageTo(thick) * 10) / 10,
                speed: [baseSpeed, stage.attribute(thick, "minecraft:generic.movement_speed")],
                foeAlive: foe.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "dazzling gleam flashes and dazzles an enemy within 60 s");
});
