/**
 * 自爆 / selfdestruct —— 可执行设计说明。
 *
 * 一句话：身体急涨透光，随即原地炸成一颗白热球，圈里的人各挨一记、被向外掀开；使用者随之倒下。
 *
 * 场面：会自爆的小拳石带着这一招，站在两只低等级的对手之间——逼出「一次罩住一圈」的局面。
 * 默认 AI 只在残血应急时提案；这里把 `ai.sacrifice`（主动牺牲）打开，让满血的伙伴也愿意用命换，
 * 稳定演示这一手。两只对手都靠得很近，让 `ai.minFoes`（默认 2）与真实爆圈条件成立。
 *
 * 断言只取必然事实：这招被提交过、至少一个目标挨到伤害、**使用者倒下**（原生 selfdestruct:"always"）、
 * 地面留下炸焦的痕迹。命中几个、掀开多远、暴击、焦痕块数写进 note 供读轨迹判断。
 */
Smoke.scenario("selfdestruct", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:dirt");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "geodude", level: 30, moves: ["selfdestruct"], at: [0, 0, 0] });
    var foeA = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [1.8, 0, 0] });
    var foeB = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [1.6, 0, 1.4] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.after(20, function () {
        stage.prefer(caster, "selfdestruct", { ai: { sacrifice: true } });
        stage.until(900, function () {
            return stage.casts("selfdestruct", caster) > 0 && (stage.damageTo(foeA) > 0 || stage.damageTo(foeB) > 0);
        }, function () {
            stage.after(14, function () {
                stage.expect(stage.casts("selfdestruct", caster) > 0, "geodude committed self-destruct");
                stage.expect(stage.damageTo(foeA) > 0 || stage.damageTo(foeB) > 0, "the blast dealt damage inside the ring");
                stage.expect(!caster.alive(), "the user fainted even though the move was used (selfdestruct: always)");
                stage.expect(stage.changedBlocks().length > 0, "the blast scorched the ground (leased terrain)");
                stage.note("原生 selfdestruct:\"always\"——有没有炸到使用者都倒下；命中几个、掀开/抛起多远、暴击与焦痕块数随局面变化。扩散式更广，聚爆式更狠更窄", {
                    casts: stage.casts("selfdestruct", caster),
                    foeADamage: Math.round(stage.damageTo(foeA) * 10) / 10,
                    foeBDamage: Math.round(stage.damageTo(foeB) * 10) / 10,
                    casterAlive: caster.alive(),
                    foeBTravelled: Math.round(stage.travelled(foeB) * 10) / 10,
                    changed: stage.changedBlocks().length
                });
                stage.done();
            });
        }, "self-destruct detonates and the user faints within 45 s");
    });
});
