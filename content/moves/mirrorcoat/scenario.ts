/**
 * 镜面反射 / mirrorcoat —— 可执行设计说明。
 *
 * 一句话：先挨一记特殊（远程、非近身）打，再立镜把那笔伤害以两倍射回去。
 *
 * 场面：一只只带「镜面反射」的呆壳兽与一只女巫隔开几格、夜晚石地开战。女巫保持距离投掷药水，
 *   药水伤害是远程来犯，没有作者类别，但由「造成者不是直接命中者」判定为特殊，进账；呆壳兽挨到
 *   第一下之后账本生效，再把那笔以两倍射回女巫。
 * 必然事实：镜面反射被提交过、施术者受过伤（这一下被记进账本）、女巫受到过伤害。
 *   首击时机、账的大小与是否暴击是随机项，写进 note 供读轨迹判断。
 */
Smoke.scenario("mirrorcoat", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    const caster = stage.pokemon({ species: "slowbro", level: 40, moves: ["mirrorcoat"], at: [0, 0, 0], properties: "nature=calm" });
    const foe = stage.mob({ type: "minecraft:witch", at: [7, 0, 0] });
    stage.hostile(caster, foe);
    stage.until(1000, function () {
        return stage.casts("mirrorcoat", caster) >= 1 && stage.damageTo(foe) > 0 && stage.damageTo(caster) > 0;
    }, function () {
        stage.expect(stage.casts("mirrorcoat", caster) >= 1, "slowbro committed mirror coat");
        stage.expect(stage.damageTo(caster) > 0, "the witch's ranged special blow landed and was recorded");
        stage.expect(stage.damageTo(foe) > 0, "the doubled special blow dealt damage");
        stage.note("the refund is twice the special damage the caster actually took inside the window; the first offer whiffs until a potion lands", {
            casts: stage.casts("mirrorcoat", caster),
            dealt: Math.round(stage.damageBy(caster) * 10) / 10,
            taken: Math.round(stage.damageTo(caster) * 10) / 10,
            foeDamage: Math.round(stage.damageTo(foe) * 10) / 10,
            tick: stage.tick()
        });
        stage.done();
    }, "mirror coat lands on the skeleton within 50 s");
});
