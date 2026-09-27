/**
 * 定身法的可执行设计说明。
 *
 * 场面：一只只会定身法的腕力对一只会主动近身的僵尸开战。僵尸先打腕力，于是它「最近真正命中的攻击类型」有内容；
 *   腕力随后点名封住那一手，并把身份钉在僵尸身上。
 * 必然事实：定身法被提交过；目标身上出现过共享身份 world_combat:status/disable 的定身钉；
 *   钉住后同一签名不再打出伤害（僵尸只做 minecraft:mob_attack）。
 *   本作普通脚本施法者由世界事件 world_combat:committed 真实登记，留待完整装配与人工试玩核对。
 */
Smoke.scenario("disable", function (stage) {
    var caster = stage.pokemon({ species: "Machop", level: 34, moves: ["disable"], at: [-3, 0, 0] });
    var target = stage.mob({ type: "minecraft:zombie", at: [3, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: machop(34) disable vs a hostile zombie; the zombie's own successful melee attack makes a readable native signature");
    stage.until(1200, function () {
        return stage.casts("disable", caster) > 0;
    }, function () {
        // 落钉与效果登记跨一个 tick，等一小会儿再核对。
        stage.after(50, function () {
            var pinnedHealth = caster.health();
            stage.after(80, function () {
                stage.expect(stage.casts("disable", caster) > 0, "disable was committed");
                stage.expect(stage.hadMobEffect(target, "world_combat:status/disable"), "the ordinary target carried the shared disable identity");
                stage.expect(caster.health() >= pinnedHealth, "the pinned native signature did not deal damage through");
                stage.note("定身法点名封住目标最近真正命中过的那一下：普通生物按确切伤害类型（此例 minecraft:mob_attack）在命中结算前挡下；本作脚本动作按当前动作身份在提交点被共享动作策略顶回。封哪一项取决于完成时实际最后的记录，时长与射程随等级、特攻、体型与配置变化。僵尸只做一种攻击，因此钉住后同签名不再造成伤害。", {
                    disableCasts: stage.casts("disable", caster), identitySeen: stage.hadMobEffect(target, "world_combat:status/disable"),
                    statusNow: stage.hasMobEffect(target, "world_combat:status/disable"),
                    casterHealth: caster.health(), casterHealthAtPin: pinnedHealth, tick: stage.tick()
                });
                stage.done();
            });
        });
    }, "disable was cast");
});
