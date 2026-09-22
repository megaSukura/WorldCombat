// 冰冷视线的可执行设计说明：一只只会冰冷视线的超能力宝可梦隔空瞪住一只冰属性目标（它本能免疫冰冻）。
// 必然事实：本招被提交过至少两次；目标受到过伤害（瞬发视线，通视时不会落空）。
// 冰冻是否触发（概率，含穿透免疫后仍为概率）、念力线连跳几个、是否被掩体挡住都写进 note 供读轨迹判断；
// 冰属性目标血厚、吃得慢，便于多掷几次看它是否真的会被冻住。
Smoke.scenario("freezingglare", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "espeon", level: 42, moves: ["freezingglare"], at: [-5, 0, 0] });
    var ice = stage.pokemon({ species: "regice", level: 40, moves: ["tackle"], at: [2, 0, 0] });
    var near = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 0.6] });
    stage.hostile(caster, ice);
    stage.hostile(caster, near);
    stage.until(1200, function () {
        return stage.casts("freezingglare", caster) >= 4 && stage.damageTo(ice) + stage.damageTo(near) > 0;
    }, function () {
        stage.expect(stage.casts("freezingglare", caster) >= 4, "espeon committed freezing glare repeatedly");
        stage.expect(stage.damageTo(ice) + stage.damageTo(near) > 0, "the glare dealt damage");
        stage.note("the freeze roll (now allowed on Ice types), chain length and line of sight are random/positional", {
            casts: stage.casts("freezingglare", caster),
            iceDamage: Math.round(stage.damageTo(ice) * 10) / 10,
            nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
            iceFrozen: stage.hadMobEffect(ice, "world_combat:status/frozen"),
            casterMoved: Math.round(stage.travelled(caster) * 10) / 10
        });
        stage.done();
    }, "freezing glare lands on a foe within 60 s");
});
