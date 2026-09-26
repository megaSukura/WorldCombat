/**
 * 大字爆炎 / fireblast 的可执行设计说明。
 *
 * 场面：只会大字爆炎的喷火龙（Charizard）对六格外只带跃起、不会还手的卡比兽（Snorlax），晴天平地。
 * 取刻印式，让「字贴地、只有笔画带烫人」的场地效果一起跑；场地是否压到目标取决于随机写偏。
 * 必然事实：本招被提交过（`stage.casts`）——AI 在射程内会锁定目标并写出这个字。
 * 字心会在字的平面里随机写偏、字间空隙可站、暴击与引燃随机，因此「这一发是否正好落在目标身上」不是
 * 必然事实；目标实际受到的伤害与灼伤写进 note 供读轨迹判断。
 */
Smoke.scenario("fireblast", function (stage) {
    stage.fill([-10, -1, -10], [10, -1, 10], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Charizard", level: 50, moves: ["fireblast"], at: [-4, 0, 0] });
    var foe = stage.pokemon({ species: "Snorlax", level: 40, moves: ["splash"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    stage.after(5, function () { stage.prefer(caster, "fireblast", { inscribe: true }); });
    stage.until(1600, function () {
        return stage.casts("fireblast", caster) > 0;
    }, function () {
        // 让整招写完（三笔 + 刻印场地建立 + 至少一次字痕扫描）再收场，覆盖 inscribe 路径。
        stage.after(60, function () {
            stage.expect(stage.casts("fireblast", caster) > 0, "fire blast was committed");
            stage.note("三笔真实段并集判定、笔画间空隙可站；字心随机写偏（fireblast.scatter）、引燃约 10% 起（fireblast.burnChance）、暴击随机；命中与刻印字痕是否压到目标取决于写偏", {
                casts: stage.casts("fireblast", caster),
                onFoe: Math.round(stage.damageTo(foe) * 10) / 10,
                burned: stage.hadMobEffect(foe, "world_combat:status/burn"),
                foeAlive: foe.alive()
            });
            stage.done();
        });
    }, "fire blast is written within 80 s");
});
