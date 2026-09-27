/**
 * 双光束 / twinbeam —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**Psychic**／特殊／威力 40／命中 100／PP 10／单体／非接触／连续 2 次（`multihit: 2`）。
 *   这是长颈鹿家族（麒麟奇/奇麒麟）的招式，全项目仅 2 位学习者。
 *
 * 翻译：把「从两眼发射出神奇的光线攻击，连续 2 次给予伤害」落成一记**双目并射**——头部两侧各有一个按体型估算的射口，
 *   每个射口射出一道灵光，两道射线朝同一个瞄点收拢、再各自沿原直线穿过交点飞完射程。每道光只打它碰到的第一个接触；
 *   只有两道光确实打到同一个目标，那一点才会共鸣、第二道才更强。
 *   它是四招里唯一远程、特殊、不接触的一招：两条发光的线从两个射口收拢到同一点，与两只手/两根针完全不同的读法。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   ray         每道光威力：特攻（瞳力有多强）；共鸣式每道更足、并射式略轻。
 *   reach       射程：等级（射口能及多远）。
 *   eyeSpan     两个射口的横向间隔：碰撞箱宽度（头越宽两射口离得越开，两道光收拢的角度越明显）。
 *   eyeHeight   射口离脚的高度：身高。
 *   gap         两道光的间隔：速度；共鸣式要等第一道点着。
 *   resonance   第二道共鸣加成：特攻（瞳力）＋48 级成长；并射式恒为 0，成长不能把它加回来。
 *   beamRadius  光柱半径：特攻（控制力越强光越粗）。
 *   motes       光点数量：特攻，直接驱动发射量。
 *   tempo/settle/recharge：速度与等级。
 *
 * 配置 `resonance`（共鸣，默认开）双向取舍：开启＝第一道先射、隔 `gap` 后第二道顺着亮点共鸣射入，第一道命中时
 *   第二道获得 `resonance` 加成；代价是出手更慢（起手 +1 刻、间隔长）、单道略轻时也要等。关闭（并射式）＝
 *   两道几乎同时射出，出手快、每道独立结算，但没有共鸣加成。两向各有适用局面：能站住读条就用共鸣，需要立刻
 *   出手压血就用并射。
 *
 * 伤害段 ray：每一道各自结算一次特殊伤害，规格空（共享结算乘入特攻、对手特防、相性与暴击）。
 */
namespace PokemonSkills {
    export const twinbeamId = "twinbeam";
    export const twinbeamScene = "world_combat:move_twinbeam";
    export const twinbeamResonanceText = "world_combat.move.twinbeam.text.resonance";

