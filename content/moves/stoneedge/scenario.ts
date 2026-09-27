/**
 * 尖石攻击 / stoneedge —— 可执行设计说明。
 *
 * 一句话：一只只会尖石攻击的精灵对着身前的对手蹲身裂地，一条石刺脊从自己脚下朝对手顶出去，把它刺中；
 * 身前立着一堵高墙，裂缝必须在墙前停下，不会隔墙继续刺到墙后的对手，也不改动任何地表方块。
 *
 * 必然事实：本招被裂出过、墙前目标受到过伤害、墙后目标没有受到伤害（脊在墙前停住）、没有任何登记格被改动。
 * 刺中几段、是否刺到多个、短尖石升起回落与裂痕留存多久取决于等级、体型与站位，写进 note 供读轨迹判断。
 */
Smoke.scenario("stoneedge", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    // 高墙（地板之上 3 格）：真实地表在这里断开，裂缝应当停在墙前。
    stage.fill([0, 0, -3], [0, 2, 3], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "tyranitar", level: 50, moves: ["stoneedge"], at: [-3, 0, 0] });
    // 墙前一个不动的厚实靶子，墙后再放一个：裂缝只能刺到墙前那个。
    var near = stage.mob({ type: "minecraft:iron_golem", at: [-1, 0, 0] });
    var far = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, near);
    stage.hostile(caster, far);
    stage.noai(near, far);
    stage.until(900, function () {
        return stage.casts("stoneedge", caster) >= 1 && stage.damageTo(near) > 0;
    }, function () {
        stage.after(30, function () {
            stage.expect(stage.casts("stoneedge", caster) >= 1, "stone edge was split out of the ground");
            stage.expect(stage.damageTo(near) > 0, "the spike ridge impaled the foe in front of the wall");
            stage.expect(stage.damageTo(far) === 0, "the seam stopped at the wall instead of stabbing through it");
            stage.expect(stage.changedBlocks().length === 0, "the seam leaves no changed or replaced ground blocks");
            stage.note("起点与方向在释放时锁死，施术者移动不再拖动裂缝；脊带按 segments 一段段沿真实 SurfacePaths 地表推进，遇到断口、高墙或过陡台阶就停在上一段，只按实际走到的地表判定与绘制。站在脊带里的目标吃 spike，同一条脊上越靠后的按 pierce 递减；短尖石由客户端在真实地表升起再回落，裂痕按真实触地点画线留存 scarTicks，不再替换地表方块。", {
                casts: stage.casts("stoneedge", caster),
                nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
                farDamage: Math.round(stage.damageTo(far) * 10) / 10,
                changed: stage.changedBlocks().length,
                nearAlive: near.alive(),
                farAlive: far.alive(),
                tick: stage.tick()
            });
            stage.done();
        });
    }, "the ridge is split toward the foe and stops at the wall");
});
