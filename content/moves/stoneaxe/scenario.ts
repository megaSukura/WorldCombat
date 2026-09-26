/**
 * 岩斧 / stoneaxe —— 可执行设计说明。
 *
 * 一句话：一记过顶的岩石斧劈下，岩石碎片悬浮在目标落点四周——走进空域就被砸，飞在低空的也躲不掉。
 *
 * 场面：一只会岩斧的劈斧螳螂（L40）对一只昏睡的小海狮（L30），相隔 3 格——AI 会贴近再劈。
 *   昏睡让目标停在原地，悬浮岩阵正好罩住它，能看清「斧劈命中、浮岩持续砸」这条主线。
 *
 * 必然事实：本招被提交过；目标受到过伤害（斧劈或悬浮岩）。
 * 随机量写进 note：暴击（本招 critChance 掷取）、碎片落到哪一格、悬岩挡下几次都是随机的。
 */
Smoke.scenario("stoneaxe", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "kleavor", level: 40, moves: ["stoneaxe"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "slowpoke", level: 30, moves: ["tackle"], status: "sleep", at: [1, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1400, function () {
        return stage.casts("stoneaxe", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.after(60, function () {
            stage.expect(stage.casts("stoneaxe", caster) >= 1, "the caster committed stoneaxe");
            stage.expect(stage.damageTo(foe) > 0, "the axe or the floating shards struck the foe");
            stage.note("crit and the exact rock cell are random; the sleeping foe is under the field when it rises, so its first entry drops one rock on it; the field is finite and a static foe is not pelted repeatedly", {
                casts: stage.casts("stoneaxe", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                changedBlocks: stage.changedBlocks().length
            });
            stage.done();
        });
    }, "stoneaxe strikes the foe within 70 s");
});
