/**
 * 打鼾 / snore —— 可执行设计说明。
 *
 * 一句话：睡着时才成立的一记鼾声——从口鼻朝目标喷出一道声波，命中造成特殊伤害并可能把它震懵。
 *
 * 场面：只会打鼾的卡比兽站在一侧，对面一只不带招式的卡比兽当靶子（它不会还手，所以施术者的睡不会被伤害打断）。
 * 先让施术者醒着：打鼾以共享睡眠身份为门槛，这时它不该被提出；随后按周期（按自身位置选中自己）用 /effect
 * 把睡眠续上，施术者就会在睡梦里喷出鼾声。
 *
 * 断言只取必然事实：醒着时没有施放；睡着后提交过打鼾；靶子挨到过伤害。
 * 每一声约 30% 的畏缩掷骰、靶子的走向与暴击都是随机／位置项，写进 note 供读轨迹判断。
 */
Smoke.scenario("snore", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "snorlax", level: 40, moves: ["snore"], at: [0, 0, 0] });
    // 不带招式的宝可梦靶子：不会还手，就不会把施术者打醒。
    var foe = stage.pokemon({ species: "snorlax", level: 50, moves: [], at: [5, 0, 0] });
    stage.hostile(caster, foe);
    stage.note("醒着时：打鼾以共享睡眠身份为门槛，这时不该被提出");
    stage.after(140, function () {
        stage.expect(stage.casts("snore", caster) === 0, "awake caster never cast snore");
        stage.note("按周期续上睡眠，睡梦里应当开始喷出鼾声");
        function keepAsleep() {
            if (!caster.alive()) return;
            var at = caster.position();
            stage.command("execute positioned " + at[0] + " " + at[1] + " " + at[2]
                + " run effect give @e[type=cobblemon:pokemon,distance=..2,limit=1,sort=nearest] world_combat:sleep 20 0 true");
            stage.after(60, keepAsleep);
        }
        keepAsleep();
        var castTick = 0;
        stage.until(700, function () {
            if (castTick === 0 && stage.casts("snore", caster) >= 1) castTick = stage.tick();
            return castTick > 0 && stage.tick() >= castTick + 40 && stage.damageTo(foe) > 0;
        }, function () {
            stage.expect(stage.casts("snore", caster) >= 1, "the sleeping caster committed snore");
            stage.expect(stage.damageTo(foe) > 0, "the snore blast dealt damage");
            stage.note("每声约 30% 的畏缩掷骰、靶子的走向、暴击都是随机／位置项；场景用 /effect 续睡以保持门槛成立", {
                casts: stage.casts("snore", caster),
                damageToFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                anyFlinched: stage.hadMobEffect(foe, "world_combat:status/flinch"),
                sleptEver: stage.hadMobEffect(caster, "world_combat:status/sleep"),
                casterAlive: caster.alive(),
                tick: stage.tick()
            });
            stage.done();
        }, "snore lands on the foe within 35 s");
    });
});
