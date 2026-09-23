/**
 * 水流喷射 / aquajet —— 参数与伤害段。
 *
 * 原生事实：水／物理／威力 40／命中 100／PP 20／优先度 +1／接触，无次要效果（Cobblemon 1.8，70 位学习者）。
 *   描述「以迅雷不及掩耳之势扑向对手。必定能够先制攻击」。
 *
 * 翻译：本招把「先制」翻成一枚**把自己裹进水柱、贴地射出去的鱼雷**：起手极短（提交即射，水在脚边聚成一环），
 *   沿瞄准方向高速推进，身后拖一整条水柱；撞上第一个非友方活体就炸开——结算 jet 接触伤害、把它顶开，
 *   并把它**浇透**（共享身份 world_combat:status/soaked，别的单元可以只问「湿没湿」）；若它正带着火或灼伤，
 *   这一冲把火浇熄（浇熄走共享的 burn 身份）。
 *   它比电光一闪更远、更久：水柱给了更长的推进与更重的顶开，代价是起手稍慢、冷却更高、单发略逊。
 *   与最像的水流尾分开：水流尾是站定抡出一片向前推进的弧形浪墙、可以同时拍中多人；水流喷射是**一条直线鱼雷**，
 *   默认只命中路径上的第一个，命中者被浇透。与电光一闪分开：靠水柱拖尾与「浇透」读出来。
 *
 * 数据分散（每个参数各吃不同的精灵数据，落到不同参数上）：
 *   jet             水柱威力：攻击给力道、速度给水压；**已经在水里**（身体 wet）时再抬一成四；激流式 ×0.82。
 *   surge           喷射距离：速度与等级决定这枚鱼雷能射多远，也是射程来源。
 *   pace            每刻位移：速度决定射得多急。
 *   collisionRadius 判定半径：身高决定水柱多粗；激流式再宽 25%。
 *   push            顶开距离：体重决定水柱把目标冲开多远。
 *   soakTicks       浇透时长：等级与体重决定水在身上挂多久；激流式更久。
 *   spray           水花数量：速度与体重驱动，表现按它发射。
 *   tempo/settle/recharge 速度决定起手、收招与冷却；激流式冷却更久。
 *
 * 配置 `deluge`（激流贯注）双向取舍：开启＝水柱贯穿整条路径、浇透每一个碰到的人、判定更宽、湿得更久，
 *   但单点伤害 ×0.82、冷却多 6 刻；关闭＝单发鱼雷，命中即停、这一下最重。一个换「扫过一片」，一个换「打穿一个」。
 *
 * 伤害段 `jet` 与参数同名；接触标记写在 defineDamage 上，对手防御、相性与暴击在命中时统一结算。
 * 浇透用的载体 `world_combat:aquajet_soaked` 在 startup.ts 注册并打共享身份 soaked（identity_only）。
 */
namespace PokemonSkills {
    export const aquajetId = "aquajet";
    export const aquajetScene = "world_combat:move_aquajet";
    export const aquajetSoakedEffect = "world_combat:aquajet_soaked";
    export const aquajetSoakText = "world_combat.move.aquajet.text.soak";
    export const aquajetDouseText = "world_combat.move.aquajet.text.douse";
    export const aquajetMissText = "world_combat.move.aquajet.text.miss";

