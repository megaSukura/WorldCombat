/**
 * 尖石攻击 / stoneedge —— 可执行设计说明。
 *
 * 一句话：一只只会尖石攻击的精灵对着身前的对手蹲身裂地，一条石刺脊从自己脚下朝对手顶出去，把它刺中并在地面留下裂痕。
 * 必然事实：本招被裂出过、目标受到过伤害、地面至少有一格被顶裂（terrain 租借的裂隙）。
 * 刺中几段、是否刺到多个、裂隙留存多久取决于等级、体型与站位，写进 note 供读轨迹判断。
 */
Smoke.scenario("stoneedge", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "tyranitar", level: 50, moves: ["stoneedge"], at: [-3, 0, 0] });
    // 不动的厚实靶子：让脊带必定从头裂到尾，目标不会被推走，裂隙也能被读到。
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(900, function () {
        return stage.casts("stoneedge", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("stoneedge", caster) >= 1, "stone edge was split out of the ground");
            stage.expect(stage.damageTo(foe) > 0, "the spike ridge impaled the foe");
            stage.expect(stage.changedBlocks().length > 0, "the ground was split and leased as terrain");
            stage.note("脊带按 segments 一段段推进，站在脊带里才吃 spike；同一条脊上越靠后的目标按 pierce 递减。裂隙按 scarTicks 留在原地再合上（本场景地面是 stone，被换成 cobbled_deepslate）。", {
                casts: stage.casts("stoneedge", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                changed: stage.changedBlocks().length,
                foeAlive: foe.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the ridge is split toward the foe");
});
