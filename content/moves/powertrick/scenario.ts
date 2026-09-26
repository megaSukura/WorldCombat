/**
 * 力量戏法的可执行设计说明。
 *
 * 场面：一只只会「力量戏法」的壶壶（防御远高于攻击）与一只弱小的小拉达隔开 6 格、石质场地上开战。
 *   壶壶开战前先受一次伤、血量低于临时调高的低血阈值，并且挂着一层与本招无关的增益（幸运）。
 *   守高攻低的物攻手会先把两股力道翻过来（换攻势），随即因为低血又想主动翻回（换守势）——这正好检验
 *   「主动再按确实撤自己姿态、期间其他增益保留、低血 AI 会及时翻回」。
 * 必然事实：本招被提交过两次；施术者身上出现过保持窗口身份 world_combat:status/powertrick（只有数值层真正写入
 *   才会挂上这层窗口），第二次施展后该窗口被撤下；期间与本招无关的幸运始终还在。
 *   换前换后的数值、差距比、窗口多长写进 note 供读轨迹判断（smoke 不能直接读原生攻防）。
 */
Smoke.scenario("powertrick", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Shuckle", level: 100, moves: ["powertrick"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "Rattata", level: 8, moves: ["tackle"], at: [3, 0, 0] });
    stage.hostile(caster, foe);
    var maxHealth = stage.attribute(caster, "minecraft:generic.max_health");
    // 原生个体在生成同刻尚未绑定，稍等几刻再写偏好、加增益与压血。
    stage.after(10, function () {
        // 低血阈值临时调到 0.9：只要受一次伤，翻成攻势形后 AI 就会主动翻回，便于稳定验证这条双向分支。
        stage.prefer(caster, "powertrick", { long: false, ai: { maxChase: 14, minGap: 3, minEdge: 1.15, low: 0.9 } });
        // 与本招无关的增益：翻回只应撤自己那层，它必须留下。
        stage.command("effect give " + caster.ref.split("/")[0] + " minecraft:luck 100000 0");
        // 由对手出手压血；绕过命中与防御结算，确保真的掉到低血区。
        stage.hurt(caster, maxHealth * 0.7, "minecraft:magic", { source: foe, metadata: { category: "special", calculation: true, sureHit: true } });
    });
    stage.note("staged: shuckle(100, defence >> attack, low health, luck buff) powertrick vs rattata(8); the trick should flip on the first cast and flip back on the second");
    stage.until(3000, function () {
        return stage.casts("powertrick", caster) >= 2 && !stage.hasMobEffect(caster, "world_combat:status/powertrick");
    }, function () {
        stage.expect(stage.casts("powertrick", caster) >= 2, "the trick was played twice, the second re-press flipped it back");
        stage.expect(stage.hadMobEffect(caster, "world_combat:status/powertrick"), "the first cast carried the shared hold identity");
        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/powertrick"), "the re-press removed the hold window");
        stage.expect(stage.hasMobEffect(caster, "minecraft:luck"), "the unrelated buff survived the re-press");
        stage.note("Attack and Defence are swapped through the shared stat layer; the window holds the flipped form and reverts when it ends or when the trick is played again", {
            casts: stage.casts("powertrick", caster),
            casterHealth: Math.round(caster.health() * 10) / 10,
            casterMaxHealth: Math.round(stage.attribute(caster, "minecraft:generic.max_health") * 10) / 10,
            luck: stage.hasMobEffect(caster, "minecraft:luck"),
            damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
            damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
            casterAlive: caster.alive()
        });
        stage.done();
    }, "the trick flips back on a second cast");
});
