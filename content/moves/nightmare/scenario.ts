/**
 * 恶梦 / nightmare 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。一只只会恶梦的耿鬼（gengar）对一只只带「跳跃」、**先醒着**的呆壳兽（slowpoke）
 *   隔空盯着；呆壳兽不还手。先让它醒着：恶梦以共享睡眠身份为门槛，这时它不该被提出；
 *   随后用 /effect 按周期短续睡意，睡着之后才开始下咒。开咒后停止外部续睡，睡眠只能靠恶梦自己每一跳按回去。
 *
 * 必然事实：醒着时没有施放；睡着后恶梦被提交过；目标身上出现过共享的恶梦身份（world_combat:status/nightmare）；
 *   睡者累计受到过伤害（固定比例抽血，不吃防御与相性）；抽血之后**目标此刻仍然带着共享睡眠身份**——
 *   这是「恶梦把被抽醒的人按回睡眠」的直接证据（外部续睡已经停止）。
 * 随机／可变项：每跳实际扣血随最大生命与双方特攻／特防变化，暴击不参与；跳数与目标是否撑得住写进 note。
 */
Smoke.scenario("nightmare", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "gengar", level: 42, moves: ["nightmare"], at: [-2, 0, 0] });
    var target = stage.pokemon({ species: "slowpoke", level: 26, moves: ["splash"], at: [2, 0, 0] });
    stage.hostile(caster, target);
    stage.note("醒着时：恶梦以共享睡眠身份为门槛，这时不该被提出");
    // Short external sleep refreshes only until the curse lands; after that the nightmare must hold the sleeper itself.
    function keepAsleep(): void {
        if (!target.alive() || stage.casts("nightmare", caster) > 0) return;
        var at = target.position();
        stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
            + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:sleep 3 0 true");
        stage.after(40, keepAsleep);
    }
    stage.after(120, function () {
        stage.expect(stage.casts("nightmare", caster) === 0, "awake target was never nightmare-drained");
        stage.note("按周期给目标续上共享睡眠，睡着之后应当开始下咒");
        keepAsleep();
        var castAt = 0;
        stage.until(1200, function () {
            if (castAt === 0 && stage.casts("nightmare", caster) > 0) castAt = stage.tick();
            return castAt > 0 && stage.tick() >= castAt + 120 && stage.damageTo(target) > 0
                && stage.hasMobEffect(target, "world_combat:status/sleep");
        }, function () {
            stage.expect(stage.casts("nightmare", caster) > 0, "nightmare was committed once the target slept");
            stage.expect(stage.hadMobEffect(target, "world_combat:status/nightmare"), "the sleeper carried the shared nightmare identity");
            stage.expect(stage.damageTo(target) > 0, "the nightmare drained the sleeper's health");
            stage.expect(stage.hasMobEffect(target, "world_combat:status/sleep"), "the nightmare held the sleeper down after its own drain");
            stage.note("恶梦只对睡着的目标成立；每一跳抽走一份最大生命（固定比例，不吃防御与相性），并把被抽醒的人按回睡眠——外部续睡在开咒后已停，此刻仍睡着只能来自恶梦本身。", {
                casts: stage.casts("nightmare", caster),
                damageToTarget: Math.round(stage.damageTo(target) * 10) / 10,
                targetHealth: Math.round(target.health() * 10) / 10,
                targetAlive: target.alive(),
                stillAsleep: stage.hasMobEffect(target, "world_combat:status/sleep")
            });
            stage.done();
        }, "nightmare drains and holds the sleeping target");
    });
});
