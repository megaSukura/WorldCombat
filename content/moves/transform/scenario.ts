/**
 * 变身的可执行设计说明。
 *
 * 场面：只会变身的百变怪对一只不动也不还手的僵尸（原版 Monster）。僵尸天然被野生大脑读成威胁，
 *   变身因此被排进出手计划；附近唯一可复制的身体就是它，于是走普通主体分支——把僵尸的原生攻击、
 *   移动与防护属性借过来。
 * 必然事实：变身被提交过；施法者身上出现过共享身份 world_combat:status/transformed 的形态；
 *   僵尸的原生攻击力确实落到了施法者身上（普通分支可观察的复制结果）。
 * 随机结果：形态时长、借来的属性是否被用出来，写进 note 供读轨迹判断。宝可梦分支（招式/六维/类型/特性）
 *   走同一枚 mark 与 NativeModifiers.copy 合同，由单元检查与用户试玩覆盖。
 */
Smoke.scenario("transform", function (stage) {
    stage.time("night");
    stage.weather("clear");
    // 围一圈矮墙：野生百变怪会溜达，出了自家视野范围就不再把这些对手当作威胁；围住它，双方始终在彼此眼里。
    for (var ring = 0; ring <= 1; ring++) {
        stage.fill([-6, ring, -6], [6, ring, -6], "minecraft:stone");
        stage.fill([-6, ring, 6], [6, ring, 6], "minecraft:stone");
        stage.fill([-6, ring, -6], [-6, ring, 6], "minecraft:stone");
        stage.fill([6, ring, -6], [6, ring, 6], "minecraft:stone");
    }
    var caster = stage.pokemon({ species: "ditto", level: 32, moves: ["transform"], at: [-2, 0, 0] });
    // 不动也不出手的复制来源：原版 Monster 天然被读成威胁，又不还手，变身才有稳定的可复制对象。
    var source = stage.mob({ type: "minecraft:zombie", at: [2, 0, 0] });
    stage.command("data merge entity @e[type=minecraft:zombie,sort=nearest,limit=1] {NoAI:1b}");
    var sourceAttack = stage.attribute(source, "minecraft:generic.attack_damage");
    stage.note("staged: ditto(32) transform against a still zombie; source native attack " + sourceAttack);
    // 野生大脑会清掉原生目标；用有界的高频定时重申敌意，让百变怪持续把僵尸读成威胁。
    for (var step = 1; step <= 300; step++) {
        stage.after(step * 4, function () { stage.hostile(caster, source); });
    }
    stage.until(1200, function () {
        return stage.casts("transform", caster) > 0;
    }, function () {
        // 形态身份的登记跨一个 tick；再给借来的属性一点作用时间，note 里的观察才有内容。
        stage.after(160, function () {
            stage.expect(stage.casts("transform", caster) > 0, "transform was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/transformed"), "the caster carried the shared transformed identity");
            stage.expect(Math.abs(stage.attribute(caster, "minecraft:generic.attack_damage") - sourceAttack) < 0.75,
                "the borrowed native attack reached the caster");
            stage.note("普通分支把来源的原生攻击、移动与防护属性写进施法者的临时层，生命、库存与外形不动；宝可梦分支则走 NativeModifiers.copy 写招式/六维/类型/特性。每次变身一枚自己的 transformMark 记下复制层与载体，刷新时旧层只清自己那层，不会抹掉新形态。形态时长与射程随等级、特防、特攻、体型与配置变化，记录在这里。", {
                transformCasts: stage.casts("transform", caster), sourceAttack: Math.round(sourceAttack * 10) / 10,
                casterAttack: Math.round(stage.attribute(caster, "minecraft:generic.attack_damage") * 10) / 10,
                casterHealth: caster.health(), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10, tick: stage.tick()
            });
            stage.done();
        });
    }, "transform lands");
});
