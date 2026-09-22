/**
 * 同步干扰 / synchronoise —— 可执行设计说明。
 *
 * 一句话：以自己属性的频率放出一道电波，只对与自己属性相同的敌人造成伤害并锁上「同频」记号，
 * 属性不同的目标被波穿过、毫发无伤——这是本招唯一会完全落空的原因。
 *
 * 场面：超能系的胡地带这一招，站在一只同属性的勇基拉与一只普通系的小拉达之间；
 * 小拉达用来核对「属性不同的人不掉血」这条必然事实，勇基拉用来核对「同频的人挨伤害并被记号锁住」。
 *
 * 断言只取必然事实：这招被放过、同频的勇基拉挨到伤害并挂上共享身份 resonance、不同频的小拉达一点没掉。
 * 暴击、同频人数与余音环数写进 note 供读轨迹判断。
 */
Smoke.scenario("synchronoise", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "alakazam", level: 40, moves: ["synchronoise"], at: [0, 0, 0] });
    var match = stage.pokemon({ species: "kadabra", level: 30, moves: ["tackle"], at: [3.0, 0, 0] });
    var mismatch = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3.0, 0, 1.6] });
    stage.hostile(caster, match);
    stage.hostile(caster, mismatch);
    stage.until(1200, function () {
        return stage.casts("synchronoise", caster) >= 1 && stage.damageTo(match) > 0;
    }, function () {
        // 等效果事件的下一步（mob_effect_added 在效果挂上后的下一个 tick 触发）再核对记号。
        stage.after(5, function () {
            stage.expect(stage.casts("synchronoise", caster) >= 1, "alakazam committed synchronoise");
            stage.expect(stage.damageTo(match) > 0, "the same-type foe took resonance damage");
            stage.expect(stage.hasMobEffect(match, "world_combat:status/resonance")
                && stage.hadMobEffect(match, "world_combat:status/resonance"), "the same-type foe was locked with the resonance identity");
            stage.expect(stage.damageTo(mismatch) <= 0, "the different-type foe took no damage from the wave");
            stage.note("crit, how many same-type foes stood inside the ring and the echo span are random/positional", {
                casts: stage.casts("synchronoise", caster),
                matchDamage: Math.round(stage.damageTo(match) * 10) / 10,
                mismatchDamage: Math.round(stage.damageTo(mismatch) * 10) / 10,
                matchAlive: match.alive(),
                mismatchAlive: mismatch.alive()
            });
            stage.done();
        });
    }, "synchronoise resonates a same-type foe within 60 s");
});
