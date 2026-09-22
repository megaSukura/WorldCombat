/**
 * 爆音波 / boomburst —— 可执行设计说明。
 *
 * 一句话：憋住一口气再把声压整圈炸出去，身周所有敌人（空中地上一起）被轰中并被击飞，
 * 越靠近中心越重、吹得越远；爆响在每个人（包括施法者自己）耳里留下耳鸣。
 *
 * 场面：普通系的爆音怪带这一招，站在一只小敌与一只原版铁傀儡旁边——小敌会冲上来（看得见被吹开），
 * 铁傀儡血厚打不死（用来核对命中后确实挂上了耳鸣）。两者都不在视线检查里，逼出「不看属性不看地面」的场面。
 *
 * 断言只取必然事实：这招被放过、至少一个敌人挨到伤害、被打而不死的铁傀儡带上共享身份 deafened、
 * 施法者自己也带上 deafened。具体被吹开多远、暴击与距离衰减写进 note。
 */
Smoke.scenario("boomburst", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "exploud", level: 45, moves: ["boomburst"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 18, moves: ["tackle"], at: [2.6, 0, 0] });
    var thick = stage.mob({ type: "minecraft:iron_golem", at: [2.2, 0, 1.2] });
    stage.hostile(caster, foe);
    stage.hostile(caster, thick);
    stage.until(1200, function () {
        return stage.casts("boomburst", caster) >= 1 && stage.damageTo(thick) > 0;
    }, function () {
        stage.after(15, function () {
            stage.expect(stage.casts("boomburst", caster) >= 1, "exploud committed boomburst");
            stage.expect(stage.damageTo(thick) > 0, "the shock wave hit the iron golem");
            stage.expect(stage.hadMobEffect(thick, "world_combat:status/deafened"), "the golem was left with ringing ears");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/deafened"), "the caster deafened itself too");
            stage.note("how far each target was flung, the distance falloff and the crit roll are random/positional", {
                casts: stage.casts("boomburst", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                thickDamage: Math.round(stage.damageTo(thick) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(foe) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "boomburst blasts an enemy within 60 s");
});
