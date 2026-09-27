/**
 * 怨恨 / spite 的可执行设计说明。
 *
 * 一句话：命中记住目标最近一次真实进攻，它再用同一手打出有效直击时把这一击削一份并耗尽怀恨；宝可梦另外
 * 被抽走最后使用那一招的 4 点 PP。没有可读进攻只结算 PP，不挂空怀恨。
 *
 * 第一幕（原生攻击身份）：一只只会怨恨的耿鬼对一只僵尸。僵尸用原版近战真实出手，这类来犯伤害带真实
 *   damageType 与接触通路，怨恨据此挂上原生怀恨。脚本先送一道招式身份（kind=move）的伤害验证它不消耗，
 *   再等僵尸的下一记真实近战把这一击削到 65% 并耗尽怀恨。必然事实：怨恨被提交、怀恨落在僵尸、匹配的一击
 *   确实被削一次、之后怀恨消失。
 * 第二幕（宝可梦的招式身份）：一只只会怨恨的耿鬼盯住一只只会撞击、正与僵尸交战的腕力，等它真实提交撞击后
 *   挂上怀恨。脚本先送一手不同的 move 验证绕开，再送 metadata 为 move=tackle 的有效直击验证一削一耗尽，
 *   第二次同手不再削。
 *
 * 扣掉的 PP 点数与飞行时序属随机结果，写进 note 供读轨迹判断。
 */
const spiteAuthoredFactors: number[] = [];
const spiteNativeFactors: number[] = [];
// 排在共享预算之后读回执：spiteFactor 由 DamageBudgets 的 modifiers 乘入。
WorldCombat.on("checks:spite/authored", "world_combat:damage_incoming", "world_combat:damage_budgets/incoming", function (event) {
    var data = JSON.parse(String(event.data()));
    if (typeof data.spiteFactor === "number" && data.kind === "move") spiteAuthoredFactors.push(Number(data.spiteFactor));
});
WorldCombat.on("checks:spite/native", "world_combat:damage_incoming", "world_combat:damage_budgets/incoming", function (event) {
    var data = JSON.parse(String(event.data()));
    if (typeof data.spiteFactor === "number" && data.kind !== "move") spiteNativeFactors.push(Number(data.spiteFactor));
});

