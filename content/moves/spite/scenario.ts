/**
 * 怨恨的可执行设计说明。
 *
 * 第一幕（宝可梦的资源干扰）：一只只会怨恨的鬼斯对 8 格外的腕力送怨念；腕力只会撞击，会先出手，
 *   因此它的「最后使用的招式」很快就有内容。必然事实：怨恨被提交过；怀恨（共享身份
 *   `world_combat:status/grudge`，实体效果 `world_combat:spite_grudge`）落到了目标身上。
 *   随机结果：怨念弹的飞行与命中时机、实际扣掉的 PP 点数写进 note 供读轨迹判断。
 * 第二幕（跨模组生物的减速）：一只只会怨恨的耿鬼对一只冻结的铁傀儡送怨念。普通生物没有 PP，
 *   扣不到任何点数，但怀恨仍应挂在它身上、把它的移动速度属性压低——这是本招对非宝可梦的真实收益。
 *   必然事实：耿鬼提交过怨恨；僵尸带上共享怀恨身份；僵尸的移动速度属性低于怀恨之前。
 */
Smoke.scenario("spite", function (stage) {
    var caster = stage.pokemon({ species: "Gastly", level: 40, moves: ["spite"], at: [-4, 0, 0] });
    var target = stage.pokemon({ species: "Machop", level: 25, moves: ["tackle"], at: [4, 0, 0] });
    stage.hostile(caster, target);
    stage.note("staged: gastly(40) spite vs machop(25) tackle at 8 blocks; machop acts first so its last move is readable");
    stage.until(1200, function () {
        return stage.casts("spite", caster) >= 1 && stage.hadMobEffect(target, "world_combat:status/grudge");
    }, function () {
        stage.expect(stage.casts("spite", caster) >= 1, "spite was committed");
        stage.expect(stage.hadMobEffect(target, "world_combat:spite_grudge"), "the grudge effect exists as a real MobEffect");
        stage.expect(stage.hadMobEffect(target, "world_combat:status/grudge"), "the grudge carries the shared identity");
        stage.note("grudge landed on the Pokemon; the PP cut depends on the target's last move and remaining PP", {
            casts: stage.casts("spite", caster), targetPp: stage.pp(target, "tackle"),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.setPp(caster, "spite", 0); stage.noai(caster, target);
        // 放在另一条轴线上，避免怨念弹先撞到第一阶段的两只宝可梦；铁傀儡不惧日光，能等完整个读条。
        var mob = stage.mob({ type: "minecraft:iron_golem", at: [4, 0, 8] });
        stage.noai(mob);
        var before = stage.attribute(mob, "minecraft:generic.movement_speed");
        var strong = stage.pokemon({ species: "Gengar", level: 60, moves: ["spite"], at: [-6, 0, 8] });
        stage.provoke(strong, mob);
        stage.until(900, function () { return stage.hasMobEffect(mob, "world_combat:status/grudge"); }, function () {
            stage.expect(stage.casts("spite", strong) >= 1, "spite was cast at an ordinary mob");
            stage.expect(stage.hasMobEffect(mob, "world_combat:status/grudge"), "an ordinary mob carries the grudge identity");
            var after = stage.attribute(mob, "minecraft:generic.movement_speed");
            stage.expect(after < before, "the grudge lowers an ordinary mob's movement speed");
            stage.note("a non-Pokemon has no PP, so the grudge only bites movement and cooldown", {
                mobSpeedBefore: before, mobSpeedAfter: after, casts: stage.casts("spite", strong)
            });
            stage.done();
        }, "grudge lands on an ordinary mob");
    }, "spite lands");
});
