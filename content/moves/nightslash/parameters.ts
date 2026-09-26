/**
 * 暗袭要害 / nightslash —— 参数、伤害段与「对手正忙着别人」的现场判读。
 *
 * 原生事实（Cobblemon 1.8，118 位学习者）：Dark／物理／威力 70／命中 100／PP 15／接触、切斩（slicing）／
 *   critRatio 2（暴击率高出一档）。原生描述：「抓住瞬间的空隙切斩对手，容易击中要害。」
 *
 * 翻译：即时战斗里没有「空隙」这个回合概念，本实现把它落成一个可观察的事实——命中那一刻，**目标正把矛头
 *   对着别人**（`world.observe(target).attacking()` 指向的不是施法者）：它把空门露在这一侧，这一刀因此更重。
 *   形状上是一记**身前窄斜切的短距离 trace**：朝本次瞄准方向递出一条窄刀路，刀口从肩侧斜下，落到第一个真实接触
 *   （实体或方块）就停；不移动本体、不跨障碍指定伤害，刀线只沿这次手动朝向。
 *   原生的「容易击中要害」沿用 critRatio 2 的共享结算。
 *   与既有招分开：出奇一击是闪到背后并放假替身、燕返是掠一整条刀路，暗袭要害**不动**，只在对手露空门时加重；
 *   与 karatechop（找护甲的缝）、assurance（打刚受过的伤）也不是同一件事——它读的是目标的注意力。
 *
 * 数值分散（每个参数读不同的精灵数据；公式即悬浮里展开的那一棵）：
 *   cut     暗袭威力：物攻定刃口，速度定出手；目标正对别人出手时 ×1.4（伏击式 ×1.75）。
 *   reach   出手距离：速度决定窄刀路递出多远，也是本招实际射程。
 *   depth   斩深：身高决定这一刀压到多高。
 *   motes   影屑量：物攻与速度换算，驱动表现密度。
 *   tempo／aftercast／recharge：速度定节奏；伏击式以更长的起手与冷却换更远的出手与更高的空隙加成。
 *
 * 配置 `ambush`（伏击式）双向取舍（默认关）：
 *   开（伏击）：空隙加成 ×1.75、出手距离 ×1.2，代价是威力 ×0.90、起手 +2 刻、冷却 +6 刻——专等对手露空门。
 *   关（疾斩）：威力 ×1.12、起手更短、冷却 −4 刻，空隙加成 ×1.4——不等破绽、稳定输出。
 *
 * 伤害段 `cut`：影线尽头的接触斩击，走共享换算（原生类别 Physical，Dark 属性）。
 */
namespace PokemonSkills {
    export const nightslashId = "nightslash";
    export const nightslashScene = "world_combat:move_nightslash";
    export const nightslashCritText = "world_combat.move.nightslash.text.crit";
    export const nightslashSeamText = "world_combat.move.nightslash.text.seam";
    export const nightslashHitText = "world_combat.move.nightslash.text.hit";
    export const nightslashMissText = "world_combat.move.nightslash.text.miss";
    /** 表现里斩深的参考值（格）；服务端传 scale = 实际斩深 / 这个值。 */
    export const nightslashReference = 1.1;

