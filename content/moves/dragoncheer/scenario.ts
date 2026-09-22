/**
 * 龙声鼓舞 / dragoncheer 的可执行设计说明。
 *
 * 场面：一只只会「龙声鼓舞」的迷你龙（Dratini，30 级，龙属性，因此吃到更强的鼓舞）与一只伊布队友同队站在 2 格内，
 *   斜前方是一只敌对的小拉达当威胁（双方互相开战，让施法者眼里有对手可读）。技能表里只有这一招。
 * 必然事实：本招被提交过；施法者与半径内的队友身上都出现过共享身份 world_combat:status/dragoncheer。
 *   龙属性档的附加概率更高、命中兑现了几次以及是否真的打出要害都带随机与时序，写进 note 供读轨迹判断。
 */
Smoke.scenario("dragoncheer", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "dratini", level: 30, moves: ["dragoncheer"], at: [-2, 0, 0] });
    var ally = stage.pokemon({ species: "eevee", level: 26, moves: ["tackle"], at: [0, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [7, 0, 2] });
    stage.team("cheer", [caster, ally]);
    stage.hostile(ally, foe);
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("dragoncheer", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/dragoncheer")
            && stage.hadMobEffect(ally, "world_combat:status/dragoncheer");
    }, function () {
        stage.expect(stage.casts("dragoncheer", caster) > 0, "dragon cheer was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/dragoncheer"), "the dragon caster carried the shared identity");
        stage.expect(stage.hadMobEffect(ally, "world_combat:status/dragoncheer"), "the nearby ally carried the shared identity");
        stage.after(120, function () {
            stage.note("龙声鼓舞以施法者为锚，把同一身份罩给半径内每个未聚气的友方；龙属性友方的附加概率更高（dragonChance 高于 cheerChance）。已聚气的队友被跳过。是否真的打出要害是随机结果，留待完整装配试玩；长啸与短吼各有代价。", {
                casts: stage.casts("dragoncheer", caster),
                casterHp: caster.health(), allyHp: ally.health(), foeHp: foe.health(), tick: stage.tick()
            });
            stage.done();
        });
    }, "dragon cheer covers the pair");
});
