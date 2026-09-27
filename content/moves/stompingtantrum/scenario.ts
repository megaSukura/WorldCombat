/**
 * 跺脚 / stompingtantrum —— 可执行设计说明。
 *
 * 一句话：一只只会跺脚的宝可梦踩着地面，朝目标跺出一条地裂，缝上落地的敌人吃一记重脚；
 *   地板在中途连续断开，裂缝必须停在断口，不会凭空补一米跺到对岸。
 *
 * 场面：Donphan（地面系，Lv40）只带跺脚，对两只血厚、抗击退拉满的铁傀儡；断口近侧一只、远侧一只。
 *   两只都保持原生 AI，所以都算站在地上（本招只打触地的目标）；断口贯通整条 z 向场地，远侧那只
 *   过不来，只能验证裂缝确实停在近侧断口。铁傀儡抗击退拉满，逼出「站在缝上吃一记、但不会被强抛」。
 * 断言只取必然事实：本招被跺出过；断口近侧目标吃到过伤害；断口远侧目标没有吃到（裂缝在断口停住）；
 *   没有任何地表方块被替换。上抛走 hitImpulse、受原生抗击退/权限约束；「上一次打空后翻倍」取决于
 *   是否先跺空，属时序结果；写进 note 供读轨迹判断。
 */
Smoke.scenario("stompingtantrum", function (stage) {
    stage.fill([-10, -1, -6], [10, -1, 6], "minecraft:stone");
    // 地板在 x=1 处连续断开两格，并向两侧延伸很远：真实支撑到此为止，裂缝不能隔空延续，
    // 远侧目标也无法绕过来，只能验证裂缝确实停在断口。
    for (var z = -16; z <= 16; z++) {
        stage.block([1, -1, z], "minecraft:air");
        stage.block([1, -2, z], "minecraft:air");
    }
    stage.time("day");
    stage.weather("clear");
    var user = stage.pokemon({ species: "donphan", level: 40, moves: ["stompingtantrum"], at: [-4, 0, 0] });
    var near = stage.mob({ type: "minecraft:iron_golem", at: [-2, 0, 0] });
    var far = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.hostile(user, near);
    stage.hostile(user, far);
    stage.until(1400, function () {
        return stage.casts("stompingtantrum", user) > 0 && stage.damageTo(near) > 0;
    }, function () {
        stage.after(40, function () {
            stage.expect(stage.casts("stompingtantrum", user) > 0, "donphan stomped the ground");
            stage.expect(stage.damageTo(near) > 0, "the fissure reached the grounded foe before the gap");
            stage.expect(stage.damageTo(far) === 0, "the fissure stopped at the gap instead of bridging it");
            stage.expect(stage.changedBlocks().length === 0, "the seam replaces no ground blocks");
            stage.note("裂缝从脚下真实顶面沿 SurfacePaths 原生支撑推进，断口一出现就停在上一段，判定与表现共用同一组地表端点；上抛走 hitImpulse，铁傀儡抗击退拉满，位移大多来自它自己走动。单场里是否先跺空是时序结果，读轨迹里的 damageIn 判断。", {
                casts: stage.casts("stompingtantrum", user),
                nearDamage: Math.round(stage.damageTo(near) * 10) / 10,
                farDamage: Math.round(stage.damageTo(far) * 10) / 10,
                foeTravelled: Math.round(stage.travelled(near) * 10) / 10,
                changed: stage.changedBlocks().length,
                gapTop: stage.blockAt([1, -1, 0]),
                gapBelow: stage.blockAt([1, -2, 0]),
                grudge: stage.hadMobEffect(user, "world_combat:status/stompingtantrum"),
                nearAlive: near.alive(),
                farAlive: far.alive()
            });
            stage.done();
        });
    }, "the tantrum lands");
});
