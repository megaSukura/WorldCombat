/**
 * 三重攻击 / triattack —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8，45 位学习者）：Normal／特殊／威力 80／命中 100／PP 10／单体／
 *   次要：20% 让目标陷入灼伤、麻痹、冰冻三者之一（各 1/3）。原生描述：「用３种光线进行攻击。」
 *
 * 核心念头：三种颜色的光线**依次**离手、各走各的，命中后各掷各的元素余痕——火留灼、冰留冻、电留麻；
 *   它和同族十万伏特（一发打出去、命中处炸开）不同，三是这一招的形状本身。
 *
 * 世界化：把「三束光线」翻成一排三发的扇形齐射。集束式（默认）三束依次锁同一目标，三发各结算，
 *   三束各掷一次元素余痕；广域式让三束各自找身边最多三个不同的敌人，覆盖更广，代价是每束更轻、余痕机会略低。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数上）：
 *   ray            每束威力：特攻定光线强度、等级定熟练；广域 ×0.85 / 集束 ×1.04；夹 18..52。三束合计约等于原生 80。
 *   ailmentChance  每束元素余痕几率：特攻；集束 ×1.1 / 广域 ×0.85；夹 0.10..0.32。
 *   ailmentTicks   余痕时长：特攻决定穿透力。
 *   flightSpeed    光线飞行速度：速度。
 *   homing         追踪转向：特攻；只够修正走位。
 *   fan            广域式的张角：特攻。
 *   fanRadius      广域式找身边目标的半径：身高。
 *   reach          射程：等级＋特攻。
 *   motes          每束爆开的碎光数：特攻；驱动表现数量。
 *   impactRadius   每束命中的爆开半径：身高；驱动表现尺寸。
 *   rays           每次齐射几束（原生 3），固定。
 *   tempo／aftercast／recharge  速度与等级定节奏；广域式多压一拍、冷得稍久。
 *
 * 配置 `wide`（广域式）双向取舍：开＝三束分散给身边最多三个不同敌人、整体覆盖广，代价是每束 ×0.85、
 *   余痕几率 ×0.85、起手 +1 刻、冷却 ×1.15；关＝集束式，三束打同一目标、单点 ×1.04、余痕几率 ×1.1。
 *
 * 伤害段 `ray` 与参数同名，走共享换算（原生类别 Special，Normal 属性）；命中、防御、相性与暴击在命中时另算。
 * 元素余痕经 `impact(..., { status, chance })` 落到任何目标上：火→灼伤、冰→冰冻、电→麻痹。
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const triattackId = "triattack";
    export const triattackScene = "world_combat:move_triattack";
    export const triattackReference = 0.6;
    export const triattackSalvoText = "world_combat.move.triattack.text.salvo";
    export const triattackFizzleText = "world_combat.move.triattack.text.fizzle";

    actionParameters.define(triattackId, {
        /** 每束威力：28 + (特攻−60)×0.13（夹 −5..15）+ (等级−25)×0.18（夹 0..9）；广域 ×0.85 / 集束 ×1.04；夹 18..52。 */
        ray: formula(
            F.base(28)
                .plus(F.stat("specialAttack").minus(60).times(0.13).clamp(-5, 15))
                .plus(F.level().minus(25).times(0.18).clamp(0, 9))
                .times(F.when(F.pref("wide"), F.const(0.85), F.const(1.04)))
                .clamp(18, 52).round(1),
            "每束威力", {
                base: 28,
                unit: "威力",
                description: "三束光线里每一束命中时的威力（三束同发）；特攻越高越强、等级越高越熟，集束式把三束都压在同一目标上。对手特防、相性与暴击在命中时另算。"
            }),
        /** 余痕几率：0.20 + (特攻−60)×0.0008（夹 0..0.06）；广域 ×0.85 / 集束 ×1.1；夹 0.10..0.32。 */
        ailmentChance: percent(
            F.base(0.20)
                .plus(F.stat("specialAttack").minus(60).times(0.0008).clamp(0, 0.06))
                .times(F.when(F.pref("wide"), F.const(0.85), F.const(1.1)))
                .clamp(0.10, 0.32).round(3),
            "余痕几率", "每一束命中后让目标陷入该元素状态（火→灼伤、冰→冰冻、电→麻痹）的几率；特攻越高越容易留下，集束式略高、广域式略低。"),
        /** 余痕时长：200 + (特攻−60)×0.4（夹 −20..60）；夹 140..300 刻。 */
        ailmentTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-20, 60)).clamp(140, 300).round(0),
            "余痕时长", "留下来的元素状态持续多久；特攻决定光线穿透力。"),
        /** 飞行速度：1.15 + (速度−60)×0.006（夹 −0.15..0.3）；夹 0.9..1.5。 */
        flightSpeed: formula(
            F.base(1.15).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.15, 0.3)).clamp(0.9, 1.5).round(2),
            "光线速度", {
                unit: "格/刻",
                description: "三束光线离手后飞行的速度；速度快的个体出手更干脆，画面里拖尾也更密。"
            }),
        /** 追踪转向：3.0 + (特攻−60)×0.012（夹 −0.5..1.5）；夹 1.8..5.0。 */
        homing: formula(
            F.base(3.0).plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.5, 1.5)).clamp(1.8, 5.0).round(2),
            "追踪转向", {
                unit: "度/刻",
                description: "每束光线每刻朝目标修正的幅度；只够修正走位，大幅度横向甩开仍然能躲。"
            }),
        /** 广域张角：26 + (特攻−60)×0.06（夹 −4..10）；夹 18..40 度。 */
        fan: formula(
            F.base(26).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(-4, 10)).clamp(18, 40).round(0),
            "广域张角", {
                unit: "度",
                description: "广域式下三束光线分开的角度；特攻越高分得越开，能罩住的横向范围越大。集束式不使用它。"
            }),
        /** 广域半径：3.5 + (身高−1.4)×0.7（夹 −0.3..1.2）；夹 2.5..5.5 格。 */
        fanRadius: formula(
            F.base(3.5).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.3, 1.2)).clamp(2.5, 5.5).round(2),
            "广域半径", {
                unit: "格",
                description: "广域式下能在主目标周围多大范围里各找一束的落点；个子越高罩得越开。它也是画面里三束分开的范围。"
            }),
        /** 射程：9 + (等级−25)×0.05（夹 0..2）+ (特攻−60)×0.015（夹 −0.8..1.5）；夹 7..13 格。 */
        reach: formula(
            F.base(9)
                .plus(F.level().minus(25).times(0.05).clamp(0, 2))
                .plus(F.stat("specialAttack").minus(60).times(0.015).clamp(-0.8, 1.5))
                .clamp(7, 13).round(2),
            "射程", {
                unit: "格",
                description: "三束光线能锁到多远的敌人；等级越高、特攻越强够得越远。它也是本招的实际射程。"
            }),
        /** 碎光数：24 + (特攻−60)×0.25（夹 0..18）；夹 18..48 个。 */
        motes: formula(
            F.base(24).plus(F.stat("specialAttack").minus(60).times(0.25).clamp(0, 18)).clamp(18, 48).round(0),
            "碎光数", {
                unit: "个",
                description: "每束光线爆开时散出的碎光数量，由特攻换算；它驱动表现密度，不是独立伤害。"
            }),
        /** 爆开半径：0.6 + (身高−1.4)×0.2（夹 −0.1..0.5）；夹 0.45..1.2 格。 */
        impactRadius: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.1, 0.5)).clamp(0.45, 1.2).round(2),
            "爆开半径", {
                unit: "格",
                description: "每一束命中时炸开的范围；个高的个体炸得更开。它是画面尺寸，命中范围仍是光线本身。"
            }),
        rays: hidden(3),
        /** 齐射间隔：13 − (速度−60)×0.03（夹 −2..4）；夹 11..18 刻（不低于命中无敌帧，三束各算各的）。 */
        gap: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 4)).clamp(11, 18).round(0),
            "齐射间隔", "三束之间隔多久离手；不低于命中无敌帧（11 刻），保证每一束都单独结算、各自掷一次余痕。速度快的个体收得更紧，整轮更快打完。"),
        /** 起手：10 − (速度−60)×0.02（夹 −1.5..2）+ 广域 1；夹 6..14 刻。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("wide"), F.const(1), F.const(0)))
                .clamp(6, 14).round(0),
            "起手", "把三种光线在掌心分别压成束的时间；速度越快越短，广域式要多压一拍。"),
        /** 收招：8 − (速度−60)×0.02（夹 −1.5..2）；夹 5..12 刻。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 2)).clamp(5, 12).round(0),
            "收招", "三束出手后收掌的时间；速度越快越利落。"),
        /** 冷却：34 − (等级−25)×0.15（夹 0..8）；广域 ×1.15；夹 20..52 刻。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(25).times(0.15).clamp(0, 8))
                .times(F.when(F.pref("wide"), F.const(1.15), F.const(1)))
                .clamp(20, 52).round(0),
            "冷却", "两次齐射之间的等待；等级越高回得越快，广域式缓得更久。")
    });

    defineCategory(triattackId, "special");
    defineDamage(triattackId, "ray", {});

    stages(triattackId, [
        { level: 38, values: { ray: 34 } },
        { level: 52, values: { ray: 40, ailmentChance: 0.26 } }
    ]);

    describe(triattackId, [
        { key: "description.0", values: ["ray","ailmentChance"] },
        { key: "description.ailments", values: ["ailmentTicks"] },
        { key: "description.1", values: ["reach", "flightSpeed", "homing"] },
        { key: "description.2", values: ["gap", "tempo", "recharge"] },
        { key: "wide.on", values: ["fanRadius"], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ray"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ray", "tier.1.ailmentChance"] }
    ]);
}
