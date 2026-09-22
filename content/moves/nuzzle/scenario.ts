/**
 * 蹭蹭脸颊 / nuzzle —— 可执行设计说明。
 *
 * 一句话：得先贴到对手身上；蹭一下带电的脸颊，伤害极小，但一定把对方麻住。
 *
 * 场面：一只只会蹭蹭脸颊的皮卡丘（L35）对一只昏睡的小海狮（L30），相隔 6 格——在起手距离之外，
 *   逼 AI 先走完接近再扑；昏睡让目标不动，扑过去正好够得着。地面铺平、白天晴天。
 *
 * 必然事实：本招被提交过；目标受到过蹭击伤害；目标身上出现过共享麻痹身份（本招的麻痹必定生效，
 *   不是随机掷——若目标为电属性则免疫，本场景用非电属性的小海狮）。
 * 随机量写进 note：暴击、以及施法者扑进接触距离所花的位移。
 */
Smoke.scenario("nuzzle", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "pikachu", level: 35, moves: ["nuzzle"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("nuzzle", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("nuzzle", caster) >= 1, "the caster committed nuzzle");
            stage.expect(stage.damageTo(foe) > 0, "the nuzzle dealt damage to the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/paralysis"), "the nuzzle paralysed the foe (guaranteed on contact)");
            stage.note("crit and the distance the caster had to pounce are variable; a whiff costs the cooldown and nothing else", {
                casts: stage.casts("nuzzle", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeParalysed: stage.hadMobEffect(foe, "world_combat:status/paralysis"),
                casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "nuzzle touches a foe within 60 s");
});
