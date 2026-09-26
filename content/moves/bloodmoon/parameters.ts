/**
 * 血月 / bloodmoon —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**一般**／特殊／威力 140／命中 100／PP 5／`cantusetwice`（无法连续使出 2 次）。
 *   介绍：「从赤红如血的满月发射出全部的气势。这个招式无法连续使出2次。」全项目仅 1 位学习者：月月熊（血月形态）。
 *
 * 翻译：把「从赤红如血的满月倾泻全部气势」落成一记**前推月束**——施法者先凝神召出一轮赤红如血的满月悬在身前上方，
 *   再让满月把全部气势推成一道粗直的月光束、沿锁定的方向射出去：光束先打中最靠前的首敌（`moonlight`），再按
 *   同一条线穿透有限个后排敌人（`spill`）。光束被方块截住，不会穿墙，也不会在原地炸出一圈。`cantusetwice`
 *   翻成**气势耗尽窗口**：放完之后短时间内不能再次召月，期间换成别的招式会让气势提前平息（`spent`）。
 *
 * 数据分散（每一项读不同的精灵数据，小差距才会在场上看得出来）：
 *   moonlight  首敌威力：特攻（气势有多满）＋等级；月蚀式为分给穿透而略降。
 *   spill      同线后排威力：特攻；光锥铺开时后方也吃一份。
 *   reach      月束长度：特攻＋等级；也是本招实际射程来源，实际会被方块提前截断。
 *   beamRadius 月束粗细：特攻（控制聚焦）＋碰撞箱宽度（身架越宽推得越粗）；月蚀式更粗。
 *   pierce     同线后伤上限：等级；月蚀式更多。有限，不会沿整条线无限穿透。
 *   charge     凝神起手：速度（聚气快慢）与等级；月蚀式更短。
 *   motes      月光点数：特攻，直接驱动粒子发射量。
 *   recover    收招：体重（越重越难平复）。
 *   recharge   冷却：等级。
 *   spent      禁复时长：速度与等级（气势越快平息，越早能再次召月）。
 *
 * 配置 `eclipse`（月蚀式，默认关）双向取舍：关闭（满月式）＝月束更细、只打首敌与少量后排，主目标满威力；
 *   开启（月蚀式）＝月束更粗、同线穿透更多后排，起手更短，代价是主目标威力 ×0.85。两向各有适用局面：
 *   点杀厚血用满月式，打成一列用月蚀式。
 *
 * 伤害段 moonlight／spill：首敌结算 `moonlight`，同线后排各自结算 `spill`；规格空
 *   （共享结算乘入特攻、对手特防、相性与暴击）。
 */
namespace PokemonSkills {
    export const bloodmoonId = "bloodmoon";
    export const bloodmoonScene = "world_combat:move_bloodmoon";
    export const bloodmoonFallText = "world_combat.move.bloodmoon.text.fall";
    export const bloodmoonSpentText = "world_combat.move.bloodmoon.text.spent";

