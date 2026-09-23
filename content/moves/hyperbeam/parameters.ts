/**
 * 破坏光线 / hyperbeam 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：一般、特殊、威力 150、命中 90、PP 5、优先度 0、非接触、
 * self mustrecharge（下一回合无法行动）。
 *
 * 翻译：保留「一束贯穿的强烈光线」，把原生的单点命中翻成即时战斗里的一条**穿透走廊**：
 * 提交的一刻光柱沿瞄准方向射出，走廊内的活体全部被贯穿（上限 `pierce`），撞墙即被挡下。
 * 「下一回合无法动弹」翻成真实的熄火窗口 `world_combat:status/mustrecharge`（本单元效果）：
 * 无法行动、无法移动。数据分散：特攻决定威力、光束长度与贯穿上限，速度决定起手与恢复快慢，
 * 体型决定光柱宽度，等级拾级抬升威力；**每多贯穿一个活体，熄火窗口按 `pierceCost` 延长**——
 * 让「排队站」既有收益（一次穿多个）又有代价（更久不能动）。
 * 配置 `focus`（聚焦）把光束收窄，换来更长射程、更高单伤与更久熄火；散焦更宽更短，但容易扫到并排的敌人。
 *
 * 伤害段名 beam：这一束随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("hyperbeam", {
        /** 光束威力：特攻每比 60 多 1 加 1.05（上限 +85），等级每比 20 多 1 加 0.5（上限 +30）；聚焦 ×1.08 / 散焦 ×0.94；夹在 95..250。 */
        beam: formula(
            F.base(150)
                .plus(F.stat("specialAttack").minus(60).times(1.05).clamp(-35, 85))
                .plus(F.level().minus(20).times(0.5).clamp(0, 30))
                .times(F.when(F.pref("focus"), F.const(1.08), F.const(0.94)))
                .clamp(95, 250).round(1),
            "光束威力", {
                unit: "威力",
                description: "光柱贯穿每个目标的基础威力；聚焦收束更狠，散焦略轻。对手防御、相性与暴击在命中时由共享结算另算。"
            }),
        /** 光束长度：基础 11，特攻每比 60 多 1 加 0.05；聚焦 ×1.3 / 散焦 ×0.85；夹在 8..22。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-3, 9))
                .times(F.when(F.pref("focus"), F.const(1.3), F.const(0.85)))
                .clamp(8, 22).round(1),
            "光束长度", {
                unit: "格",
                description: "光柱从施法者向前延伸到多远；特攻越高、聚焦时越长，驱动实际的目标接受范围。"
            }),
        /** 光束半宽：基础 0.7，碰撞箱每比 1.4 高 1 格加 0.22；聚焦 ×0.55 / 散焦 ×1.25；夹在 0.28..1.5。 */
        width: formula(
            F.base(0.7).plus(F.body("height").minus(1.4).times(0.22))
                .times(F.when(F.pref("focus"), F.const(0.55), F.const(1.25)))
                .clamp(0.28, 1.5).round(2),
            "光束半宽", {
                unit: "格",
                description: "走廊的横向半宽；身板越高越宽，聚焦收窄、散焦铺开。这就是玩家在场上看到的那条光带有多宽。"
            }),
        /** 贯穿上限：基础 3，特攻每比 60 多 1 加 1/22；夹在 2..7。 */
        pierce: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).div(22)).clamp(2, 7).round(),
            "贯穿上限", {
                unit: "个",
                description: "一次最多贯穿几个活体；特攻越高越能穿透更多。"
            }),
        /** 起手：基础 13 tick，速度每比 60 快 1 减 0.03 tick；聚焦 ×1.15 / 散焦 ×0.95；夹在 7..22 tick。 */
        charge: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.03))
                .times(F.when(F.pref("focus"), F.const(1.15), F.const(0.95)))
                .clamp(7, 22).round(),
            "起手", "收束光束的准备时间；敏捷的个体起手更快，聚焦要多花一点时间。"),
        /** 熄火基础：基础 52 tick，特攻每比 60 多 1 加 0.42 tick（上限 +46），速度每比 60 快 1 减 0.05 tick；聚焦 ×1.18 / 散焦 ×0.94；夹在 32..120 tick。 */
        exhaust: seconds(
            F.base(52)
                .plus(F.stat("specialAttack").minus(60).times(0.42).clamp(-14, 46))
                .minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 8))
                .times(F.when(F.pref("focus"), F.const(1.18), F.const(0.94)))
                .clamp(32, 120).round(),
            "熄火时长", "打完这一束后的基础熄火时间；特攻越高、越慢的个体恢复越久。每多贯穿一个目标还会按「贯穿追加」继续延长。"),
        /** 贯穿追加：基础 9 tick，特攻每比 60 多 1 加 0.06 tick；夹在 5..22 tick。 */
        pierceCost: seconds(
            F.base(9).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-3, 12)).clamp(5, 22).round(),
            "贯穿追加", "每多贯穿一个活体，熄火窗口延长的时间；排队站得越密，这一束的冷却越久。")
    });

    stages("hyperbeam", [
        { level: 34, values: { beam: 166 } },
        { level: 54, values: { beam: 184 } }
    ]);

    defineDamage("hyperbeam", "beam", { defenceCoefficient: 0.0048, rationale: "贯穿光柱对特殊防御的压制略强，让特攻差距在场上更明显。" }, {});

    describe("hyperbeam", [
        { key: "description.0", values: ["beam"] },
        { key: "description.1", values: ["pierce","reach"] },
        { key: "description.2", values: ["width", "charge"] },
        { key: "description.3", values: ["exhaust", "pierceCost"] }
    ]);
}
