/**
 * 撒菱 / spikes —— 可执行设计说明。
 *
 * 一句话：把一把碎片撒到敌人脚下的地面，插成一圈尖刺；踏进来的那一下被扎，之后要在刺地里真的走出一步才会再被扎。
 *
 * 场面：物攻不低、会撒菱的盔甲鸟带这一招；对面是一只铁傀儡（贴地、会走向施法者）。AI 把碎片撒在它身上，
 *   入口那一下是必然。随后冻住它站定一段，伤害不应继续周期上涨；再解冻让它走，走过刺地才会出现第二次扎伤。
 *
 * 断言只取必然事实：这招被放过、入口扎出伤害、静置不再掉血、走动后又挨一次。跳跃躲避、层数、暴击与
 *   具体落点写进 note。
 */
Smoke.scenario("spikes", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "skarmory", level: 60, moves: ["spikes"], at: [-6, 0, 0] });
    var heavy = stage.mob({ type: "minecraft:iron_golem", at: [1, 0, 0] });
    stage.hostile(caster, heavy);
    stage.setPp(caster, "spikes", 1);
    stage.until(1200, function () {
        return stage.casts("spikes", caster) >= 1 && stage.damageTo(heavy) > 0;
    }, function () {
        // 先冻住：铁傀儡已经贴地走过，落地状态保留；把施法者也冻住并挪远，避免它贴着目标把它推来推去。
        stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..16,limit=1] {NoAI:1b}");
        stage.noai(caster);
        stage.command("tp " + caster.ref.split("/")[0] + " ~-24 ~ ~");
        stage.after(15, function () {
            var entry = stage.damageTo(heavy);
            stage.expect(stage.casts("spikes", caster) >= 1, "skarmory committed spikes");
            stage.expect(entry > 0, "the golem was cut when it entered the spikes");
            stage.after(90, function () {
                var still = stage.damageTo(heavy);
                stage.expect(still <= entry + 0.01, "standing still on the spikes takes no further cut");
                stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..16,limit=1] {NoAI:0b}");
                stage.provoke(heavy, caster);
                stage.after(240, function () {
                    var walked = stage.damageTo(heavy);
                    stage.expect(walked > still + 0.01, "walking across the spikes cut the golem again");
                    stage.note("entry cut lands once; standing on the patch adds nothing, and the next cut only lands after the golem actually walks about 0.9 blocks inside. Jumping over the middle would pause the accumulation. Layer count, crits and the exact landing point are positional/random.", {
                        casts: stage.casts("spikes", caster),
                        entryDamage: Math.round(entry * 10) / 10,
                        stillDamage: Math.round(still * 10) / 10,
                        walkedDamage: Math.round(walked * 10) / 10,
                        heavyAlive: heavy.alive()
                    });
                    stage.done();
                });
            });
        });
    }, "spikes cut on entry, then only when the golem walks");
});
