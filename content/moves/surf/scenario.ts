/**
 * 冲浪 / surf —— 可执行设计说明。
 *
 * 一句话：踏浪而起，从脚下把一整圈水同时向外掀开，圈内的敌人被浇透、被推开，地面明火被浪沤灭。
 *
 * 场面：会冲浪的拉普拉斯带着这一招，站在两只高血量、只会「跃起」不还手的卡比兽之间（它们肉厚，
 * 挨过一次浪仍活着，湿身身份才能被读到）；施法者脚下与两侧摆一圈着火的 netherrack——
 * netherrack 上的火不会自己熄灭，所以火灭掉只可能是浪沤熄的，用来读这招留在世界里的动作。
 *
 * 断言只取必然事实：这招被放过、至少一只卡比兽挨到伤害、至少一只身上出现共享身份
 * `world_combat:status/soaked`（命中即浇透，与水流尾、波动冲、水流裂破共用同一身份）、
 * 至少一处地面火被沤灭。浪推开多远、暴击、命中几个写进 note 供读轨迹判断。
 */
Smoke.scenario("surf", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    // netherrack 上的火永不自然熄灭，只有浪的沤火能让它变成 air。
    var fireXs = [-3, -2, -1, 0, 1, 2, 3];
    for (var i = 0; i < fireXs.length; i++) {
        stage.block([fireXs[i], -1, 3], "minecraft:netherrack");
        stage.block([fireXs[i], -1, -3], "minecraft:netherrack");
        stage.block([fireXs[i], 0, 3], "minecraft:fire");
        stage.block([fireXs[i], 0, -3], "minecraft:fire");
    }
    stage.time("day");
    stage.weather("clear");

    var soaked = "world_combat:status/soaked";
    var caster = stage.pokemon({ species: "lapras", level: 40, moves: ["surf"], at: [0, 0, 0] });
    // 靶子只带跃起、不还手：高血量的卡比兽挨过一次浪仍活着，湿身才读得到。
    var foeA = stage.pokemon({ species: "snorlax", level: 45, moves: ["splash"], at: [2.4, 0, 0] });
    var foeB = stage.pokemon({ species: "snorlax", level: 45, moves: ["splash"], at: [2.0, 0, 1.6] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);

    function fireDoused(): boolean {
        var blocks = stage.changedBlocks();
        for (var c = 0; c < blocks.length; c++) {
            if (blocks[c].before === "minecraft:fire" && blocks[c].after === "minecraft:air") return true;
        }
        return false;
    }

    stage.until(900, function () {
        return stage.casts("surf", caster) > 0 && stage.damageTo(foeA) > 0
            && (stage.hadMobEffect(foeA, soaked) || stage.hadMobEffect(foeB, soaked));
    }, function () {
        stage.after(14, function () {
            stage.expect(stage.casts("surf", caster) > 0, "lapras committed surf");
            stage.expect(stage.damageTo(foeA) > 0 || stage.damageTo(foeB) > 0, "the wave dealt damage to a foe inside the ring");
            stage.expect(stage.hadMobEffect(foeA, soaked) || stage.hadMobEffect(foeB, soaked), "the wave left a foe soaked");
            stage.expect(fireDoused(), "the wave quenched a ground fire for good");
            stage.note("命中即浇上共享身份 world_combat:status/soaked（与水流尾/波动冲/水流裂破同一身份）；施法者湿透（雨里/水里）时浪更广更狠；浪高决定能淹到多高的空中目标；推开多远、暴击、命中几个随局面变化", {
                casts: stage.casts("surf", caster),
                foeADamage: Math.round(stage.damageTo(foeA) * 10) / 10,
                foeBDamage: Math.round(stage.damageTo(foeB) * 10) / 10,
                soakedA: stage.hadMobEffect(foeA, soaked),
                soakedB: stage.hadMobEffect(foeB, soaked),
                firesDoused: stage.changedBlocks().filter(function (c) { return c.before === "minecraft:fire"; }).length,
                casterAt: caster.position().map(function (n) { return Math.round(n * 10) / 10; })
            });
            stage.done();
        });
    }, "surf swamps the ring within 45 s");
});
