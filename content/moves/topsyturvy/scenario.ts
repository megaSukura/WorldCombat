/**
 * 颠倒 / topsyturvy 的可执行设计说明。
 *
 * 场面：一只只会「颠倒」的乌贼王（Malamar）与一只不会动、不会还手的铁傀儡隔开 5 格开战；夜晚、天晴。
 *   技能表里只有这一招，所以 AI 只会甩镜片；威胁在考虑距离内，它会先甩出去（射程够）。
 * 必然事实：本招被提交过；被镜片命中的目标带上共享身份 world_combat:status/inverted。
 * 「真的把等级翻了几项」取决于目标身上有非零能力变化——这套私有装配里没有给铁傀儡加等级的招式单元，
 *   所以翻转数写进 note（预期为 0），取反循环本身是同一段代码，在实战里对攒了增益的目标生效。
 */
Smoke.scenario("topsyturvy", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "malamar", level: 40, moves: ["topsyturvy"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [0, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..12,limit=1] {NoAI:1b}");
    stage.until(700, function () {
        return stage.casts("topsyturvy", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/inverted");
    }, function () {
        stage.expect(stage.casts("topsyturvy", caster) > 0, "topsy-turvy was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/inverted"), "the struck target carried the shared inverted identity");
        stage.note("the iron golem carries no non-zero stat changes, so this arena flips zero entries; the same loop negates every non-zero stage in play", {
            casts: stage.casts("topsyturvy", caster),
            casterHp: Math.round(caster.health() * 10) / 10,
            foeHp: Math.round(foe.health() * 10) / 10,
            marked: stage.hasMobEffect(foe, "world_combat:status/inverted")
        });
        stage.done();
    }, "the mirror flips the target");
});
