/**
 * 弹跳 / bounce —— 参数与数值来源。
 *
 * 原生事实：Flying、物理、威力 85、命中 85、PP 5、接触；蓄力一回合（期间免疫大多数招式），第二回合落下攻击，
 * 30% 概率使目标陷入麻痹（Cobblemon 1.8）。
 *
 * 世界化：即时战斗里没有回合，本实现把「两回合」翻成一段紧凑的原地弹跳——蹲身压地、笔直弹起、
 * 最高点短暂悬停一下（贴地近战够不着）、再沿着落点斜坠砸下。它和飞翔同族但形状相反：飞翔是「爬上高空、
 * 横掠战场、再竖直俯冲」，弹跳是「竖直弹起、斜线坠落」，没有滑翔、也没有重新锁定的机会；起跳那一刻的
 * 落点就钉死了，目标走开就砸空。落地那一下把弹跳的劲灌进目标，有机会把它麻住。头顶的天花板决定能弹多高：
 * 开阔处弹满、坠得最重，屋檐或洞穴压顶时只能低跳。
 *
 * 数值来源（每个参数读不同的精灵数据，公式即悬浮说明里展开的那一棵）：
 *   leap         = 基础 85 + (物攻 − 70) × 0.25（夹 −15..35）；重落式再 ×1.18；等级台阶抬档。
 *   hopHeight    = 基础 3.2 + (碰撞箱高度 − 1.4) × 0.9 + (速度 − 55) × 0.015；弹起式 ×1.15、重落式 ×0.8。
 *   hopDistance  = 基础 3.6 + (速度 − 55) × 0.02 格：本招实际射程的来源；弹起式 ×1.15、重落式 ×0.9。
 *   riseSpeed    = 基础 0.5 + (速度 − 55) × 0.005 格/刻。
 *   hangTicks    = 基础 8 − (速度 − 55) × 0.04 刻：弹起式 +4、重落式 −3；速度快悬停短。
 *   fallSpeed    = 基础 1.0 + (速度 − 55) × 0.007 格/刻。
 *   impactRadius = 基础 0.9 + (碰撞箱高度 − 1.4) × 0.3 格；重落式 ×1.2。
 *   paralyzeChance = 基础 0.16 + (速度 − 55) × 0.0022；重落式 ×1.15。
 *   paralyzeTicks  = 基础 90 + 等级 × 1.6 刻；重落式 ×1.1。
 *   press        = 基础 0.4 + 体重 × 0.00015 格，命中把目标向下压的距离。
 *   push         = 基础 0.5 + 体重 × 0.0002 格，命中把目标推开的距离。
 *   tempo／settle／recharge：起手随速度缩短，重落式更慢、更久。
 * 实际高度 = min(hopHeight, 头顶第一块非空气方块前的净空)；这一击的轻重再乘一个高度系数
 *   heightFactor = 0.62 + 0.38 × 实际高度 / 目标高度：天花板压顶时最轻只剩六成多。
 * 伤害段名 leap；落地视作接触命中，麻痹经 impact 的 status 路由落到任何目标上。
 */
namespace PokemonSkills {
    export const bounceId = "bounce";
    export const bounceScene = "world_combat:move_bounce";
    export const bounceAirborne = "world_combat:bounce_airborne";
    export const bounceLandText = "world_combat.move.bounce.text.land";
    export const bounceWhiffText = "world_combat.move.bounce.text.whiff";
    export const bounceParalyzeText = "world_combat.move.bounce.text.paralyze";
    /** 表现里的参考半径：`data.scale = 实际落地半径 / 这个数`，让地面冲击环与判定同半径。 */
    export const bounceReferenceRadius = 0.9;

