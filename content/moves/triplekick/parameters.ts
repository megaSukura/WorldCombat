/**
 * 三连踢 / triplekick 的参数与数值来源。
 *
 * 原生事实：格斗／物理／威力 10／命中 90／PP 10／接触；连续 3 次、每一下独立掷命中（multiaccuracy），
 * 每中一次威力提高（10→20→30），中途落空这串就断（Cobblemon 1.8，仅 1 位学习者）。
 *
 * 翻译：把「朝对手快速踢出三脚、一脚比一脚重」落成**朝前的窄走廊三脚直踢**——三脚都打在同一条线上，
 * 第 n 脚威力 = kick × (1 + ramp × 已中脚数)。每脚独立掷命中，落空这串就停。
 * 与三旋击分开：三连踢是**直线、贴地、快而准**的单体连踢（脚数间隔更短、命中率更高、冷却更短）；
 * 三旋击是原地旋转、宽弧横扫、单脚更重、够得更远。
 *
 * 数值分散（每个参数各吃不同的精灵数据，小差距才在场上看得出来）：
 *   kick      第一脚威力：物攻定踢得多沉；再乘递增。
 *   kicks     脚数：固定 3 脚。
 *   ramp      每中一脚的递增系数：等级决定斜率。
 *   reach     踢击距离：碰撞箱宽度与速度决定够到多远，也是本招实际射程来源。
 *   halfWidth 踢击面半宽：碰撞箱宽度决定这一脚有多宽。
 *   gap       脚间隔：速度决定三脚连得多紧。
 *   accuracy  每脚命中率：速度提高它；抽射式略降。
 *   push      击退：物攻决定踢开后顶多远；抽射式顶得更远。
 *   sparks    尘点数量：物攻派生，表现按它发射。
 *   tempo／recover／recharge：速度与配置共同决定起手、收招与冷却。
 *
 * 配置 `drive`（抽射式）双向取舍（默认关）：
 *   开（抽射）：每脚 ×1.12、击退 ×1.5，代价是够得近（距离 ×0.85）、间隔 +1 刻、命中率 −2%、收招 +1、冷却 +2。
 *   关（快踢，原生形态）：够得更远（×1.03）、连得更紧（间隔 −1）、命中率 +2%、冷却更短，代价是单脚较轻。
 *
 * 伤害段 `kick` 走共享换算（对手防御、相性与暴击在每脚命中时另算）；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const triplekickId = "triplekick";
    export const triplekickScene = "world_combat:move_triplekick";
    export const triplekickMissText = "world_combat.move.triplekick.text.miss";
    export const triplekickRiseText = "world_combat.move.triplekick.text.rise";

    actionParameters.define(triplekickId, {
        /** 第一脚威力：(10 + 物攻偏移[−2,9]) × 抽射 1.12；夹 6..22。 */
        kick: formula(
            F.base(10)
                .plus(F.stat("attack").minus(45).times(0.1).clamp(-2, 9))
                .times(F.when(F.pref("drive", { key: "worldcombat.skill.triplekick.preference.drive", fallback: "抽射式" }), F.const(1.12), F.const(1)))
                .clamp(6, 22).round(1),
            "第一脚威力", {
                unit: "威力",
                description: "三连踢第一脚的威力；物攻越高踢得越沉，后两脚在此基础上按 ramp 递增。对手防御、相性与暴击在每脚命中时另算。"
            }),
        /** 脚数：固定 3 脚。 */
        kicks: formula(
            F.base(3).round(0),
            "脚数", {
                unit: "脚",
                description: "这套连踢一共几脚；每脚独立掷命中，落空这串就停。"
            }),
        /** 每中一脚的递增系数：1.0 + (等级 − 20) × 0.004 [0,0.2]；夹 0.8..1.25。 */
        ramp: formula(
            F.base(1.0).plus(F.level().minus(20).times(0.004).clamp(0, 0.2)).clamp(0.8, 1.25).round(2),
            "每中递增", {
                unit: "倍",
                description: "每多中一脚，下一脚威力再加这么多倍的基础值（原生为每脚 +1 倍）；等级越高斜率越陡。"
            }),
        /** 踢击距离：2.3 + 宽度偏移[−0.1,0.5] + 速度偏移[−0.15,0.4]，抽射 ×0.85 / 快踢 ×1.03；夹 2.0..3.2。 */
        reach: formula(
            F.base(2.3)
                .plus(F.body("width").minus(0.9).times(0.35).clamp(-0.1, 0.5))
                .plus(F.stat("speed").minus(45).times(0.004).clamp(-0.15, 0.4))
                .times(F.when(F.pref("drive", { key: "worldcombat.skill.triplekick.preference.drive", fallback: "抽射式" }), F.const(0.85), F.const(1.03)))
                .clamp(2.0, 3.2).round(2),
            "踢击距离", {
                unit: "格",
                description: "一脚直踢能够到多远；身体越宽、出手越快够得越远，也是本招实际射程来源。抽射式贴得更近。"
            }),
        /** 踢击面半宽：0.4 + 宽度偏移[−0.04,0.28]；夹 0.34..0.72。 */
        halfWidth: formula(
            F.base(0.4).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.04, 0.28)).clamp(0.34, 0.72).round(2),
            "踢击面半宽", {
                unit: "格",
                description: "这一脚在身前扫过多宽的一条；身体越宽的个体踢面越宽，画面里的走廊宽度与它一致。"
            }),
        /** 脚间隔：4 − 速度偏移[−0.8,1.2]，抽射 +1 / 快踢 −1；夹 2..6。 */
        gap: seconds(
            F.base(4).minus(F.stat("speed").minus(45).times(0.02).clamp(-0.8, 1.2))
                .plus(F.when(F.pref("drive", { key: "worldcombat.skill.triplekick.preference.drive", fallback: "抽射式" }), F.const(1), F.const(-1)))
                .clamp(2, 6).round(0),
            "脚间隔", "两脚之间隔多久；速度越快连得越紧，抽射式更慢一些。"),
        /** 每脚命中率：0.92 + 速度偏移[−0.04,0.05]，抽射 −0.02 / 快踢 +0.02；夹 0.75..0.98。 */
        accuracy: percent(
            F.base(0.92)
                .plus(F.stat("speed").minus(45).times(0.001).clamp(-0.04, 0.05))
                .plus(F.when(F.pref("drive", { key: "worldcombat.skill.triplekick.preference.drive", fallback: "抽射式" }), F.const(-0.02), F.const(0.02)))
                .clamp(0.75, 0.98).round(3),
            "每脚命中率", "每一脚独立掷的命中率（原生 90% 起）；速度提高它，抽射式略降。一脚落空这串就停。"),
        /** 击退：(0.2 + 物攻偏移[−0.03,0.35]) × 抽射 1.5；夹 0.12..0.7。 */
        push: formula(
            F.base(0.2).plus(F.stat("attack").minus(45).times(0.005).clamp(-0.03, 0.35))
                .times(F.when(F.pref("drive", { key: "worldcombat.skill.triplekick.preference.drive", fallback: "抽射式" }), F.const(1.5), F.const(1)))
                .clamp(0.12, 0.7).round(2),
            "击退", {
                unit: "格",
                description: "被踢中的人沿踢击方向被顶开的距离；力量越大顶得越远，抽射式顶得更远。"
            }),
        /** 尘点数量：14 + 物攻偏移[−3,14]；夹 10..40。 */
        sparks: formula(
            F.base(14).plus(F.stat("attack").minus(45).times(0.1).clamp(-3, 14)).clamp(10, 40).round(0),
            "尘点数量", {
                unit: "点",
                description: "每一脚踢出与踢中时带起的尘点数量，随物攻增长；粒子直接按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：5 − 速度偏移[−0.8,1.3]；夹 3..8。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(45).times(0.02).clamp(-0.8, 1.3)).clamp(3, 8).round(0),
            "起手", "收腿到第一脚踢出的时间；速度越快越短。"),
        /** 收招：5 − 速度偏移[−0.6,1.2]，抽射 +1；夹 3..9。 */
        recover: seconds(
            F.base(5).minus(F.stat("speed").minus(45).times(0.015).clamp(-0.6, 1.2))
                .plus(F.when(F.pref("drive", { key: "worldcombat.skill.triplekick.preference.drive", fallback: "抽射式" }), F.const(1), F.const(0)))
                .clamp(3, 9).round(0),
            "收招", "三脚踢完收回站姿的时间；速度越快收得越快，抽射式略慢。"),
        /** 冷却：24 − 速度偏移[−2,4]，抽射 +2 / 快踢 −4；夹 14..34。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(45).times(0.05).clamp(-2, 4))
                .plus(F.when(F.pref("drive", { key: "worldcombat.skill.triplekick.preference.drive", fallback: "抽射式" }), F.const(2), F.const(-4)))
                .clamp(14, 34).round(0),
            "冷却", "再起一轮三连踢前的等待；速度越快回得越快，抽射式更费、快踢更短。PP 10 的代价。")
    });

    defineDamage(triplekickId, "kick", {}, { contact: true });

    stages(triplekickId, [
        { level: 20, values: { kick: 12 } },
        { level: 45, values: { kick: 15, reach: 2.8 } }
    ]);

    describe(triplekickId, [
        { key: "description.0", values: ["kick", "kicks", "ramp"] },
        { key: "description.1", values: ["reach", "halfWidth", "accuracy", "gap"] },
        { key: "description.2", values: ["push"] },
        { key: "drive.on", values: [], when: function (context) { return read(context.detail.values, ["drive"]) === true; } },
        { key: "drive.off", values: [], when: function (context) { return read(context.detail.values, ["drive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.kick"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.kick", "tier.1.reach"] }
    ]);
}
