/**
 * 木枝突刺 / branchpoke 的可执行设计说明。
 *
 * 场面：一只只会木枝突刺的敲音猴（Grookey，20 级）在约 3 格外面对两只被点住、不会走开的僵尸，两者前后排在同一条线上；
 * 设为夜晚，僵尸不会被日光灼烧。刺枝式（thorn）由 prefer 打开，命中会挂一记缓慢。AI 只有这一招可用。
 * 必然事实：本招被提交过；这条细枝**只戳中一个身体**（前后两只只有一只掉血——枝条被最近的拦下）；
 *   刺枝式命中后目标带上缓慢。哪一个目标被戳中随接近角度浮动，写进 note 供读轨迹判断。
 */
Smoke.scenario("branchpoke", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    // 施法者放在较远处，先让 AI 走近再出招，给偏好写入留出时间（原生个体生成同刻尚未绑定）。
    var caster = stage.pokemon({ species: "Grookey", level: 20, moves: ["branchpoke"], at: [-6, 0, 0] });
    var front = stage.mob({ type: "minecraft:zombie", at: [0, 0, 0] });
    var back = stage.mob({ type: "minecraft:zombie", at: [1.6, 0, 0] });
    stage.noai(front, back);
    stage.hostile(caster, front);
    stage.hostile(caster, back);
    stage.after(6, function () { stage.prefer(caster, "branchpoke", { thorn: true }); });
    stage.until(900, function () {
        return stage.casts("branchpoke", caster) > 0 && (stage.damageTo(front) > 0 || stage.damageTo(back) > 0);
    }, function () {
        stage.after(5, function () {
            var frontHit = stage.damageTo(front) > 0, backHit = stage.damageTo(back) > 0;
            stage.expect(stage.casts("branchpoke", caster) > 0, "branchpoke was committed");
            stage.expect(frontHit !== backHit, "the twig pokes exactly one body on the line");
            stage.expect(stage.hasMobEffect(front, "minecraft:slowness") || stage.hasMobEffect(back, "minecraft:slowness"),
                "the thorn form snags the poked body with Slowness");
            stage.note("最长最细的一记直戳：最近的躯干拦下整枝，只戳中一个；刺枝式命中后目标挂上缓慢（按成功回执才播）。", {
                casts: stage.casts("branchpoke", caster),
                onFront: Math.round(stage.damageTo(front) * 10) / 10,
                onBack: Math.round(stage.damageTo(back) * 10) / 10,
                frontHit: frontHit,
                backHit: backHit,
                frontSlowed: stage.hasMobEffect(front, "minecraft:slowness"),
                backSlowed: stage.hasMobEffect(back, "minecraft:slowness")
            });
            stage.done();
        });
    }, "branchpoke stabs exactly one body from the far end of the twig");
});
