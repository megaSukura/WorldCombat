/**
 * 封印的可执行设计说明。
 *
 * 场面：一只同时会接触（撞击）与远程（念力）直接进攻的凯西，对 5 格外、只会接触撞击的胖可丁开战。
 *   封印默认封锁接触类：敌人带着接触攻击、施法者也留有另一类输出，所以 AI 会立印。
 * 必然事实：封印被提交过；对手身上出现过共享身份 world_combat:status/imprison 的封印印记；
 *   对手第一次符合所选类别的实际攻击在统一伤害入口被顶回（不扣血），同一对手的下一击在份额用掉后照常命中。
 *   领域实际罩了多久、半径多少、离圈/隔墙是否放行，写进 note 供读轨迹判断。
 */
Smoke.scenario("imprison", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kadabra", level: 36, moves: ["imprison", "tackle", "confusion"], at: [-2, 0, 0] });
    // 只会同类接触攻击的耐打靶子：它不会自己出手打断节奏，接触命中由下面两次受控注入代表。
    var foe = stage.pokemon({ species: "blissey", level: 50, moves: ["tackle"], at: [3, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    stage.until(1200, function () {
        return stage.casts("imprison", caster) > 0 && stage.hadMobEffect(foe, "world_combat:status/imprison");
    }, function () {
        stage.expect(stage.casts("imprison", caster) > 0, "imprison was committed");
        stage.expect(stage.hadMobEffect(foe, "world_combat:status/imprison"), "the foe carried the shared imprison identity");
        stage.after(2, function () {
            var before = stage.damageTo(caster);
            stage.hurt(caster, 6, "minecraft:mob_attack", { source: foe, metadata: { contact: true, kind: "move", category: "physical", type: "normal" } });
            var afterFirst = stage.damageTo(caster);
            stage.expect(afterFirst <= before + 0.001, "the foe's first matching contact attempt was turned back");
            stage.after(15, function () {
                stage.hurt(caster, 6, "minecraft:mob_attack", { source: foe, metadata: { contact: true, kind: "move", category: "physical", type: "normal" } });
                var afterSecond = stage.damageTo(caster);
                stage.expect(afterSecond > afterFirst + 0.001, "the same foe's next contact hit went through after its share was spent");
                stage.note("封印立在施法者身上：圈内每个可见敌人各带一条锁纹，第一次符合所选类别的实际伤害尝试在统一伤害入口被拒一次并当拍破开，之后照常；施法者自己那一类也被自己的门禁挡住。领域半径/时长随特攻、体型、等级与配置变化，敌人离圈或隔墙即失去保护对象，份额在领域结束前不刷新。", {
                    casts: stage.casts("imprison", caster), before: before, afterFirst: afterFirst, afterSecond: afterSecond,
                    foeTackles: stage.casts("tackle", foe), casterTackles: stage.casts("tackle", caster),
                    casterConfusions: stage.casts("confusion", caster), tick: stage.tick()
                });
                stage.done();
            });
        });
    }, "imprison seals the chosen class for a foe");
});
