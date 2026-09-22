/**
 * 紧咬不放 / jawlock —— 可执行设计说明。
 *
 * 一句话：施法者咬住一只目标，双方都被钉住：目标挨到咬合伤害、带上共享身份 trapped，
 *   它的移动速度属性被压到零，施法者自己也带着「正咬住」状态。
 *
 * 场面：物攻不错的暴噬龟（drednaw，L40）对一只只会跃起、站桩的卡比兽（snorlax，L40）开战，
 *   相距 2 格、直接在咬合距离内。选不会反击的卡比兽当靶：咬住期间没有击退把两者扯开，
 *   「双方都被定住」才是必然事实；铁傀儡的拳会把人击退、当场就能把锁扯断（那是设计里的反制，不写进断言）。
 *
 * 断言只取必然事实：本招被提交过（`stage.casts`）、目标挨到咬合伤害（`stage.damageTo`）、
 *   目标出现过共享身份 world_combat:status/trapped 且当前仍带着被咬住的抖动状态、
 *   目标的移动速度属性被压下去、施法者当前带着紧咬状态。暴击与对峙能维持多久写进 note 供读轨迹判断。
 */
Smoke.scenario("jawlock", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "drednaw", level: 40, moves: ["jawlock"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "snorlax", level: 40, moves: ["splash"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(foe, "minecraft:generic.movement_speed");
    stage.hostile(caster, foe);
    stage.until(900, function () {
        return stage.casts("jawlock", caster) >= 1 && stage.damageTo(foe) > 0
            && stage.hasMobEffect(foe, "world_combat:jaw_locked")
            && stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.after(4, function () {
            stage.expect(stage.casts("jawlock", caster) >= 1, "drednaw committed jaw lock");
            stage.expect(stage.damageTo(foe) > 0, "the bite landed on the target");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/trapped"), "the target carried the shared trapped identity");
            stage.expect(stage.hasMobEffect(foe, "world_combat:jaw_locked"), "the target is still held in the jaws");
            stage.expect(stage.attribute(foe, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the lock pinned the target's movement speed");
            stage.expect(stage.hasMobEffect(caster, "world_combat:jaw_holding"), "the caster is holding the bite");
            stage.note("crit and how long the lock actually lasts before either falls or is torn apart are variable", {
                casts: stage.casts("jawlock", caster),
                foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
                speed: [baseSpeed, stage.attribute(foe, "minecraft:generic.movement_speed")],
                lockedAlive: foe.alive(), casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "jaw lock pins a target within 45 s");
});