    actionParameters.define(twinbeamId, {
        /** 每道光威力：基础 40，特攻每比 55 多 1 加 0.16（夹 -6..18）；共鸣 ×1 / 并射 ×0.95；夹在 20..66。 */
        ray: formula(
            F.base(40).plus(F.stat("specialAttack").minus(55).times(0.16).clamp(-6, 18))
                .times(F.when(F.pref("resonance"), F.const(1), F.const(0.95))).clamp(20, 66).round(1),
            "每道光威力", {
                unit: "威力",
                description: "每一个射口各自结算的特殊威力；特攻越高瞳力越强。对手特防、相性与暴击在每道命中时另算。"
            }),
        /** 射程：基础 12 格，等级每比 20 高 1 加 0.12（夹 0..2.5）；夹在 9..16。 */
        reach: formula(
            F.base(12).plus(F.level().minus(20).times(0.12).clamp(0, 2.5)).clamp(9, 16).round(1),
            "射程", {
                unit: "格",
                description: "两个射口能射到多远；等级越高看得越远。它也是本招的实际射程来源。"
            }),
        /** 射口间距：基础 0.34 格，身宽每比 0.9 宽 1 格加 0.5（夹 -0.12..0.5）；夹在 0.18..0.9。 */
        eyeSpan: formula(
            F.base(0.34).plus(F.body("width").minus(0.9).times(0.5).clamp(-0.12, 0.5)).clamp(0.18, 0.9).round(2),
            "射口间距", {
                unit: "格",
                description: "两个射口之间隔多远；头越宽的个体两射口离得越开，两道光的收拢角度越明显。"
            }),
        /** 射口高度：基础 0.85 格，身高每比 1.4 高 1 格加 0.45（夹 -0.15..0.6）；夹在 0.5..1.5。 */
        eyeHeight: formula(
            F.base(0.85).plus(F.body("height").minus(1.4).times(0.45).clamp(-0.15, 0.6)).clamp(0.5, 1.5).round(2),
            "射口高度", {
                unit: "格",
                description: "射口离脚面多高；身高越高的个体射口越高，两道光的起点也越高。"
            }),
        /** 两道光间隔：基础 2 刻，共鸣 +3，速度每比 55 快 1 减 0.01（夹 -0.5..0.8）；夹在 1..6。 */
        gap: seconds(
            F.base(2).plus(F.when(F.pref("resonance"), F.const(3), F.const(0)))
                .minus(F.stat("speed").minus(55).times(0.01).clamp(-0.5, 0.8)).clamp(1, 6).round(0),
            "两道光间隔", "第一道与第二道之间隔多久；共鸣式要等第一道点着，间隔更长，并射式几乎同时。"),
        /** 第二道共鸣加成：基础 0.22，特攻每比 55 多 1 加 0.0015（夹 -0.05..0.16），48 级起把设计值 0.3 并入基础；
         *  成长先并入基础，再由共鸣偏好关门、最后夹在 0..0.42。偏好关闭时整段恒为 0，成长不能把它加回来。 */
        resonance: percent(
            F.when(F.pref("resonance"),
                F.base(0.22).plus(F.stat("specialAttack").minus(55).times(0.0015).clamp(-0.05, 0.16))
                    .plus(F.stage([[1, 0], [48, 0.3]])).clamp(0, 0.42),
                F.const(0)),
            "第二道共鸣加成", "两道光确实打到同一个目标时，第二道顺着那一点共鸣射入，威力最多再抬这么多；特攻越高共鸣越强。并射式整段为 0，成长也不会把它加回来。"),
        /** 光柱半径：基础 0.1 格，特攻每比 55 多 1 加 0.0008（夹 -0.02..0.08）；夹在 0.06..0.2。 */
        beamRadius: formula(
            F.base(0.1).plus(F.stat("specialAttack").minus(55).times(0.0008).clamp(-0.02, 0.08)).clamp(0.06, 0.2).round(2),
            "光柱半径", {
                unit: "格",
                description: "每一道光柱的粗细；特攻越高光越粗。画面里两条光的宽度就是它。"
            }),
        /** 光点数量：基础 18，特攻每比 55 多 1 加 0.16（夹 -4..16）；夹在 12..42。 */
        motes: formula(
            F.base(18).plus(F.stat("specialAttack").minus(55).times(0.16).clamp(-4, 16)).clamp(12, 42).round(0),
            "光点数量", {
                unit: "点",
                description: "每道命中时溅出的光点数量，随特攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 10 刻，速度每比 55 快 1 减 0.02（夹 -1.2..2），共鸣 +1；夹在 5..14。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.2, 2))
                .plus(F.when(F.pref("resonance"), F.const(1), F.const(0))).clamp(5, 14).round(0),
            "起手", "两个射口聚光、对准目标的时间；速度越快越短，共鸣式多花一点。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 减 0.02（夹 -1..1.5）；夹在 3..11。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.5)).clamp(3, 11).round(0),
            "收招", "两道射完收起目光的时间；速度越快收得越快。"),
        /** 冷却：基础 25 刻，等级每比 20 高 1 减 0.12（夹 0..3.5）；夹在 16..32。 */
        recharge: seconds(
            F.base(25).minus(F.level().minus(20).times(0.12).clamp(0, 3.5)).clamp(16, 32).round(0),
            "冷却", "再一次并射之间的等待；等级越高回得越快。")
    });

    defineDamage(twinbeamId, "ray", {});

    stages(twinbeamId, [
        { level: 32, values: { ray: 46 } },
        { level: 48, values: { ray: 53 } },
        { level: 64, values: { ray: 59 } }
    ]);

    describe(twinbeamId, [
        { key: "description.0", values: ["ray","reach"] },
        { key: "description.1", values: ["gap","resonance"] },
        { key: "resonance.on", values: [], when: function (context) { return read(context.detail.values, ["resonance"]) === true; } },
        { key: "resonance.off", values: [], when: function (context) { return read(context.detail.values, ["resonance"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ray"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ray", "resonance"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.ray"] }
    ]);
}
