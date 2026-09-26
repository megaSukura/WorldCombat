/**
 * 烧尽的可执行设计说明：一只火属性特攻手，面对两只各携带树果的目标。
 * 必然事实：本招被提交过、第一只目标受过伤（横扫的窄火舌扫到了它）。烧毁树果与爆燃追加是确定行为
 * （目标携带树果时 takeHeld 取走并烧毁、只有取走成功才加威力），但舞台接口不暴露持有物与掉落物，
 * 故写进 note 供读轨迹判断；左／右目标受击先后、中途离开、墙后不吃扫火、命中率与暴击同样不写断言。
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
        stage.expect(stage.damageTo(near) > 0, "横扫的窄火舌扫到了目标身上");
        stage.note("目标携带树果，被火舌扫到时树果应被当场烧毁、不落地，且只有这次取走成功才额外吃到爆燃威力；火舌从左缘扫到右缘，不同站位受击先后不同、中途离开就不再被扫到，墙会挡住火线。持有物与掉落物不被舞台接口读取，不写断言。",
            { casts: stage.casts("incinerate", caster), nearDamage: stage.damageTo(near), farDamage: stage.damageTo(far) });
        stage.done();
    }, "烧尽命中并造成伤害");
});
