/**
 * 大爆炸 / explosion —— 可执行设计说明。
 *
 * 一句话：点燃引信朝爆点压进，引信烧完在身体真实所在处炸开，圈里的人被狠狠掀飞；使用者随之倒下，地上留下焦黑弹坑。
 *
 * 场面：会大爆炸的隆隆石带着这一招，站在三只低等级的对手中间——逼出「爆心一次罩住一圈」的局面。
 * 默认 AI 绝不主动牺牲；这里把 `ai.sacrifice`（主动牺牲）打开，让伙伴愿意用命换，稳定演示这一手。
 * 三只对手只会「跃起」、不还手，确保施法者在引信烧完前不会被提前打空。
 *
 * 断言只取必然事实：这招被提交过、至少一个目标挨到伤害、**使用者倒下**（原生 selfdestruct:"always"）、
 * 地面留下焦黑弹坑。引信期间身体压进了几格、命中几个、掀飞多远、暴击、弹坑块数写进 note 供读轨迹判断。
 */
Smoke.scenario("explosion", function (stage) {
    stage.fill([-10, -1, -8], [10, -1, 8], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "graveler", level: 40, moves: ["explosion"], at: [0, 0, 0] });
    var foeA = stage.pokemon({ species: "rattata", level: 10, moves: ["splash"], at: [2.2, 0, 0] });
    var foeB = stage.pokemon({ species: "rattata", level: 10, moves: ["splash"], at: [1.8, 0, 1.8] });
    var foeC = stage.pokemon({ species: "rattata", level: 10, moves: ["splash"], at: [1.8, 0, -1.8] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.hostile(caster, foeC);
    stage.after(20, function () {
        stage.prefer(caster, "explosion", { ai: { sacrifice: true } });
        stage.until(900, function () {
            return stage.casts("explosion", caster) > 0 && (stage.damageTo(foeA) > 0 || stage.damageTo(foeB) > 0 || stage.damageTo(foeC) > 0);
        }, function () {
            stage.after(16, function () {
                stage.expect(stage.casts("explosion", caster) > 0, "graveler committed explosion");
                stage.expect(stage.damageTo(foeA) > 0 || stage.damageTo(foeB) > 0 || stage.damageTo(foeC) > 0, "the blast dealt damage inside the ring");
                stage.expect(!caster.alive(), "the user fainted even though the move was used (selfdestruct: always)");
                stage.expect(stage.changedBlocks().length > 0, "the blast left a charred crater (leased terrain)");
                stage.note("引信把身体压向爆点后再爆（note 里的 travelled 含推进与走位）；撞墙会停在墙前、引信照烧，引信中被击倒则不补爆。瞬爆式更快，蓄爆式更大更久但起手长", {
                    casts: stage.casts("explosion", caster),
                    foeADamage: Math.round(stage.damageTo(foeA) * 10) / 10,
                    foeBDamage: Math.round(stage.damageTo(foeB) * 10) / 10,
                    foeCDamage: Math.round(stage.damageTo(foeC) * 10) / 10,
                    casterTravelled: Math.round(stage.travelled(caster) * 10) / 10,
                    casterAlive: caster.alive(),
                    changed: stage.changedBlocks().length
                });
                stage.done();
            });
        }, "explosion detonates and the user faints within 45 s");
    });
});
