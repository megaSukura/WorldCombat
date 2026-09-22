/**
 * 烧尽的可执行设计说明：一只火属性特攻手，面对两只各携带树果的目标。
 * 必然事实：本招被提交过、第一只目标受过伤（扇形火焰命中）。烧毁树果与爆燃追加是确定行为
 * （目标携带树果时 consumeHeld 烧掉并加威力），但舞台接口不暴露持有物与掉落物，故写进 note 供读轨迹判断；
 * 扇面同时扫到几只、命中率与暴击同样不写断言。
 */
Smoke.scenario("incinerate", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Vulpix", level: 32, moves: ["incinerate"], at: [-3, 0, 0] });
    var near = stage.pokemon({ species: "Geodude", level: 28, moves: ["tackle"], item: "cobblemon:cheri_berry", at: [3, 0, 0] });
    var far = stage.pokemon({ species: "Geodude", level: 28, moves: ["tackle"], item: "cobblemon:oran_berry", at: [3, 0, 2] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(1000, function () { return stage.casts("incinerate", caster) > 0 && stage.damageTo(near) > 0; }, function () {
        stage.expect(stage.casts("incinerate", caster) > 0, "烧尽被放出来了");
        stage.expect(stage.damageTo(near) > 0, "扇形火焰扫到了目标身上");
        stage.note("目标携带树果，命中时树果应被当场烧毁、不落地，并额外吃到爆燃威力；第二只目标是否同处扇内随走位变化。持有物与掉落物不被舞台接口读取，不写断言。",
            { casts: stage.casts("incinerate", caster), nearDamage: stage.damageTo(near), farDamage: stage.damageTo(far) });
        stage.done();
    }, "烧尽命中并造成伤害");
});
