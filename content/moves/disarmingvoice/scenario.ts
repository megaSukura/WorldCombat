/**
 * 魅惑之声 / disarmingvoice —— 可执行设计说明。
 *
 * 一句话：一声魅惑的鸣叫充满身周整块空间，站进去就避不开；只有真的受伤的对手才吃附加的错拍与安抚。
 *
 * 场面一（disarmingvoice，清唱）：一只只会魅惑之声的精灵，对两只挤在一起的对手；验证受伤者被降速。
 * 场面二（disarmingvoice-soothe，安抚）：开启安抚，验证受伤的对手被挂上魅惑身份。
 * 断言只取必然事实：这招被提交过、至少一个对手受过魅惑之声伤害；安抚时受伤者带上魅惑。数量、暴击写进 note。
 */
Smoke.scenario("disarmingvoice", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "jigglypuff", level: 38, moves: ["disarmingvoice"], at: [-2, 0, 0] });
    var first = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [2, 0, 0] });
    var second = stage.pokemon({ species: "rattata", level: 16, moves: ["tackle"], at: [3, 0, 1] });
    stage.hostile(caster, first);
    stage.hostile(caster, second);
    stage.noai(first, second);
    stage.until(1000, function () {
        return stage.casts("disarmingvoice", caster) >= 1 && (stage.damageTo(first) + stage.damageTo(second)) > 0;
    }, function () {
        stage.setPp(caster, "disarmingvoice", 0);
        stage.after(2, function () {
            stage.expect(stage.casts("disarmingvoice", caster) >= 1, "caster committed disarming voice");
            stage.expect((stage.damageTo(first) + stage.damageTo(second)) > 0, "disarming voice dealt damage to a foe");
            // 错拍是这招的主体过程：真的受伤的人速度等级真的掉下去。
            stage.expect(stage.stages(first).spe < 0 || stage.stages(second).spe < 0, "a damaged foe lost a Speed stage");
            // 清唱不带魅惑：心形与身份只属于安抚形态真的挂上的目标。
            stage.expect(!stage.hadMobEffect(first, "world_combat:status/charmed")
                && !stage.hadMobEffect(second, "world_combat:status/charmed"), "a plain cry left no charm");
            stage.note("how many stood inside the field is positional; a plain cry does not charm", {
                casts: stage.casts("disarmingvoice", caster),
                first: Math.round(stage.damageTo(first) * 10) / 10,
                second: Math.round(stage.damageTo(second) * 10) / 10,
                firstCharmed: stage.hadMobEffect(first, "world_combat:status/charmed"),
                secondCharmed: stage.hadMobEffect(second, "world_combat:status/charmed")
            });
            const affected = stage.stages(first).spe < 0 ? first : second;
            stage.boost(affected, { spe: 1 });
            stage.after(125, function () {
                stage.expect((stage.stages(affected).spe || 0) === 1, "lost tempo expires and preserves an independent Speed gain");
                stage.done();
            });
        });
    }, "disarming voice lands within 50 s");
});

Smoke.scenario("disarmingvoice-soothe", function (stage) {
    stage.fill([-8, -1, -6], [8, -1, 6], "minecraft:stone");
    stage.time("day");
    stage.weather("clear");
    var caster = stage.pokemon({ species: "jigglypuff", level: 38, moves: ["disarmingvoice"], at: [-2, 0, 0] });
    var foe = stage.pokemon({ species: "rattata", level: 30, moves: ["tackle"], at: [2, 0, 0] });
    stage.noai(foe);
    stage.after(5, function () {
        stage.prefer(caster, "disarmingvoice", { soothe: true });
        stage.hostile(caster, foe);
    });
    stage.until(1000, function () {
        return stage.casts("disarmingvoice", caster) >= 1 && stage.damageTo(foe) > 0;
    }, function () {
        stage.setPp(caster, "disarmingvoice", 0);
        stage.after(2, function () {
            stage.expect(stage.casts("disarmingvoice", caster) >= 1, "caster committed the soothing cry");
            stage.expect(stage.damageTo(foe) > 0, "the soothing cry dealt damage to the foe");
            stage.expect(stage.hadMobEffect(foe, "world_combat:status/charmed"), "the damaged foe was charmed");
            // 安抚的两个附加过程都挂在真正受伤的目标上：错拍与卸劲都是能力等级下降。
            stage.expect(stage.stages(foe).spe < 0 && stage.stages(foe).atk < 0, "the charmed foe lost Speed and Attack stages");
            stage.note("the charm only lands because the damage landed; its length is formula-driven", {
                casts: stage.casts("disarmingvoice", caster),
                damage: Math.round(stage.damageTo(foe) * 10) / 10,
                stages: stage.stages(foe),
                charmed: stage.hadMobEffect(foe, "world_combat:status/charmed")
            });
            stage.boost(foe, { spe: 1, atk: 1 });
            stage.command("effect clear @e[type=cobblemon:pokemon,distance=..40] world_combat:disarming_charm");
            stage.command("effect clear @e[type=cobblemon:pokemon,distance=..40] world_combat:disarming_echo");
            stage.after(5, function () {
                stage.expect((stage.stages(foe).spe || 0) === 1 && (stage.stages(foe).atk || 0) === 1,
                    "cleansing soothing voice removes its two losses and preserves independent gains");
                stage.done();
            });
        });
    }, "the soothing cry lands and charms within 50 s");
});
