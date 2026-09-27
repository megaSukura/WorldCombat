/**
 * 投球 / barrage 的可执行设计说明。
 *
 * 场面：只会投球的蛋蛋（exeggcute，L30，原生就能学）在 7 格外对一只被点住、不会还手的铁傀儡（耐打又不会跑掉的靶子）
 *   连续抛球；两人之间立一道一格高的矮墙，直射会被挡住，必须靠真实解出的高弧越过去。
 * 必然事实：本招被提交过、目标受过伤害（高弧真的越过了矮墙）。投数（2～5，随速度／等级与配置变化）、单球威力、
 *   散布漏球、逐球等待与最后报数，都写进 note，供读轨迹判断。平投式会弹墙、高抛无解会明确失败，属配置分支。
 */
Smoke.scenario("barrage", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    // 一格矮墙：直射被挡，只有真实解出并逐段验过墙的高弧才能把球送过去。
    stage.fill([-1, 0, -1], [-1, 0, 1], "minecraft:stone");
    var caster = stage.pokemon({ species: "exeggcute", level: 30, moves: ["barrage"], at: [-5, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [2, 0, 0] });
    stage.hostile(caster, foe);
    stage.command("data merge entity @e[type=minecraft:iron_golem,distance=..8,limit=1] {NoAI:1b}");
    stage.until(1400, function () {
        return stage.casts("barrage", caster) > 0 && stage.damageTo(foe) > 0;
    }, function () {
        // 第一球命中后等这一串投完，再记录整串结果（投几球、漏几球是随机的，只作 note）。
        stage.after(80, function () {
            stage.expect(stage.casts("barrage", caster) > 0, "barrage was committed");
            stage.expect(stage.damageTo(foe) > 0, "a lobbed ball cleared the low wall and dealt damage to the foe");
            stage.note("throw count (2-5) follows Speed/level; per-ball aim updates while the key is held; each ball carries its own strike so several balls can hit the same foe once each; the default lob solves a real high arc, checks every segment against walls/ceilings and fails a ball openly when no clear arc exists; flat throws ricochet once. See build/smoke/barrage/trace.jsonl for the arcs.", {
                casts: stage.casts("barrage", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                foeAlive: foe.alive(),
                casterAlive: caster.alive()
            });
            stage.done();
        });
    }, "barrage commits and a lobbed ball clears the wall within 70 s");
});
