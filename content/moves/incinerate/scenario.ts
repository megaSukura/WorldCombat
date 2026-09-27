/**
 * 烧尽的可执行设计说明：一只火属性特攻手，面对两只各携带树果的目标。
 * 必然事实：本招被提交过、第一只目标受过伤（横扫的窄火舌扫到了它），且它携带的树果被真的取走烧毁（舞台可读持有物）。
 * 第二场景用两只静止、共线的僵尸验证「前体挡后体」：近者吃火、被它挡住的远者整次都不受伤。
 * 左／右目标受击先后、中途离开、爆燃追加、命中率与暴击随机，写进 note 供读轨迹判断。
 */
Smoke.scenario("incinerate", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    var caster = stage.pokemon({ species: "Vulpix", level: 32, moves: ["incinerate"], at: [-3, 0, 0] });
    var near = stage.pokemon({ species: "Geodude", level: 28, moves: ["tackle"], item: "cobblemon:cheri_berry", at: [3, 0, 0] });
    var far = stage.pokemon({ species: "Geodude", level: 28, moves: ["tackle"], item: "cobblemon:oran_berry", at: [3, 0, 2] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(1000, function () { return stage.casts("incinerate", caster) > 0 && stage.damageTo(near) > 0; }, function () {
        stage.after(4, function () {
            stage.expect(stage.casts("incinerate", caster) > 0, "烧尽被放出来了");
            stage.expect(stage.damageTo(near) > 0, "横扫的窄火舌扫到了目标身上");
            stage.expect(stage.heldItem(near) === "", "被火舌扫到的目标，携带的树果被当场取走烧毁");
            stage.note("树果被扫到即当场烧毁、不落地；只有这次取走成功才额外吃爆燃威力。火舌连续扫过整张角，不同站位受击先后不同、中途离开就不再被扫到，墙会挡住火线。",
                { casts: stage.casts("incinerate", caster), nearDamage: stage.damageTo(near), farDamage: stage.damageTo(far), nearHeld: stage.heldItem(near) });
            stage.done();
        });
    }, "烧尽命中并造成伤害");
});

Smoke.scenario("incinerate-block", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 8], "minecraft:stone");
    stage.time("midnight");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Vulpix", level: 40, moves: ["incinerate"], at: [0, 0, 0] });
    var front = stage.mob({ type: "minecraft:zombie", at: [1.4, 0, 0] });
    var back = stage.mob({ type: "minecraft:zombie", at: [2.6, 0, 0] });
    stage.command("attribute " + front.ref.split("/")[0] + " minecraft:generic.max_health base set 2000");
    stage.command("data merge entity " + front.ref.split("/")[0] + " {Health:2000f}");
    stage.command("attribute " + back.ref.split("/")[0] + " minecraft:generic.max_health base set 2000");
    stage.command("data merge entity " + back.ref.split("/")[0] + " {Health:2000f}");
    stage.noai(front, back);
    stage.hostile(caster, front);
    stage.hostile(caster, back);
    stage.until(1200, function () { return stage.casts("incinerate", caster) > 0 && stage.damageTo(front) > 0; }, function () {
        stage.after(4, function () {
            stage.expect(stage.damageTo(front) > 0, "共线时前面的身体先吃到横扫的火");
            stage.expect(stage.damageTo(back) === 0, "被前面身体挡住的远者整次都没被火舌扫到");
            stage.note("两只静止僵尸与施法者共线；任何能到达远处身体的火线都先穿过近处身体，因此远者不吃火（前体挡后体）。",
                { casts: stage.casts("incinerate", caster), frontDamage: stage.damageTo(front), backDamage: stage.damageTo(back) });
            stage.done();
        });
    }, "烧尽被前排身体挡住后排");
});