    /** 命中目标此刻是否把攻击对着别人（不是施法者）：1 即空门。显式 target 优先于动作的对象。 */
    export function nightslashOpening(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !world.valid(actor)) return 0;
        const target = context.target !== undefined
            ? (context.target ? context.target.actor || null : null)
            : (context.action ? context.action.target() : null);
        if (!target || !world.valid(target) || world.friendly(target)) return 0;
        const body = world.observe(target);
        if (body === null) return 0;
        const busy = body.attacking();
        return busy !== null && String(busy.ref()) !== String(actor.ref()) ? 1 : 0;
    }

    defineFacts(nightslashId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "nightslash.opening") return nightslashOpening(context);
            return undefined;
        } };
    });

    actionParameters.define(nightslashId, {
        /** 暗袭威力：70 + (物攻−55)×0.26（夹 −14..34）+ (速度−55)×0.10（夹 −4..12）；
         *  伏击 ×0.90 / 疾斩 ×1.12；空门 ×1.75（伏击）或 ×1.4（疾斩）；夹 48..150。 */
        cut: formula(
            F.base(70)
                .plus(F.stat("attack").minus(55).times(0.26).clamp(-14, 34))
                .plus(F.stat("speed").minus(55).times(0.10).clamp(-4, 12))
                .times(F.when(F.pref("ambush", text("worldcombat.skill.nightslash.preference.ambush")), F.const(0.90), F.const(1.12)))
                .times(F.when(F.var("nightslash.opening", { key: "worldcombat.skill.nightslash.value.opening", fallback: "空门" }).gt(0),
                    F.when(F.pref("ambush", text("worldcombat.skill.nightslash.preference.ambush")), F.const(1.75), F.const(1.4)), F.const(1)))
                .clamp(48, 150).round(1),
            "暗袭威力", {
                unit: "威力",
                description: "影线尽头那一刀的接触威力；物攻给出刃口、速度给出出手。目标正把攻击对着别人时更重（空门）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 出手距离：2.6 + (速度−55)×0.008（夹 −0.4..0.7）；伏击 ×1.2；夹 2.0..3.6 格。它也是实际射程。 */
        reach: formula(
            F.base(2.6).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.4, 0.7))
                .times(F.when(F.pref("ambush", text("worldcombat.skill.nightslash.preference.ambush")), F.const(1.2), F.const(1)))
                .clamp(2.0, 3.6).round(2),
            "出手距离", {
                unit: "格",
                description: "身前窄刀路能够出多远；速度越快够得越前，伏击式更远。它也是本招的实际射程来源。"
            }),
        /** 斩深：1.1 + (身高−1.4)×0.4（夹 −0.2..0.6）；夹 0.8..1.9 格。 */
        depth: formula(
            F.base(1.1).plus(F.body("height").minus(1.4).times(0.4).clamp(-0.2, 0.6)).clamp(0.8, 1.9).round(2),
            "斩深", {
                unit: "格",
                description: "这一刀从脚上压到多高；高大的个体切得更深，画面里那道暗痕就有多长。"
            }),
        /** 影屑量：20 + (物攻−55)×0.3（夹 −4..26）+ (速度−55)×0.15（夹 −3..8）；夹 14..52 个。 */
        motes: formula(
            F.base(20)
                .plus(F.stat("attack").minus(55).times(0.3).clamp(-4, 26))
                .plus(F.stat("speed").minus(55).times(0.15).clamp(-3, 8))
                .clamp(14, 52).round(0),
            "影屑量", {
                unit: "个",
                description: "影线牵起与劈开时卷起的暗色碎屑数量，由物攻与速度换算；它驱动表现，不是独立伤害。"
            }),
        /** 起手：7 − (速度−55)×0.03（夹 −2..4）；伏击 +2 / 疾斩 −1；夹 4..12 刻。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("ambush", text("worldcombat.skill.nightslash.preference.ambush")), F.const(2), F.const(-1))).clamp(4, 12).round(0),
            "起手", "伏低蓄势、把影线牵到对手身前的时间；速度越快越短，伏击式更久。"),
        /** 收招：6 − (速度−55)×0.02（夹 −2..2）；夹 3..10 刻。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2)).clamp(3, 10).round(0),
            "收招", "刀收回来的时间；速度越快越利落。"),
        /** 冷却：26 − (速度−55)×0.04（夹 −4..6）；伏击 +6 / 疾斩 −4；夹 16..40 刻。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 6))
                .plus(F.when(F.pref("ambush", text("worldcombat.skill.nightslash.preference.ambush")), F.const(6), F.const(-4))).clamp(16, 40).round(0),
            "冷却", "再次牵起影线前等待多久；伏击式更长，疾斩式更短。")
    });

    defineDamage(nightslashId, "cut", {}, { contact: true, slice: true });

    stages(nightslashId, [
        { level: 30, values: { cut: 80 } },
        { level: 48, values: { cut: 88, reach: 3.2 } }
    ]);

    describe(nightslashId, [
        { key: "description.0", values: ["cut"] },
        { key: "description.1", values: ["reach"] },
        { key: "stance.ambush", values: [], when: function (context) { return read(context.detail.values, ["ambush"]) === true; } },
        { key: "stance.swift", values: [], when: function (context) { return read(context.detail.values, ["ambush"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cut"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cut", "tier.1.reach"] }
    ]);
}
