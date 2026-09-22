/**
 * 打嗝 / belch —— 可执行设计说明。
 *
 * 一句话：一只携带树果的双弹瓦斯把果子咬碎吞下，朝身前的铁傀儡喷出一团短而宽的毒气，铁傀儡挨到伤害。
 *
 * 场面：双弹瓦斯带这一招、手里握着一颗文柚果，正对一只血厚的铁傀儡——两个条件缺一不可：手里有树果
 * （`ready`/`available` 的门槛）才使得出，铁傀儡血厚又打不死，用来核对这一口确实喷到了人身上。
 *
 * 断言只取必然事实：这招被放过、目标挨到伤害。是否中毒、暴击与具体伤害量是随机结果，写进 note 供读轨迹判断；
 * 「树果被吃掉、之后再无树果就打不出」是确定行为，但舞台接口不暴露持有物，写进 note。
 */
Smoke.scenario("belch", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "weezing", level: 40, moves: ["belch"], item: "cobblemon:oran_berry", at: [-2.6, 0, 0] });
    var thick = stage.mob({ type: "minecraft:iron_golem", at: [0.8, 0, 0] });
    stage.hostile(caster, thick);
    stage.until(900, function () {
        return stage.casts("belch", caster) >= 1 && stage.damageTo(thick) > 0;
    }, function () {
        stage.after(10, function () {
            stage.expect(stage.casts("belch", caster) >= 1, "weezing committed belch");
            stage.expect(stage.damageTo(thick) > 0, "the gas cloud hit the iron golem");
            stage.note("the caster starts holding an Oran Berry, which belch consumes on the first use, so it can belch exactly once; whether the golem was poisoned and the crit roll are random", {
                casts: stage.casts("belch", caster),
                thickDamage: Math.round(stage.damageTo(thick) * 10) / 10,
                poisoned: stage.hadMobEffect(thick, "world_combat:status/poison"),
                thickAlive: thick.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "belch eats its Berry and sprays a foe within 45 s");
});
