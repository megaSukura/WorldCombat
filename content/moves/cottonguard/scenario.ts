/**
 * 棉花防守 的可执行设计说明。
 *
 * 场面：一只只会「棉花防守」的毛辫羊被石墙三面围在一格、一只关闭 AI 的僵尸贴在唯一敞开的正面；技能表里
 *   只有这一招，所以 AI 只能先裹绒衣。围住施法者是为了让合成打击前后的身体间距保持在真实贴身范围（原生
 *   击退与 AI 后撤都被墙挡住），从而检验「贴身的 contact 才压层」。另有一只远处的僵尸用同一条 contact 路径
 *   从贴身范围外打来作为长柄/远程对照，最后再用不带 contact 的箭验一次普通远程。
 * 必然事实：本招被提交过；绒衣窗口出现；默认厚裹使移速下降；满层防御不超过本招自己的 3 级；两次贴身接触
 *   压掉绒层、收回本来源防御并有限推开打击者；贴身范围外的 contact 与普通远程都不压层、不推人。
 * 具体裹了几层、推开多远、剩余防御写进 note 供读轨迹。
 */
Smoke.scenario("cottonguard", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    // 三面石墙：施法者被击退或后撤时无法离开贴身位置。
    stage.fill([-1, -1, -1], [-1, 2, 1], "minecraft:stone");
    stage.fill([-1, -1, -1], [1, 2, -1], "minecraft:stone");
    stage.fill([-1, -1, 1], [1, 2, 1], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "wooloo", level: 35, moves: ["cottonguard"], at: [0, 0, 0] });
    var baseSpeed = stage.attribute(caster, "minecraft:generic.movement_speed");
    var foe = stage.mob({ type: "minecraft:zombie", at: [1, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    // 远处的同类僵尸：从贴身范围外用同一 contact 伤害路径打来，检验不会隔空压层或反推。
    var far = stage.mob({ type: "minecraft:zombie", at: [9, 0, 0] });
    stage.noai(far);
    stage.until(1000, function () {
        return stage.casts("cottonguard", caster) > 0
            && stage.hadMobEffect(caster, "world_combat:status/cottonguard")
            && stage.stages(caster).def >= 3
            && stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001;
    }, function () {
        stage.expect(stage.casts("cottonguard", caster) > 0, "cotton guard was committed");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/cottonguard"), "the coat window carried the shared identity");
        stage.expect(stage.attribute(caster, "minecraft:generic.movement_speed") < baseSpeed - 0.001, "the default thick coat slowed the caster");
        var defFull = stage.stages(caster).def;
        stage.expect(defFull <= 3, "the coat grants at most its own 3 Defense stages");
        var travelBefore = stage.travelled(foe);
        stage.hurt(caster, 4, "minecraft:mob_attack", { source: foe, metadata: { contact: true } });
        stage.after(10, function () {
            stage.hurt(caster, 4, "minecraft:mob_attack", { source: foe, metadata: { contact: true } });
        });
        stage.after(26, function () {
            var defAfterContact = stage.stages(caster).def;
            var travelAfter = stage.travelled(foe);
            stage.expect(defAfterContact < defFull, "melee contacts crushed layers and took back some Defense");
            stage.expect(travelAfter > travelBefore + 0.05, "a melee contact pushed the striker back");
            var defBeforeFar = defAfterContact, farBefore = far.position();
            stage.hurt(caster, 4, "minecraft:mob_attack", { source: far, metadata: { contact: true } });
            stage.after(8, function () {
                var defAfterFar = stage.stages(caster).def;
                var farMoved = Math.abs(far.position()[0] - farBefore[0]) + Math.abs(far.position()[2] - farBefore[2]);
                stage.expect(defAfterFar === defBeforeFar, "a contact hit from outside melee range crushed no layer");
                stage.expect(farMoved < 0.05, "a contact hit from outside melee range pushed no striker");
                stage.hurt(caster, 4, "minecraft:arrow", { source: foe, metadata: { contact: false } });
                stage.after(10, function () {
                    stage.expect(stage.stages(caster).def === defAfterFar, "a ranged hit took no layer and pushed no one");
                    stage.note("cotton guard: only real melee contacts crush layers and rebound the striker; far contact and ranged hits only keep the Defense window", {
                        casts: stage.casts("cottonguard", caster),
                        defFull: defFull,
                        defAfterMelee: defAfterContact,
                        defAfterFarContact: defAfterFar,
                        defAfterRanged: stage.stages(caster).def,
                        strikerMoved: Math.round((travelAfter - travelBefore) * 100) / 100,
                        farMoved: Math.round(farMoved * 1000) / 1000,
                        damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                        alive: caster.alive()
                    });
                    stage.done();
                });
            });
        });
    }, "cotton guard engages");
});