    actionParameters.define(bloodmoonId, {
        /** 首敌威力：基础 140，特攻每比 80 多 1 加 0.5（夹 -12..55），等级每比 40 高 1 加 0.5（夹 0..12）；满月 ×1 / 月蚀 ×0.85；夹 110..215。 */
        moonlight: formula(
            F.base(140)
                .plus(F.stat("specialAttack").minus(80).times(0.5).clamp(-12, 55))
                .plus(F.level().minus(40).times(0.5).clamp(0, 12))
                .times(F.when(F.pref("eclipse"), F.const(0.85), F.const(1)))
                .clamp(110, 215).round(1),
            "首敌威力", {
                unit: "威力",
                description: "月束打在最靠前那个非友方身上的特殊威力；特攻越高气势越满，等级越高落得越重。月蚀式为铺开而略降。对手特防、相性与暴击在命中时另算。"
            }),
        /** 同线后排威力：基础 78，特攻每比 80 多 1 加 0.35（夹 -10..40）；夹 40..130。 */
        spill: formula(
            F.base(78).plus(F.stat("specialAttack").minus(80).times(0.35).clamp(-10, 40)).clamp(40, 130).round(1),
            "同线后排威力", {
                unit: "威力",
                description: "月束穿透到首敌身后的其他非友方各自结算的特殊威力；特攻越高越强。最多穿透的个数由「同线后伤上限」决定。"
            }),
        /** 月束长度：基础 11 格，特攻每比 80 多 1 加 0.02（夹 -1..2.5），等级每比 40 高 1 加 0.08（夹 0..2.5）；夹 8..16，遇方块会提前截断。 */
        reach: formula(
            F.base(11)
                .plus(F.stat("specialAttack").minus(80).times(0.02).clamp(-1, 2.5))
                .plus(F.level().minus(40).times(0.08).clamp(0, 2.5)).clamp(8, 16).round(1),
            "月束长度", {
                unit: "格",
                description: "月光束能射多远；特攻与等级越高射得越远。它也是本招的实际射程来源，但会被方块挡下、不会穿墙。"
            }),
        /** 月束粗细：基础 0.5 格，特攻每比 80 多 1 加 0.003（夹 -0.1..0.25），身宽每比 0.9 宽 1 格加 0.3（夹 -0.1..0.4）；满月 ×1 / 月蚀 ×1.4；夹 0.3..1.2。 */
        beamRadius: formula(
            F.base(0.5)
                .plus(F.stat("specialAttack").minus(80).times(0.003).clamp(-0.1, 0.25))
                .plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.4))
                .times(F.when(F.pref("eclipse"), F.const(1.4), F.const(1))).clamp(0.3, 1.2).round(2),
            "月束粗细", {
                unit: "格",
                description: "月光束的判定半宽；特攻越高越聚焦，身架越宽推得越粗。月蚀式明显更粗。画面里那道光束的宽度就是判定宽度。"
            }),
        /** 同线后伤上限：基础 1 个，等级每比 40 高 1 加 0.03（夹 0..1）；满月 ×1 / 月蚀 ×2；夹 0..4 个。 */
        pierce: formula(
            F.base(1).plus(F.level().minus(40).times(0.03).clamp(0, 1))
                .times(F.when(F.pref("eclipse"), F.const(2), F.const(1))).clamp(0, 4).round(0),
            "同线后伤上限", {
                unit: "个",
                description: "月束穿过首敌后，还能沿同一条线打中几个后排非友方；等级越高越多，月蚀式翻倍，但始终有限。"
            }),
        /** 凝神起手：基础 30 刻，速度每比 60 快 1 减 0.12（夹 -4..8），等级每比 40 高 1 减 0.2（夹 0..5）；月蚀 −6；夹 16..44。 */
        charge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.12).clamp(-4, 8))
                .minus(F.level().minus(40).times(0.2).clamp(0, 5))
                .plus(F.when(F.pref("eclipse"), F.const(-6), F.const(0))).clamp(16, 44).round(0),
            "凝神起手", "召出满月、把全身气势聚起来的时间；速度越快、等级越高越短。月蚀式更短，但铺得散。"),
        /** 月光点数：基础 22，特攻每比 80 多 1 加 0.18（夹 -5..20）；夹在 16..48。 */
        motes: formula(
            F.base(22).plus(F.stat("specialAttack").minus(80).times(0.18).clamp(-5, 20)).clamp(16, 48).round(0),
            "月光点数", {
                unit: "点",
                description: "月束与命中处溅起的月光点数，随特攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 收招：基础 14 刻，体重每比 100 重 1 加 0.02（夹 -2..6）；夹 8..26。 */
        recover: seconds(
            F.base(14).plus(F.body("weight").minus(100).times(0.02).clamp(-2, 6)).clamp(8, 26).round(0),
            "收招", "倾泻完之后把气势收回来、落回站姿的时间；越重的身体越难平复。"),
        /** 冷却：基础 40 刻，等级每比 40 高 1 减 0.3（夹 0..10）；夹 24..50。 */
        recharge: seconds(
            F.base(40).minus(F.level().minus(40).times(0.3).clamp(0, 10)).clamp(24, 50).round(0),
            "冷却", "两次召月之间的动作冷却；等级越高回得越快。真正的限制是下面的禁复时长。"),
        /** 禁复时长：基础 100 刻，速度每比 60 快 1 减 0.4（夹 -8..20），等级每比 40 高 1 减 0.8（夹 0..16）；夹 60..160。 */
        spent: seconds(
            F.base(100).minus(F.stat("speed").minus(60).times(0.4).clamp(-8, 20))
                .minus(F.level().minus(40).times(0.8).clamp(0, 16)).clamp(60, 160).round(0),
            "禁复时长", "放完之后气势耗尽、不能马上再次召月的时间（原生「无法连续使出2次」）；速度越快、等级越高越早平息。期间换成任何别的招式都会让气势提前平复。")
    });

    defineDamage(bloodmoonId, "moonlight", {});
    defineDamage(bloodmoonId, "spill", {});

    stages(bloodmoonId, [
        { level: 50, values: { moonlight: 158, spill: 88 } },
        { level: 70, values: { moonlight: 176, spill: 98, beamRadius: 0.7 } }
    ]);

    describe(bloodmoonId, [
        { key: "description.0", values: ["moonlight", "spill", "reach"] },
        { key: "description.beam", values: ["beamRadius", "pierce"] },
        { key: "description.1", values: ["charge", "recover", "recharge"] },
        { key: "description.2", values: ["spent"] },
        { key: "eclipse.on", values: [], when: function (context) { return read(context.detail.values, ["eclipse"]) === true; } },
        { key: "eclipse.off", values: [], when: function (context) { return read(context.detail.values, ["eclipse"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.moonlight", "tier.0.spill"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.moonlight", "tier.1.spill", "tier.1.beamRadius"] }
    ]);
}
