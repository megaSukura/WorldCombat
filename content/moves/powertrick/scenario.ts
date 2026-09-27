/**
 * 力量戏法的可执行设计说明。
 *
 * 场面：一只只会「力量戏法」（另带一招物理招）的壶壶（防御远高于攻击）与一只不会还手的铁傀儡隔开 6 格、石质场地开战。
 *   壶壶受一次伤、血量低于临时调高的低血阈值，并挂着一层与本招无关的增益（幸运）。先向壶壶注入另一招的
 *   攻防倒转身份（world_combat:powershift_stance，带共享标签 attack_defence_inversion），在它还在时用力
 *   证明力量戏法不会起手；兄弟身份走完后，壶壶先翻成攻势（换姿态），随后主动翻回。
 * 必然事实：兄弟倒转在时本招零次提交、且没有自己的保持窗口；兄弟走完后本招提交并带共享攻防倒转身份；
 *   清除承载后姿态撤除、本招可再次起手；窗口内再按一次主动翻回，期间与本招无关的幸运始终还在。
 *   换前换后的数值、差距比、窗口多长写进 note 供读轨迹判断（smoke 不能直接读原生攻防）。
 */
Smoke.scenario("powertrick", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "Shuckle", level: 100, moves: ["powertrick", "tackle"], at: [-3, 0, 0] });
    var foe = stage.mob({ type: "minecraft:iron_golem", at: [3, 0, 0] });
    stage.noai(foe);
    stage.hostile(caster, foe);
    var maxHealth = stage.attribute(caster, "minecraft:generic.max_health");
    var uuid = caster.ref.split("/")[0];
    // 另一招的攻防倒转身份：共享标签开放扩展的互斥身份，在它还在时本招不应起手。尽早注入，赶在 AI 首次提交之前。
    // effect give 的时长以秒计：12 秒 ≈ 240 刻。
    stage.after(2, function () {
        stage.command("effect give " + uuid + " world_combat:powershift_stance 12 0");
    });
    // 原生个体在生成同刻尚未绑定，稍等几刻再写偏好、加增益与压血。
    stage.after(10, function () {
        // 低血阈值临时调到 0.9：受一次伤后翻成攻势形，AI 就会主动翻回，便于稳定验证这条双向分支。
        // 距离放到上限，避免壶壶站位漂移时把铁傀儡甩出威胁范围而永不起手。
        stage.prefer(caster, "powertrick", { long: false, ai: { maxChase: 24, minGap: 3, minEdge: 1.15, low: 0.9 } });
        // 与本招无关的增益：清除承载、翻回都只应撤自己那层，它必须留下。
        stage.command("effect give " + uuid + " minecraft:luck 100000 0");
        // 由对手出手压血；绕过命中与防御结算，确保真的掉到低血区。
        stage.hurt(caster, maxHealth * 0.7, "minecraft:magic", { source: foe, metadata: { category: "special", calculation: true, sureHit: true } });
    });
    stage.note("staged: shuckle(100, defence >> attack, low health, luck, hostile iron golem) with powertrick; a sibling attack_defence_inversion is injected, then lapses and the trick plays");
    // 兄弟倒转仍在时：给足 AI 决策时间，本招不提交、不留下自己的姿态。
    stage.after(220, function () {
        stage.expect(stage.casts("powertrick", caster) === 0, "the trick did not start while another attack/defence inversion was active");
        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/powertrick"), "no own flipped form appeared under the sibling inversion");
        // 兄弟身份走完后：本招起手并带上共享攻防倒转身份。
        stage.until(1500, function () {
            return stage.casts("powertrick", caster) > 0 && stage.hasMobEffect(caster, "world_combat:status/powertrick");
        }, function () {
            stage.expect(stage.hasMobEffect(caster, "world_combat:status/attack_defence_inversion"), "the own flipped form carried the shared inversion identity");
            // 解除恢复：清除承载后本招姿态撤除，并可再次起手。
            stage.command("effect clear " + uuid + " world_combat:powertrick_hold");
            stage.after(4, function () {
                stage.expect(!stage.hasMobEffect(caster, "world_combat:status/powertrick"), "clearing the carrier removed the flipped form");
                stage.until(1500, function () {
                    return stage.casts("powertrick", caster) >= 3 && !stage.hasMobEffect(caster, "world_combat:status/powertrick");
                }, function () {
                    stage.expect(stage.casts("powertrick", caster) >= 3, "the trick was replayed and flipped back on a later press");
                    stage.expect(stage.hasMobEffect(caster, "minecraft:luck"), "the unrelated buff survived every flip and withdraw");
                    stage.note("Attack and Defence swap through the shared layer; a sibling inversion blocks the start, clearing the carrier restores, and a later press flips back without touching other buffs", {
                        casts: stage.casts("powertrick", caster),
                        casterHealth: Math.round(caster.health() * 10) / 10,
                        casterMaxHealth: Math.round(stage.attribute(caster, "minecraft:generic.max_health") * 10) / 10,
                        luck: stage.hasMobEffect(caster, "minecraft:luck"),
                        damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                        damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                        casterAlive: caster.alive()
                    });
                    stage.done();
                }, "the trick is replayed and flipped back");
            });
        }, "the trick starts after the sibling inversion lapses");
    });
});
