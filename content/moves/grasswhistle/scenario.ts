/**
 * 草笛 / grasswhistle 的可执行设计说明。
 *
 * 场面：晴天白天、开阔石地。只会草笛的美丽花（bellossom）正前方一条线上排着两只只会「跃起」的呆壳兽
 *   （slowpoke）：一只 5 格、一只 7 格；再往后 9 格处横着一道石墙，墙后 11 格站着第三只，用来验证
 *   「墙截断后段」。前两只不还手，让「一声沿直线扎穿」这件事可复现。
 *
 * 必然事实：草笛被提交过；近处那只身上出现过共享的睡眠身份（world_combat:status/sleep）；墙后那只是因为
 *   被墙截断，任何一次吹奏都不会把睡意送到它身上。随机结果：这一声是响是裂由双方特攻／特防与等级决定
 *   （参数公式的 landChance），裂了整条线都只剩走音；远处墙前那只有没有被同一声穿过（voices 上限与站位
 *   决定）写进 note 供读轨迹判断。草属性对声音不免疫。
 */
Smoke.scenario("grasswhistle", function (stage) {
    stage.weather("clear");
    stage.time("day");
    var caster = stage.pokemon({ species: "bellossom", level: 42, moves: ["grasswhistle"], at: [-4, 0, 0] });
    var near = stage.pokemon({ species: "slowpoke", level: 18, moves: ["splash"], at: [1, 0, 0] });
    var far = stage.pokemon({ species: "slowpoke", level: 18, moves: ["splash"], at: [3, 0, 0] });
    var behind = stage.pokemon({ species: "slowpoke", level: 18, moves: ["splash"], at: [7, 0, 0] });
    stage.fill([5, 0, -16], [5, 2, 16], "minecraft:stone");
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.until(1600, function () {
        return stage.casts("grasswhistle", caster) > 0 && stage.hadMobEffect(near, "world_combat:status/sleep");
    }, function () {
        stage.expect(stage.casts("grasswhistle", caster) > 0, "grass whistle was committed");
        stage.expect(stage.hadMobEffect(near, "world_combat:status/sleep"), "the near listener carried the shared sleep identity");
        stage.expect(!stage.hadMobEffect(behind, "world_combat:status/sleep"), "the wall cut the lane off before the listener behind it");
        stage.note("一声哨音沿选定方向扎出、要么响要么裂；响了按 voices 上限穿过音线内通视的非友方。石墙把音线截断，墙后的呆壳兽不会被这一声带走。远处墙前那只是否被同一声穿过见轨迹。", {
            casts: stage.casts("grasswhistle", caster),
            farSlept: stage.hadMobEffect(far, "world_combat:status/sleep"),
            behindSlept: stage.hadMobEffect(behind, "world_combat:status/sleep"),
            casterHp: Math.round(caster.health() * 10) / 10,
            nearHp: Math.round(near.health() * 10) / 10
        });
        stage.done();
    }, "the whistle puts the near listener to sleep");
});
