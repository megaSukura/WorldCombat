/**
 * 吸取之吻 / drainingkiss —— 参数与伤害段。
 *
 * 原生事实：Fairy／特殊／威力 50／命中 100／PP 10／接触／吸取 3/4 伤害（Cobblemon 1.8，87 位已实装学习者）。
 *
 * 核心念头：凑到对手脸前，用一个吻把它的一口气吸过来——它比同族任何一口都黏，抽回的比例超过一半以上。
 * 翻译：一记贴身的接触吸取；命中即结算 `peck` 特殊伤害，伤害的 3/4 经共享 `drain` 转回自身（原生比例）。
 *   因为吻要贴上脸才成立，它没有远程版本，走位是它的读法；亲密度（培养）让这一吻更真、更滋养。
 *
 * 与家族分开：食梦必须先睡着、吸取是藤不脱手、花粉团按对象分红伤；只有吸取之吻是**贴身而回的吻**，
 *   也只有它的汲取比例超过一半（0.75），回血最黏、但出手最短。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   peck     亲吻威力 50 + 特攻偏移 + 亲密度偏移；沉醉式 ×0.88 / 轻啄式 ×1.12。
 *   sap      回血比例 0.75 + 特攻偏移 + 亲密度偏移；沉醉式 ×1.22 / 轻啄式 ×0.9。
 *   reach    亲吻距离 3.0 + 速度偏移；也是实际射程来源，够得到才亲得上。
 *   radius   亲吻判定 0.42 + 体型身高偏移。
 *   hearts   心数 10 + 特攻偏移 + 亲密度偏移；直接驱动画面里爆开的心形数量。
 *   tempo／aftercast／recharge 速度决定起手、收招与冷却；沉醉式沉得更久。
 *
 * 配置 `swoon`（沉醉之吻）双向取舍：开＝回血比例 ×1.22，但威力 ×0.88、起手 +3 刻、冷却 +5 刻（续航取向）；
 *   关（轻啄）＝威力 ×1.12、回血 ×0.9、回得快（爆发取向）。两向各有局面。
 *
 * 伤害段 `peck` 与参数同名，走共享换算（原生类别 Special，Fairy 属性，接触）。
 */
namespace PokemonSkills {
    export const drainingkissId = "drainingkiss";
    export const drainingkissScene = "world_combat:move_drainingkiss";

    actionParameters.define(drainingkissId, {
        /** 亲吻威力：50 + 特攻偏移[−12,30] + 亲密度偏移[−3,8]；沉醉 ×0.88 / 轻啄 ×1.12；夹 28..92。 */
        peck: formula(
            F.base(50)
                .plus(F.stat("specialAttack").minus(55).times(0.28).clamp(-12, 30))
                .plus(F.individual("friendship", text("worldcombat.skill.drainingkiss.value.friendship")).minus(70).times(0.05).clamp(-3, 8))
                .times(F.when(F.pref("swoon", text("worldcombat.skill.drainingkiss.preference.swoon")), F.const(0.88), F.const(1.12)))
                .clamp(28, 92).round(1),
            "亲吻威力", {
                unit: "威力",
                description: "这一吻吸走多少的那部分基础威力；特攻越高、感情越好吸得越重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 回血比例：0.75 + 特攻偏移[−0.03,0.05] + 亲密度偏移[−0.04,0.08]；沉醉 ×1.22 / 轻啄 ×0.9；夹 0.60..0.95。 */
        sap: percent(
            F.base(0.75)
                .plus(F.stat("specialAttack").minus(55).times(0.0005).clamp(-0.03, 0.05))
                .plus(F.individual("friendship", text("worldcombat.skill.drainingkiss.value.friendship")).minus(70).times(0.0006).clamp(-0.04, 0.08))
                .times(F.when(F.pref("swoon", text("worldcombat.skill.drainingkiss.preference.swoon")), F.const(1.22), F.const(0.9)))
                .clamp(0.60, 0.95),
            "汲取比例", "造成的伤害转为自身回复的比例（原生四分之三）；特攻越高、感情越好回得越足，沉醉式更黏。"),
        /** 亲吻距离：3.0 + 速度偏移[−0.3,0.8]；夹 2.4..4.2；也是实际射程来源。 */
        reach: formula(
            F.base(3.0).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.8)).clamp(2.4, 4.2).round(2),
            "亲吻距离", {
                unit: "格",
                description: "必须凑到多近才能亲到对手，也是本招的实际射程来源；腿快的个体能主动贴上。"
            }),
        /** 亲吻判定：0.42 + 身高偏移[−0.06,0.26]；夹 0.34..0.70。 */
        radius: formula(
            F.base(0.42).plus(F.body("height").minus(1.2).times(0.12).clamp(-0.06, 0.26)).clamp(0.34, 0.70).round(2),
            "亲吻判定", {
                unit: "格",
                description: "这一吻能贴上多大一圈；个高的个体凑得更稳，更不容易被侧身让开。"
            }),
        /** 心数：10 + 特攻偏移[−2,8] + 亲密度偏移[−2,8]；夹 8..30。同时驱动画面里爆开的心数。 */
        hearts: formula(
            F.base(10)
                .plus(F.stat("specialAttack").minus(55).times(0.08).clamp(-2, 8))
                .plus(F.individual("friendship", text("worldcombat.skill.drainingkiss.value.friendship")).minus(70).times(0.1).clamp(-2, 8))
                .clamp(8, 30).round(0),
            "心数", {
                unit: "个",
                description: "命中处爆开的心形数量；特攻越高、感情越好，画面越满。"
            }),
        /** 起手：6 − 速度偏移[−2,3] + 沉醉式 3；夹 4..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("swoon", text("worldcombat.skill.drainingkiss.preference.swoon")), F.const(3), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "凑近并送上这一吻的时间；速度越快越短，沉醉式要多停留一会儿。"),
        /** 收招：8 − 速度偏移[−2,3]；夹 4..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 3)).clamp(4, 12).round(0),
            "收招", "亲完退开、理一下的收势。"),
        /** 冷却：26 − 速度偏移[−4,6] + 沉醉式 5；夹 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.06).clamp(-4, 6))
                .plus(F.when(F.pref("swoon", text("worldcombat.skill.drainingkiss.preference.swoon")), F.const(5), F.const(0)))
                .clamp(18, 40).round(0),
            "冷却", "两次献吻之间的等待；速度快的个体回得更快，沉醉式更费。")
    });

    defineDamage(drainingkissId, "peck", { defenceCoefficient: 0.005,
        rationale: "贴身一吻抽走的一口气，防御按默认系数减伤。" }, { contact: true });

    stages(drainingkissId, [
        { level: 22, values: { peck: 60, hearts: 13 } },
        { level: 40, values: { peck: 72, sap: 0.80, hearts: 18 } }
    ]);

    describe(drainingkissId, [
        { key: "description.0", values: ["peck", "sap"] },
        { key: "description.1", values: ["reach"] },
        { key: "swoon.on", values: [], when: function (context) { return read(context.detail.values, ["swoon"]) === true; } },
        { key: "swoon.off", values: [], when: function (context) { return read(context.detail.values, ["swoon"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.peck"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.peck", "tier.1.sap"] }
    ]);
}
