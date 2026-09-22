/**
 * 流星突击 / meteorassault 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Fighting、物理、威力 150、命中 100、PP 5、优先度 0、非接触（挥击）、
 * self mustrecharge（下一回合无法行动）。仅一只精灵（葱游兵）学会，是签名招。
 *
 * 翻译：保留「大力挥舞粗壮的茎连续攻击，自己也被晃晕」，把「下一回合无法动弹」翻成即时战斗里**最长的力竭窗口**
 * （晃晕）：连续几段重挥之后，施法者被挂上 `world_combat:status/mustrecharge`（本单元效果），无法行动、无法移动。
 * 数据分散：攻击与速度决定每一挥的轻重（挥得快更重），体型决定挥弧的半径与张开角度，等级决定段数的收益；
 * 配置 swings（挥击段数，2..5）是真正的取舍——多挥一段就多一份总伤害，但晃晕更长、动作更久。
 *
 * 伤害段名 smash：每一挥随精灵数据变化的那部分（总伤害 = 段数 × 单段）。
 */
namespace PokemonSkills {
    actionParameters.define("meteorassault", {
        /** 单段威力：攻击每比 60 多 1 加 0.5（上限 +30），速度每比 60 快 1 加 0.2（上限 +16）；夹在 34..92。 */
        smash: formula(
            F.base(52)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-12, 30))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-8, 16))
                .clamp(34, 92).round(1),
            "单段威力", {
                unit: "威力",
                description: "每一挥的基础威力；总伤害是它乘以挥击段数。对手防御、相性与暴击在命中时另算。"
            }),
        /** 挥击段数：配置值 2..5，直接作为参数。 */
        swings: formula(
            F.pref("swings").clamp(2, 5).round(),
            "挥击段数", {
                unit: "段",
                description: "这条弧上连续重挥几下；段数越多总伤害越高，但晃晕更久。"
            }),
        /** 挥弧半径：基础 3.0，碰撞箱每比 1.4 高 1 格加 0.4；夹在 2.4..4.6。 */
        reach: formula(
            F.base(3.0).plus(F.body("height").minus(1.4).times(0.4)).clamp(2.4, 4.6).round(2),
            "挥弧半径", {
                unit: "格",
                description: "每次横扫够到多远；驱动目标接受范围。"
            }),
        /** 挥弧张开角度：基础 110°，碰撞箱每比 1.4 高 1 格加 14°；夹在 80..180°。 */
        arc: formula(
            F.base(110).plus(F.body("height").minus(1.4).times(14)).clamp(80, 180).round(),
            "挥弧角度", {
                unit: "度",
                description: "每次横扫张开的扇形角度；身板越大扫得越开，能同时打到更多人。"
            }),
        /** 段间隔：基础 9 tick，速度每比 60 快 1 减 0.02 tick；夹在 6..12 tick。 */
        interval: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02)).clamp(6, 12).round(),
            "段间隔", "两段重挥之间隔多久。"),
        /** 晃晕力竭：基础 50 tick，每比 3 段多 1 段加 9 tick，速度每比 60 快 1 加 0.1 tick（上限 +12）；夹在 34..120 tick。 */
        exhaust: seconds(
            F.base(50)
                .plus(F.pref("swings").minus(3).times(9))
                .plus(F.stat("speed").minus(60).times(0.1).clamp(-4, 12))
                .clamp(34, 120).round(),
            "晃晕力竭", "挥完之后被自己晃晕、无法行动也无法移动的时间；挥得越多越久。"),
        /** 起手：基础 8 tick，速度每比 60 快 1 减 0.02 tick；夹在 5..12 tick。 */
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02)).clamp(5, 12).round(),
            "起手", "把茎举过头顶的准备时间。")
    });

    stages("meteorassault", [
        { level: 40, values: { smash: 62 } },
        { level: 60, values: { smash: 72 } }
    ]);

    defineDamage("meteorassault", "smash", { defenceCoefficient: 0.0052, rationale: "格斗重击对防御穿透略强，多段命中让攻击差更明显。" }, {});

    describe("meteorassault", [
        { key: "description.0", values: ["smash", "swings"] },
        { key: "description.1", values: ["reach", "arc", "interval"] },
        { key: "description.2", values: ["exhaust"] },
        { key: "description.3", values: ["charge"] }
    ]);
}
