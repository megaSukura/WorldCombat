/**
 * 恶梦 / nightmare 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。一只只会恶梦的耿鬼（gengar）对一只只带「跃起」、**先醒着**的呆壳兽（slowpoke）
 *   隔空盯着；呆壳兽不还手。先让它醒着：恶梦以共享睡眠身份为门槛，这时它不该被提出；
 *   随后用 /effect 给它续上一段足够长的睡意，睡着之后开始下咒；开咒后停止外部续睡。
 *
 * 必然事实：醒着时没有施放；睡着后恶梦被提交过；目标身上出现过共享的恶梦身份（world_combat:status/nightmare）；
 *   睡者累计受到过伤害（固定比例抽血，不吃防御与相性）；这一抽把它弄醒（共享睡眠身份消失），
 *   醒来后恶梦随之结束（恶梦身份不再存在）——外部续睡在开咒后已停，这两件事只能来自恶梦自己的抽取。
 * 随机／可变项：每跳实际扣血随最大生命与双方特攻／特防变化，暴击不参与；跳数与目标是否撑得住写进 note。
 */
Smoke.scenario("nightmare", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "gengar", level: 42, moves: ["nightmare"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "slowpoke", level: 26, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("醒着时：恶梦以共享睡眠身份为门槛，这时不该被提出");
    // Long external sleeps only until the curse lands; after that the drain must wake the sleeper by itself.
    function keepAsleep(): void {
        if (!target.alive() || stage.casts("nightmare", caster) > 0) return;
        var at = target.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:sleep 100 0 true");
        stage.after(20, keepAsleep);
    }
    stage.after(120, function () {
        stage.expect(stage.casts("nightmare", caster) === 0, "awake target was never cursed");
        stage.note("给目标续上一段足够长的共享睡眠，睡着之后应当开始下咒；开咒后停止外部续睡");
        keepAsleep();
        stage.until(1200, function () {
            return stage.casts("nightmare", caster) > 0 && stage.damageTo(target) > 0
                && !stage.hasMobEffect(target, "world_combat:status/sleep");
        }, function () {
            stage.expect(stage.casts("nightmare", caster) > 0, "nightmare was committed once the target slept");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/nightmare"), "the sleeper carried the shared nightmare identity");
            stage.expect(stage.damageTo(target) > 0, "the nightmare drained the sleeper's health");
            stage.expect(!stage.hasMobEffect(target, "world_combat:status/sleep"), "the drain woke the sleeping target");
            stage.until(60, function () { return !stage.hasMobEffect(target, "world_combat:status/nightmare"); }, function () {
                stage.expect(!stage.hasMobEffect(target, "world_combat:status/nightmare"), "waking ended the nightmare");
                stage.note("恶梦只对睡着的目标成立；每一跳抽走一份最大生命（固定比例，不吃防御与相性），这一抽把睡者弄醒，恶梦随醒来结束——外部续睡在开咒后已停。", {
                    casts: stage.casts("nightmare", caster),
                    damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                    targetHealth: Math.round(target.health() * 10) / 10,
                    targetAlive: target.alive(),
                    stillAsleep: stage.hasMobEffect(target, "world_combat:status/sleep")
                });
                stage.done();
            }, "nightmare disperses when the sleeper wakes");
        }, "nightmare drains and wakes the sleeping target");
    });
});