    actionParameters.define(aquajetId, {
        /** 水柱威力：40 +（物攻 − 55）× 0.20 [−9,20] +（速度 − 55）× 0.22 [−6,20]；水中 ×1.14；激流 ×0.82；夹 26..98。 */
        jet: formula(
            F.base(40)
                .plus(F.stat("attack").minus(55).times(0.20).clamp(-9, 20))
                .plus(F.stat("speed").minus(55).times(0.22).clamp(-6, 20))
                .times(F.when(F.state("wet"), F.const(1.14), F.const(1)))
                .times(F.when(F.pref("deluge", text("worldcombat.skill.aquajet.preference.deluge")), F.const(0.82), F.const(1)))
                .clamp(26, 98).round(1),
            "水柱威力", {
                unit: "威力",
                description: "裹在水柱里撞实的那一下；物攻给力道、速度给水压，已经在水里的个体喷得更猛。激流式每一下更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 喷射距离：3.1 +（速度 − 55）× 0.022 [−0.4,1.3] +（等级 − 20）× 0.02 [0,0.7]；夹 2.8..5.2。 */
        surge: formula(
            F.base(3.1).plus(F.stat("speed").minus(55).times(0.022).clamp(-0.4, 1.3))
                .plus(F.level().minus(20).times(0.02).clamp(0, 0.7)).clamp(2.8, 5.2).round(2),
            "喷射距离", {
                unit: "格",
                description: "这一枚水柱最远射到哪，也是本招的实际射程来源；腿快的个体射得更远。"
            }),
        /** 每刻位移：1.0 +（速度 − 55）× 0.006 [−0.12,0.5]；夹 0.8..1.7。 */
        pace: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.12, 0.5)).clamp(0.8, 1.7).round(2),
            "喷射速度", { unit: "格/刻", description: "水柱每刻推进的距离；越快越难在水柱到达前闪开。" }),
        /** 判定半径：0.44 +（身高 − 1.4）× 0.10 [−0.06,0.26]；激流 ×1.25；夹 0.38..0.98。 */
        collisionRadius: formula(
            F.base(0.44).plus(F.body("height").minus(1.4).times(0.10).clamp(-0.06, 0.26))
                .times(F.when(F.pref("deluge", text("worldcombat.skill.aquajet.preference.deluge")), F.const(1.25), F.const(1)))
                .clamp(0.38, 0.98).round(2),
            "判定半径", { unit: "格", description: "水柱扫过活体的横向半径；身板越大水柱越粗，激流式再宽四分之一。" }),
        /** 顶开距离：0.28 +（体重 − 100）× 0.0015 [−0.06,0.3]；夹 0.12..0.6。 */
        push: formula(
            F.base(0.28).plus(F.body("weight").minus(100).times(0.0015).clamp(-0.06, 0.3)).clamp(0.12, 0.6).round(2),
            "顶开距离", { unit: "格", description: "被水柱冲开后沿喷射方向退多远；身体越重水势越大。" }),
        /** 浇透时长：70 +（等级 − 20）× 0.8 [0,40] +（体重 − 100）× 0.08 [−8,24]；激流 ×1.3；夹 50..180 刻。 */
        soakTicks: seconds(
            F.base(70).plus(F.level().minus(20).times(0.8).clamp(0, 40))
                .plus(F.body("weight").minus(100).times(0.08).clamp(-8, 24))
                .times(F.when(F.pref("deluge", text("worldcombat.skill.aquajet.preference.deluge")), F.const(1.3), F.const(1)))
                .clamp(50, 180).round(0),
            "浇透时长", "被浇透后湿身（共享身份 soaked）挂多久；等级与体重越高、激流式越久，水在身上挂得越久。"),
        /** 水花数量：18 +（速度 − 55）× 0.30 [−3,14] +（体重 − 100）× 0.04 [−2,10]；夹 12..44。 */
        spray: formula(
            F.base(18).plus(F.stat("speed").minus(55).times(0.30).clamp(-3, 14))
                .plus(F.body("weight").minus(100).times(0.04).clamp(-2, 10)).clamp(12, 44).round(0),
            "水花数量", {
                unit: "点",
                description: "水柱拖尾与爆开时激起的水花数量，也直接驱动画面的发射量；速度与体重越高水花越密。"
            }),
        /** 起手：3 −（速度 − 55）× 0.02 [−0.8,1.6]；夹 1..5 刻。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6)).clamp(1, 5).round(0),
            "起手", "从起念到水柱射出去之间的时间；水要聚起来，所以比电光一闪多半拍。"),
        /** 收招：7 −（速度 − 55）× 0.02 [−0.8,1.6]；夹 4..10 刻。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.6)).clamp(4, 10).round(0),
            "收招", "水柱射完落地站稳的时间；比电光一闪长一点，因为它冲得更远。"),
        /** 冷却：22 −（速度 − 55）× 0.10 [−2,4] + 激流 6；夹 14..34 刻。 */
        recharge: seconds(
            F.base(22).minus(F.stat("speed").minus(55).times(0.10).clamp(-2, 4))
                .plus(F.when(F.pref("deluge", text("worldcombat.skill.aquajet.preference.deluge")), F.const(6), F.const(0)))
                .clamp(14, 34).round(0),
            "冷却", "这一枚之后多久能再射一次；速度快的个体回得更快，激流式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(aquajetId, "jet", {}, { contact: true });

    stages(aquajetId, [
        { level: 20, values: { jet: 50 } },
        { level: 38, values: { jet: 62, surge: 3.6 } }
    ]);

    describe(aquajetId, [
        { key: "description.0", values: ["jet","collisionRadius"] },
        { key: "description.1", values: ["surge", "pace", "push"] },
        { key: "description.2", values: ["soakTicks"] },
        { key: "description.douse", values: [] },
        { key: "deluge.on", values: [], when: function (context) { return read(context.detail.values, ["deluge"]) === true; } },
        { key: "deluge.off", values: [], when: function (context) { return read(context.detail.values, ["deluge"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jet"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jet", "tier.1.surge"] }
    ]);
}
