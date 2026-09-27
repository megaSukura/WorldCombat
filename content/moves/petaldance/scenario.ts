// 花瓣舞的可执行设计说明：一只只会花瓣舞的美丽花站在草方块上，两只僵尸分列两侧约 5.5 格（AI 会把站距维持在外环附近，
// 于是本体基本留在原地），贴身的安全中空里再放一只同队的尸壳队友（设计用途之一就是把中空留给队友）。这样一次必然覆盖外沿、
// 同时留出内圈：队友在中空里不吃伤害，说明内圈确实是安全的空档。
// 必然事实：本招被提交过；至少一只僵尸受到过伤害（外沿花裙扫到）；施法者身上出现过共享身份 confusion——
//   从第一圈起记下的舞后恍惚是这一招固定的结局。转了几圈、裙边走位、落下多少花瓣写进 note 供读轨迹判断。
Smoke.scenario("petaldance", function (stage) {
    stage.fill([-9, -1, -7], [9, -1, 7], "minecraft:stone");
    stage.fill([-6, -1, -6], [6, -1, 6], "minecraft:grass_block");
    // 预先记录落点候选格，便于 changedBlocks 观察花瓣是否真的落在地上。
    for (var dx = -6; dx <= 6; dx++) for (var dz = -6; dz <= 6; dz++) stage.block([dx, 0, dz], "minecraft:air");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "bellossom", level: 42, moves: ["petaldance"], at: [0, 0, 0] });
    var foeA = stage.mob({ type: "minecraft:zombie", at: [5.5, 0, 0] });
    var inner = stage.mob({ type: "minecraft:husk", at: [.25, 0, .25] });
    stage.noai(inner);
    stage.team("petalring", [caster, inner]);
    stage.command("attribute " + inner.ref.split("/")[0] + " minecraft:generic.knockback_resistance base set 1");
    var foeB = stage.mob({ type: "minecraft:zombie", at: [-5.5, 0, 0] });
    stage.hostile(caster, foeA);
    stage.hostile(caster, foeB);
    stage.command("execute as @e[type=minecraft:zombie,distance=..12] run data merge entity @s {NoAI:1b,attributes:[{id:\"minecraft:generic.max_health\",base:260}],Health:260f}");
    stage.until(1200, function () {
        return stage.casts("petaldance", caster) > 0 && stage.damageTo(foeA) > 0;
    }, function () {
        // 花瓣是短租（约 120 刻后还原），在它还在时读取 changedBlocks；恍惚在舞结束（或主动收手）时由载体兑现。
        stage.after(50, function () {
            stage.expect(stage.casts("petaldance", caster) > 0, "petaldance was committed");
            stage.expect(stage.damageTo(inner) === 0, "the ally fully inside the hollow skirt remained safe");
            stage.expect(stage.damageTo(foeA) > 0, "the petal storm damaged a foe");
            stage.expect(stage.hadMobEffect(caster, "world_combat:status/confusion"), "the user ended the dance confused");
            var petals = 0;
            stage.changedBlocks().forEach(function (change) { if (change.after.indexOf("pink_petals") >= 0) petals++; });
            stage.expect(petals > 0, "the dance left petal patches on the grass");
            stage.note("花瓣舞沿当刻瞄准舞 2~3 圈：外半径／内空之间的花裙外沿造成特攻伤害、轻推开并随身体真实走弧，把中空留给队友；落脚处按 canSurvive 落下 pink_petals（terrain 短租、到期还原）；首圈起用一个独立 actor 载体记下恍惚责任，正常收招与主动收手都按已发圈兑现，首圈之前无成本", {
                casts: stage.casts("petaldance", caster),
                onA: Math.round(stage.damageTo(foeA) * 10) / 10,
                onB: Math.round(stage.damageTo(foeB) * 10) / 10,
                confused: stage.hadMobEffect(caster, "world_combat:status/confusion"),
                petalCells: petals,
                moved: Math.round(stage.travelled(caster) * 10) / 10
            });
            stage.done();
        });
    }, "petal dance whirls");
});
