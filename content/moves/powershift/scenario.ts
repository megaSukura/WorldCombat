/**
 * 力量转换的可执行设计说明。
 *
 * 场面：一只只会「力量转换」的大岩蛇（防高攻低、满血，符合「健康且防高攻低时转攻势」）与一只不会还手的
 *   小拉达隔开 9 格、石质场地上开战。先向大岩蛇注入另一招的攻防倒转身份（world_combat:powertrick_hold，
 *   带共享标签 attack_defence_inversion），在它还在时证明力量转换不会起手；兄弟身份走完后本招才换一轮。
 * 必然事实：兄弟倒转在时本招零次提交；兄弟走完后本招提交并带共享身份；短窗还在时重施被拒（提交数不变）；
 *   窗口走完自动换回；随后再施放一次并可被清除，清除后窗口消失。
 *   换前换后的数值、差距比、窗口多长写进 note 供读轨迹判断（smoke 不能直接读宝可梦的临时属性层数值）。
 */
Smoke.scenario("powershift", function (stage) {
    stage.fill([-8, -1, -8], [8, -1, 8], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "onix", level: 34, moves: ["powershift"], at: [-3, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 12, moves: ["tackle"], at: [6, 0, 0] });
    stage.hostile(caster, foe);
    var uuid = caster.ref.split("/")[0];
    // 另一招的攻防倒转身份：共享标签开放扩展的互斥身份，在它还在时本招不应起手。尽早注入，赶在 AI 首次提交之前。
    // effect give 的时长以秒计：8 秒 ≈ 160 刻。
    stage.after(2, function () {
        stage.command("effect give " + uuid + " world_combat:powertrick_hold 8 0");
    });
    stage.after(10, function () {
        stage.prefer(caster, "powershift", { hold: false, ai: { maxChase: 14, minGap: 3, minEdge: 1.05, low: 0.6 } });
    });
    stage.note("staged: onix(34, defence >> attack) with powershift; a sibling attack_defence_inversion is injected, then lapses and the short swap plays");
    // 兄弟倒转仍在时：给足 AI 决策时间，本招不提交、不留下自己的姿态。
    stage.after(140, function () {
        stage.expect(stage.casts("powershift", caster) === 0, "the short swap did not start while another attack/defence inversion was active");
        stage.expect(!stage.hasMobEffect(caster, "world_combat:status/powershift"), "no own swap form appeared under the sibling inversion");
        // 兄弟身份走完后：本招换一轮并带上共享身份。
        stage.until(900, function () {
            return stage.casts("powershift", caster) > 0 && stage.hasMobEffect(caster, "world_combat:status/powershift");
        }, function () {
            stage.expect(stage.hasMobEffect(caster, "world_combat:status/attack_defence_inversion"), "the swap window carried the shared inversion identity");
            var before = stage.casts("powershift", caster);
            // 短窗内不刷新、不再翻一次：等一段后提交数不变，窗口仍在。
            stage.after(60, function () {
                stage.expect(stage.casts("powershift", caster) === before, "the active short window was neither refreshed nor flipped again");
                // 自然到期：窗口自行走完并把数值换回。
                stage.until(1200, function () { return !stage.hasMobEffect(caster, "world_combat:status/powershift"); }, function () {
                    stage.expect(!stage.hasMobEffect(caster, "world_combat:status/powershift"), "the short window lapsed and returned on its own");
                    // 再施放一次后主动清除：解除恢复。
                    stage.until(900, function () {
                        return stage.casts("powershift", caster) >= 2 && stage.hasMobEffect(caster, "world_combat:status/powershift");
                    }, function () {
                        stage.command("effect clear " + uuid + " world_combat:powershift_stance");
                        stage.after(4, function () {
                            stage.expect(!stage.hasMobEffect(caster, "world_combat:status/powershift"), "clearing the carrier ended the swap window");
                            stage.note("Attack/Defence swap for the window through the shared layer; a sibling inversion blocks the start, the active window does not refresh, it lapses on its own, and a cleared carrier ends it.", {
                                casts: stage.casts("powershift", caster),
                                damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10,
                                damageByCaster: Math.round(stage.damageBy(caster) * 10) / 10,
                                casterAlive: caster.alive()
                            });
                            stage.done();
                        });
                    }, "a second swap after the first lapsed");
                }, "the short window lapses");
            });
        }, "power shift engages after the sibling inversion lapses");
    });
});
