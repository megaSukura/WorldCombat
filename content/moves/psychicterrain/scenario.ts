// 精神场地的可执行设计说明：让一只超能力属性的宝可梦在贴身对手面前铺开精神域。
// 必然事实：精神场地被放出来过；与场地同层且贴地的施法者身上出现过共享身份 world_combat:status/psychicterrain。
// 位移削减与超能增幅需要真正的原生位移或超能招式，属随机/环境结果，写进 note 供完整装配试玩核对。
Smoke.scenario("psychicterrain", function (stage) {
    stage.weather("clear");
    stage.time("day");
    const caster = stage.pokemon({ species: "abra", level: 30, moves: ["psychicterrain"], at: [-1, 0, 0] });
    const foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("psychicterrain", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/psychicterrain");
    }, function () {
        stage.expect(stage.casts("psychicterrain", caster) > 0, "psychicterrain was cast");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/psychicterrain"), "the grounded caster carried the shared psychicterrain identity");
        stage.after(200, function () {
            stage.note("精神域铺在施法者脚下；只有与场地同层且贴地的活体才获得资格：它受到的击退、冲量与位移在一次结算里减半（多片场不叠乘，原生抗击退随后照常生效），其超能力招式按所站那片场的增幅提高；离地或离场立即解除。本场景的对手未主动推开施法者，位移削减与增幅的实际命中留给完整装配试玩核对。半径/时长/增幅随特攻/身高/等级变化，聚焦与护场各有取舍。", {
                casts: stage.casts("psychicterrain", caster), casterHp: Math.round(caster.health() * 10) / 10,
                damageTaken: Math.round(stage.damageTo(caster) * 10) / 10, foeDealt: Math.round(stage.damageBy(foe) * 10) / 10
            });
            stage.done();
        });
    }, "psychic terrain covers the caster");
});
