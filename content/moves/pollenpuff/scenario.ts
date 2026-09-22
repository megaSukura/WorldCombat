/**
 * 花粉团 / pollenpuff —— 可执行设计说明。
 *
 * 一句话：同一团花粉扔向落点，圈内的敌人被炸、圈内的同伴被养。
 *
 * 场面：白天晴天、石地。先用同队的一位受伤伙伴验「对我方使用则是回复」：只放败露球菇与伙伴、没有敌人，
 *   把伙伴打到约一半生命，AI 只会把团子当治疗扔给伙伴。随后再放一只小敌与施法者开战，AI 转去把团子
 *   扔向敌人——用来核对「对敌人使用是会爆炸的」。
 *
 * 断言只取必然事实：花粉团被放过、伙伴从受伤中恢复过、之后敌人受到过伤害。
 *   每次回复量、暴击与同时被照顾的人数写进 note。
 */
Smoke.scenario("pollenpuff", function (stage) {
    stage.fill([-10, -1, -8], [12, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "amoonguss", level: 40, moves: ["pollenpuff"], at: [0, 0, 0] });
    var ally = stage.pokemon({ species: "ribombee", level: 30, moves: ["tackle"], at: [3, 0, 0] });
    stage.team("pollen", [caster, ally]);
    var injuredAt = 0;
    stage.after(5, function () {
        stage.command("damage " + String(ally.ref).split("/")[0] + " " + (ally.health() * 0.5) + " minecraft:generic");
        injuredAt = ally.health();
    });
    stage.until(1200, function () {
        return injuredAt > 0 && stage.casts("pollenpuff", caster) >= 1 && ally.health() > injuredAt;
    }, function () {
        stage.expect(stage.casts("pollenpuff", caster) >= 1, "the caster puffed pollen at the wounded ally");
        stage.expect(ally.health() > injuredAt, "the wounded ally recovered from the pollen puff");
        stage.note("heal face", { casts: stage.casts("pollenpuff", caster), injured: Math.round(injuredAt * 10) / 10, after: Math.round(ally.health() * 10) / 10 });
        var foe = stage.pokemon({ species: "rattata", level: 20, moves: ["tackle"], at: [6, 0, 0] });
        stage.hostile(caster, foe);
        stage.until(1200, function () { return stage.damageTo(foe) > 0; }, function () {
            stage.after(10, function () {
                stage.expect(stage.damageTo(foe) > 0, "a pollen puff later burst on the foe");
                stage.note("sting face", {
                    casts: stage.casts("pollenpuff", caster),
                    foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                    foeAlive: foe.alive(),
                    casterCasts: stage.casts("pollenpuff", caster)
                });
                stage.done();
            });
        }, "pollen puff damages the foe");
    }, "pollen puff heals the wounded ally within 60 s");
});
