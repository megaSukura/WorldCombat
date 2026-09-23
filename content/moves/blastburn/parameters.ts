/**
 * 爆炸烈焰 / blastburn 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Fire、特殊、威力 150、命中 90、PP 5、优先度 0、非接触、
 * self mustrecharge（下一回合无法行动）。
 *
 * 翻译：保留「用爆炸的火焰烧尽对手」，把「下一回合无法动弹」翻成即时战斗里的**过热力竭窗口**：
 * 爆发之后施法者热力透支，被挂上 `world_combat:status/mustrecharge`（本单元效果），无法行动、无法移动。
 * 数据分散：特攻决定这一爆的威力、射程与灼伤概率，等级决定灼伤持续时间，速度决定火球飞行速度与起手；
 * 配置 spread（爆散范围，1.6..3.6 格）是真正的取舍——铺得更开能同时烧到更多人，但每人的伤害下降、
 * 而且热得更透、力竭更久；收得紧则爆发集中、力竭更短，但只烧得到落点附近。
 *
 * 伤害段名 blast：这一爆随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("blastburn", {
        /** 爆炸威力：特攻每比 60 多 1 加 1.1（上限 +80），等级每比 20 多 1 加 0.6（上限 +30）；按 2.6 / 爆散范围 反向缩放；夹在 95..250。 */
        blast: formula(
            F.base(150)
                .plus(F.stat("specialAttack").minus(60).times(1.1).clamp(-30, 80))
                .plus(F.level().minus(20).times(0.6).clamp(0, 30))
                .times(F.const(2.6).div(F.pref("spread")))
                .clamp(95, 250).round(1),
            "爆炸威力", {
                unit: "威力",
                description: "本段伤害的基础威力；爆散范围越宽，落点每人分到的越少。对手防御、相性与暴击在命中时另算。"
            }),
        /** 爆散半径：配置值 1.6..3.6，特攻每比 60 多 1 加 0.012（上限 +1.4）；夹在 1.5..4.8。 */
        radius: formula(
            F.pref("spread")
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.4))
                .clamp(1.5, 4.8).round(2),
            "爆散半径", {
                unit: "格",
                description: "落点火焰波及的半径；也决定画面里那圈冲击波的大小。"
            }),
        /** 火球速度：基础 0.85，速度每比 60 快 1 加 0.006；夹在 0.55..1.5。 */
        speed: formula(
            F.base(0.85).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.25, 0.65)).clamp(0.55, 1.5).round(2),
            "火球速度", {
                unit: "格/刻",
                description: "压缩火球飞向落点的速度；越快越难被躲。"
            }),
        /** 投送射程：基础 11，特攻每比 60 多 1 加 0.05；夹在 10..20。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-3, 9)).clamp(10, 20).round(1),
            "投送射程", {
                unit: "格",
                description: "能把这团火投到多远；特攻高的个体站得更远。"
            }),
        /** 灼伤概率：基础 0.5，特攻每比 60 多 1 加 0.004；夹在 0.35..0.85。 */
        burnChance: percent(
            F.base(0.5).plus(F.stat("specialAttack").minus(60).times(0.004).clamp(-0.15, 0.35)).clamp(0.35, 0.85).round(3),
            "灼伤概率", "落点范围内每个对手被引爆的火焰点着的概率。"),
        /** 灼伤持续：基础 60 tick，等级每比 20 高 1 加 1.2 tick；夹在 40..140 tick。 */
        burnTicks: seconds(
            F.base(60).plus(F.level().minus(20).times(1.2).clamp(0, 80)).clamp(40, 140).round(),
            "灼伤持续", "被点燃的对手身上的灼伤状态持续多久。"),
        /** 火球判定半径：基础 0.4，碰撞箱每比 1.4 高 1 格加 0.12；夹在 0.3..0.7。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.12)).clamp(0.3, 0.7).round(2),
            "火球判定半径", {
                unit: "格",
                description: "飞行途中撞上活体即提前引爆的判定半径。"
            }),
        /** 过热力竭：基础 52 tick，特攻每比 60 多 1 加 0.4 tick（上限 +40），按 爆散范围 / 2.6 放大；夹在 30..110 tick。 */
        exhaust: seconds(
            F.base(52)
                .plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-12, 40))
                .times(F.pref("spread").div(2.6))
                .clamp(30, 110).round(),
            "过热力竭", "爆发之后无法行动、无法移动的时间；火铺得越开，热得越透、恢复越久。"),
        /** 起手：基础 10 tick，速度每比 60 快 1 减 0.03 tick；夹在 6..16 tick。 */
        charge: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03)).clamp(6, 16).round(),
            "起手", "压缩火焰的准备时间。")
    });

    stages("blastburn", [
        { level: 36, values: { blast: 166 } },
        { level: 56, values: { blast: 184 } }
    ]);

    defineDamage("blastburn", "blast", { defenceCoefficient: 0.0042, rationale: "特殊爆发对防御穿透略强，让特攻差更明显。" }, {});

    describe("blastburn", [
        { key: "description.0", values: ["blast"] },
        { key: "description.1", values: ["radius","burnChance","burnTicks"] },
        { key: "description.2", values: ["exhaust"] },
        { key: "description.3", values: ["reach","speed","charge","collisionRadius"] },
        { key: "timing", values: ["charge","recover","pp","cooldown"] }
    ]);
}
