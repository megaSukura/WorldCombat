/**
 * 怨恨的可执行设计说明。
 *
 * 场面：一只只会怨恨的鬼斯对 8 格外的腕力送怨念；腕力只会撞击，会先出手，因此它的「最后使用的招式」很快就有内容。
 * 必然事实：怨恨被提交过；怀恨（共享身份 `world_combat:status/grudge`，实体效果 `world_combat:spite_grudge`）
 * 落到了目标身上。
 * 随机结果：怨念弹的飞行与命中时机、实际扣掉的 PP 点数（取决于目标那一刻的 PP）写进 note 供读轨迹判断。
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
        stage.note("grudge landed; the PP cut depends on the target's last move and remaining PP", {
            casts: stage.casts("spite", caster), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        stage.done();
    }, "spite lands");
});
