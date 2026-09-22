/**
 * 变身的可执行设计说明。
 *
 * 场面：只会变身的百变怪对 4 格外、只会定身法的凯西；旁边站着一只不动也不变的僵尸。
 *   僵尸（原版 Monster）让百变怪把附近读成有威胁，变身因此被排进出手计划；威胁本身不是宝可梦，
 *   变身就近挑可复制的那一个——凯西，把它的招式整套借过来。
 *   （用本组四招之一作为被借的招，是因为这一趟私有装配里只装载本组的四招。）
 * 必然事实：变身被提交过；施法者身上出现过共享身份 world_combat:status/transformed 的形态。
 * 随机结果：形态时长、借来的六维、借来的手是否真被用出来，写进 note 供读轨迹判断。
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
    var foe = stage.pokemon({ species: "Kadabra", level: 34, moves: ["disable"], at: [2, 0, 0] });
    var caster = stage.pokemon({ species: "ditto", level: 32, moves: ["transform"], at: [-2, 0, 0] });
    // 不动也不出手的威胁源：原版 Monster 天然被读成威胁，又不还手，变身才有稳定的可复制对象。
    var menace = stage.mob({ type: "minecraft:zombie", at: [-2, 0, 4] });
    stage.command("data merge entity @e[type=minecraft:zombie,sort=nearest,limit=1] {NoAI:1b}");
    stage.note("stationary menace: " + menace.name);
    // 野生大脑会清掉原生目标；用有界的高频定时重申敌意，让凯西也把百变怪读成威胁，借来的手才有对象。
    for (var step = 1; step <= 300; step++) {
        stage.after(step * 4, function () { stage.hostile(caster, foe); });
    }
    stage.note("staged: ditto(32) transform vs kadabra(34) disable with a still zombie nearby; the borrowed disable proves the move set moved over");
    stage.until(1200, function () {
        return stage.casts("transform", caster) > 0;
    }, function () {
        // 形态身份的登记跨一个 tick；再给借来的手一点出手时间，note 里的观察才有内容。
        stage.after(160, function () {
            stage.expect(stage.casts("transform", caster) > 0, "transform was committed");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/transformed"), "the caster carried the shared transformed identity");
            stage.note("变身把目标的六维、类型、特性与全部招式写进施法者的临时层，到期或被清除时按旁挂的层 id 精确收回。外观模型不随战斗形态一起换（共享层暂无「临时改写渲染形态」接口，见报告）。形态时长与射程随等级、特防、特攻、体型与配置变化；借来的手是否紧接着被用出来取决于野生大脑对局面的判断，记录在这里。", {
                transformCasts: stage.casts("transform", caster), borrowedDisables: stage.casts("disable", caster),
                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10, tick: stage.tick()
            });
            stage.done();
        });
    }, "transform lands");
});