Smoke.scenario("spite", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 24], "minecraft:stone");
    stage.time("night");
    stage.weather("clear");
    // 第一幕：原生攻击身份。耿鬼对普通近战不免疫，能撑到验证结束。
    var caster = stage.pokemon({ species: "Gengar", level: 55, moves: ["spite"], at: [-4, 0, 0] });
    var mob = stage.mob({ type: "minecraft:zombie", at: [4, 0, 0] });
    stage.hostile(caster, mob);
    stage.note("staged: gengar(55) spite vs zombie at 8 blocks; the zombie really strikes so its native offense identity is readable");
    stage.until(2000, function () {
        return stage.casts("spite", caster) >= 1 && stage.hasMobEffect(mob, "world_combat:status/grudge");
    }, function () {
        stage.expect(stage.casts("spite", caster) >= 1, "spite was committed at an ordinary mob");
        stage.expect(stage.hasMobEffect(mob, "world_combat:spite_grudge"), "the grudge exists as a real MobEffect");
        stage.expect(stage.hasMobEffect(mob, "world_combat:status/grudge"), "an ordinary mob carries the shared grudge identity");
        stage.setPp(caster, "spite", 0);
        stage.note("the native grudge remembered the zombie's actual attack; a move-identity hit must not spend it", {
            casts: stage.casts("spite", caster), damageToCaster: Math.round(stage.damageTo(caster) * 10) / 10
        });
        // 招式身份（kind=move）不属于这笔原生怀恨，不能消耗它；同刻判定避免与僵尸的下一记真击抢跑。
        stage.hurt(caster, 4, "world_combat_core:action",
            { source: mob, metadata: { kind: "move", move: "tackle", category: "physical", contact: true, type: "normal" } });
        stage.expect(spiteNativeFactors.length === 0, "a move-identity hit did not spend the native grudge");
        stage.expect(stage.hasMobEffect(mob, "world_combat:status/grudge"), "the native grudge survived a different offense kind");
        // 僵尸的下一记真实近战带同一 damageType，应被削到 65% 并耗尽。
        stage.until(300, function () {
            return spiteNativeFactors.length >= 1 && !stage.hasMobEffect(mob, "world_combat:status/grudge");
        }, function () {
            stage.expect(spiteNativeFactors.length === 1 && Math.abs(spiteNativeFactors[0] - 0.65) < 0.03,
                "the matching native attack was cut once to 65%");
            stage.expect(!stage.hasMobEffect(mob, "world_combat:status/grudge"), "the matching native attack spent the grudge");
            stage.note("native grudge spent by a real attack", { factors: spiteNativeFactors.slice() });

            // 第二幕：宝可梦的招式身份。
            var mob2 = stage.mob({ type: "minecraft:zombie", at: [3, 0, 16] });
            var target = stage.pokemon({ species: "Machop", level: 35, moves: ["tackle"], at: [0, 0, 16] });
            stage.noai(mob2);
            stage.hostile(target, mob2);
            stage.until(300, () => stage.casts("tackle", target) > 0 && stage.damageBy(target) > 0, () => {
                // Keep the real offense record, then isolate delivery from another dash/native retaliation.
                stage.setPp(target, "tackle", 0); stage.noai(target, mob2);
                const uuid = target.ref.split("/")[0];
                stage.command("attribute " + uuid + " minecraft:generic.movement_speed base set 0");
                stage.after(8, () => {
                    stage.command("tp " + uuid + " ~2 ~ ~16");
                    var strong = stage.pokemon({ species: "Gengar", level: 55, moves: ["spite"], at: [-3, 0, 16] });
                    stage.provoke(strong, target);
                    stage.until(300, function () {
                        return stage.casts("spite", strong) >= 1 && stage.hasMobEffect(target, "world_combat:status/grudge");
                    }, function () {
                        stage.expect(stage.casts("spite", strong) >= 1, "spite was committed at the Pokemon");
                        stage.expect(stage.hasMobEffect(target, "world_combat:status/grudge"), "the Pokemon carries the authored grudge identity");
                        stage.setPp(strong, "spite", 0);
                        stage.setPp(target, "tackle", 0);
                        stage.noai(mob2);
                        stage.note("the authored grudge remembered the target's last move", { casts: stage.casts("spite", strong), targetPp: stage.pp(target, "tackle") });
                        // 换手（另一手 move）应绕开这笔怀恨。
                        stage.hurt(strong, 4, "world_combat_core:action",
                            { source: target, metadata: { kind: "move", move: "scratch", category: "physical", contact: true, type: "normal" } });
                        stage.expect(spiteAuthoredFactors.length === 0, "a different move did not spend the authored grudge");
                        stage.expect(stage.hasMobEffect(target, "world_combat:status/grudge"), "the authored grudge survived a different move");
                        // 同手（move=tackle）的有效直击被削一次并耗尽。
                        stage.after(10, function () {
                            stage.hurt(strong, 6, "world_combat_core:action",
                                { source: target, metadata: { kind: "move", move: "tackle", category: "physical", contact: true, type: "dark" } });
                        });
                        stage.after(20, function () {
                            stage.expect(spiteAuthoredFactors.length === 1 && Math.abs(spiteAuthoredFactors[0] - 0.65) < 0.03,
                                "the matching authored hit was cut once to 65%");
                            stage.expect(!stage.hasMobEffect(target, "world_combat:status/grudge"), "the authored grudge was spent by the matching hit");
                            // 再次同手：预算已耗尽，不再削。
                            stage.hurt(strong, 6, "world_combat_core:action",
                                { source: target, metadata: { kind: "move", move: "tackle", category: "physical", contact: true, type: "dark" } });
                            stage.expect(spiteAuthoredFactors.length === 1, "a second matching hit did not re-cut");
                            stage.note("authored grudge worked the same way", { factors: spiteAuthoredFactors.slice(), targetPp: stage.pp(target, "tackle") });
                            stage.done();
                        });
                    }, "the authored grudge lands on the Pokemon");
                });
            }, "the target first lands a real Tackle");
        }, "the zombie's next real attack spends the native grudge");
    }, "the native grudge lands on the ordinary mob");
});