    /** 头顶到第一块非空气方块之间的净空（身体中心能升多高）；开阔时返回 limit。 */
    export function bounceHeadroom(world: CombatWorld, body: CombatObservation, limit: number): number {
        const pos = body.position(), top = pos.y() + body.height() * 0.5;
        const steps = Math.ceil(limit * 2) + 2;
        for (let step = 0; step <= steps; step++) {
            const block = world.block(WorldCombat.point(pos.x(), top + step * 0.5, pos.z()));
            if (block !== null && String(block.id()).indexOf("air") < 0) return Math.max(0, step * 0.5 - 0.4);
        }
        return limit;
    }

    actionParameters.define(bounceId, {
        /** 落地威力：85 + (物攻 − 70) × 0.25，夹 64..150；重落式 ×1.18。 */
        leap: formula(
            F.base(85)
                .plus(F.stat("attack").minus(70).times(0.25).clamp(-15, 35))
                .times(F.when(F.pref("crush"), F.const(1.18), F.const(1)))
                .clamp(60, 150).round(1),
            "落地威力", {
                unit: "威力",
                description: "从空中砸下的基础威力；物攻越高砸得越沉。重落式把这一击加重，弹起式更轻但更安全。对手防御、相性与暴击在命中时另算。"
            }),
        /** 弹跳高度：3.2 + (碰撞箱高度 − 1.4) × 0.9 + (速度 − 55) × 0.015 格，夹 2.4..6.5。 */
        hopHeight: formula(
            F.base(3.2)
                .plus(F.body("height").minus(1.4).times(0.9))
                .plus(F.stat("speed").minus(55).times(0.015).clamp(-0.5, 1.8))
                .times(F.when(F.pref("crush"), F.const(0.8), F.const(1.15)))
                .clamp(2.4, 6.5).round(2),
            "弹跳高度", {
                unit: "格",
                description: "想弹多高；体型越大、速度越快弹得越高。弹起式弹得更高更久，重落式压低弹道直接下砸。头顶净空不足时会只弹到天花板下方，这一击随之变轻。"
            }),
        /** 落点距离：3.6 + (速度 − 55) × 0.02 格，夹 1.8..6.0，也是本招射程的来源。 */
        hopDistance: formula(
            F.base(3.6)
                .plus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.8))
                .times(F.when(F.pref("crush"), F.const(0.9), F.const(1.15)))
                .clamp(1.8, 6.0).round(2),
            "落点距离", {
                unit: "格",
                description: "朝目标弹出的最远水平距离，也是本招实际射程的来源；速度快的个体扑得更远。起跳那一刻落点就锁死了。"
            }),
        /** 上升速度：0.5 + (速度 − 55) × 0.005 格/刻，夹 0.3..1.0。 */
        riseSpeed: formula(
            F.base(0.5).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.4)).clamp(0.3, 1.0).round(3),
            "上升速度", {
                unit: "格/刻",
                description: "弹起的快慢；速度越快越早到顶，越少给对手反应时间。"
            }),
        /** 悬停时间：8 − (速度 − 55) × 0.04 刻，弹起式 +4、重落式 −3，夹 2..16。 */
        hangTicks: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("crush"), F.const(-3), F.const(4)))
                .clamp(2, 16).round(0),
            "悬停时间", "在最高点停留多久；速度快停留短。悬停期间贴地近战够不着，但远程打得中，这段时间目标可以走位。"),
        /** 坠落速度：1.0 + (速度 − 55) × 0.007 格/刻，夹 0.6..1.7。 */
        fallSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.2, 0.6)).clamp(0.6, 1.7).round(2),
            "坠落速度", {
                unit: "格/刻",
                description: "沿落点斜坠的快慢；越快越难在落地前侧移躲开。"
            }),
        /** 落地判定半径：0.9 + (碰撞箱高度 − 1.4) × 0.3 格，重落式 ×1.2，夹 0.7..1.8。 */
        impactRadius: formula(
            F.base(0.9)
                .plus(F.body("height").minus(1.4).times(0.3))
                .times(F.when(F.pref("crush"), F.const(1.2), F.const(1)))
                .clamp(0.7, 1.8).round(2),
            "落地判定半径", {
                unit: "格",
                description: "落地能扫到多大一圈；身体越高大越大，重落式砸得更开。"
            }),
        /** 麻痹概率：0.16 + (速度 − 55) × 0.0022，重落式 ×1.15，夹 0.08..0.42。 */
        paralyzeChance: percent(
            F.base(0.16)
                .plus(F.stat("speed").minus(55).times(0.0022).clamp(-0.06, 0.2))
                .times(F.when(F.pref("crush"), F.const(1.15), F.const(1)))
                .clamp(0.08, 0.42).round(3),
            "麻痹概率", "落地那一下的震劲有多大机会把目标麻住；速度越快、砸得越重，概率越高。"),
        /** 麻痹时长：90 + 等级 × 1.6 刻，重落式 ×1.1，夹 80..320。 */
        paralyzeTicks: seconds(
            F.base(90).plus(F.level().times(1.6))
                .times(F.when(F.pref("crush"), F.const(1.1), F.const(1)))
                .clamp(80, 320).round(0),
            "麻痹时长", "被震麻后持续多久；等级越高的个体震得越久，重落式再久一点。"),
        /** 下压距离：0.4 + 体重 × 0.00015 格，夹 0.3..0.9。 */
        press: formula(
            F.base(0.4).plus(F.body("weight").times(0.00015).clamp(0, 0.5)).clamp(0.3, 0.9).round(2),
            "下压距离", {
                unit: "格",
                description: "命中后把目标向下压进地面的距离；体重越大压得越实。"
            }),
        /** 推开距离：0.5 + 体重 × 0.0002 格，夹 0.3..1.1。 */
        push: formula(
            F.base(0.5).plus(F.body("weight").times(0.0002).clamp(0, 0.6)).clamp(0.3, 1.1).round(2),
            "推开距离", {
                unit: "格",
                description: "落地冲击把命中的目标沿水平方向推开的距离；体重越大推得越远。"
            }),
        /** 起手：6 − (速度 − 55) × 0.02 刻，重落式 +2，夹 4..11。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 3))
                .plus(F.when(F.pref("crush"), F.const(2), F.const(0))).clamp(4, 11).round(0),
            "起手", "蹲身压地到弹起之间的时间；速度快的个体压得更急，重落式先压低重心。"),
        /** 收招：7 刻，重落式 +4，夹 5..16。 */
        settle: seconds(
            F.base(7).plus(F.when(F.pref("crush"), F.const(4), F.const(0))).clamp(5, 16).round(0),
            "收招", "落定后收住的时间；重落式砸得更深、起身更慢。"),
        /** 冷却：30 − (速度 − 55) × 0.12 刻，重落式 +8，夹 18..50。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .plus(F.when(F.pref("crush"), F.const(8), F.const(0))).clamp(18, 50).round(0),
            "冷却", "两次弹跳之间的等待；速度快回得更快，重落式更费。"),
        maxTargets: n(4, "最多命中数"),
        traceAhead: hidden(1.3),
        minimumMove: hidden(0.05)
    });

    defineDamage(bounceId, "leap", {}, { contact: true });

    stages(bounceId, [
        { level: 32, values: { leap: 100 } },
        { level: 48, values: { leap: 116 } }
    ]);

    describe(bounceId, [
        { key: "description.0", values: ["leap","maxTargets","press","push"] },
        { key: "description.1", values: ["hopHeight", "hopDistance"] },
        { key: "description.2", values: ["hangTicks","impactRadius","paralyzeChance","paralyzeTicks"] },
        { key: "description.3", values: [] },
        { key: "crush.on", values: [], when: function (context) { return read(context.detail.values, ["crush"]) === true; } },
        { key: "crush.off", values: [], when: function (context) { return read(context.detail.values, ["crush"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.leap"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.leap"] }
    ]);
}
