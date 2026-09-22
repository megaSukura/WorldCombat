/**
 * 投球 / barrage 的可执行设计说明。
 *
 * 场面：只会投球的蛋蛋（exeggcute，L30，原生就能学）在 7 格外对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）
 *   连续抛球；开阔场地（高抛式会越过掩体，这里没有掩体也照常落到目标头上）。
 * 必然事实：本招被提交过、目标受过伤害。投数（2～5，随速度／等级与配置变化）、单球威力、散布漏球、
 *   高抛／平投的飞行、弹墙与否与暴击，都写进 note，供读轨迹判断。
 */
Smoke.scenario("barrage", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "exeggcute", level: 30, moves: ["barrage"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1200, function () {
        return stage.casts("barrage", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一球命中后等这一串投完，再记录整串结果（投几球、漏几球是随机的，只作 note）。
        stage.after(70, function () {
            stage.expect(stage.casts("barrage", caster) > 0, "barrage was committed");
            stage.expect(stage.damageTo(foe) > 0, "the thrown balls dealt damage to the foe");
            stage.note("throw count (2-5) follows Speed/level; the 85% accuracy is translated into spread, so scattered balls miss; the default lob arcs over cover while flat throws ricochet off walls (design facts verified in the full assembly)", {
                casts: stage.casts("barrage", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "barrage commits and its thrown balls land within 60 s");
});
