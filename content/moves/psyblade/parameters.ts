/**
 * 精神剑 / psyblade —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／物理／威力 80／命中 100／PP 15／单体／接触（contact）、
 *   切斩（slicing）；「用无形的利刃劈开对手。处于电气场地时，招式威力会变成 1.5 倍」（加成来自**施法者**自己
 *   站在电气场地上）。
 *
 * 翻译：把「无形的利刃」落成一记**窄直线刺**——施法者手中凝出几乎看不见的灵刃，顺着瞄准方向直刺出去，
 *   刃锋是一条很窄的直线；自己脚下若带着电场的电荷（共享身份 `world_combat:status/electricterrain`），
 *   灵刃被电荷镀亮，威力 ×1.5，并沿同一条线再延长一段，可以把排成一列的人都刺到。离场后下一次恢复短刃，
 *   场地本身不被消耗。
 *   与同族分开：电力上升是从**锁定落点**升起的电柱；精神剑是贴着**自己**脚下的电荷直刺出去的一条窄线，
 *   不再横扫一圈，也不留放电圈。与近战切割招分开（叶刃／燕返／气旋攻击）：它的刃几乎不可见，只有一道折光。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   blade      灵刃威力：物攻定刃锋；自己脚下带电时 ×1.5；穿排式 ×0.88、聚锋式 ×1.08；夹 60..230。
 *   reach      短刃距离：速度决定压上的一步，也是未带电时的实际射程。
 *   surge      带电延展：自己脚下带电时沿同线额外延长多少；物攻与体型越大延得越远，穿排式更长。
 *   bladeHalf  刃线半宽：碰撞箱宽度决定这条线多宽；越窄越像一记刺。
 *   dashSpeed  压上速度：速度决定一步多快。
 *   push       顶开距离：物攻决定把命中的目标顶开多远。
 *   shards     灵屑量：物攻换算，驱动表现密度。
 *   tempo／settle／recharge：速度定节奏；穿排式更慢、更费。
 *
 * 配置 `extend`（穿排式）双向取舍：开＝带电延展段 ×1.3、line 更长，但威力 ×0.88、起手多 2 刻、冷却多 3 刻；
 *   关（聚锋式，默认）＝更短更重、更快，适合点名单体。穿一排 vs 破一个，各有局面。
 *
 * 伤害段 `blade` 走共享换算（原生类别 Physical，Psychic，接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const psybladeId = "psyblade";
    export const psybladeScene = "world_combat:move_psyblade";
    export const psybladeChargedText = "world_combat.move.psyblade.text.charged";
    export const psybladeCutText = "world_combat.move.psyblade.text.cut";
    export const psybladeMissText = "world_combat.move.psyblade.text.miss";
    /** 短刃距离的参考值（格）：服务端传 scale = 实际刃长 / 这个值。 */
    export const psybladeReference = 4.0;

    /** 施法者脚下是否带电：共享身份 world_combat:status/electricterrain（电气场地等来源铺下的电荷）。 */
    export function psybladeChargedNow(world: CombatWorld, actor: CombatActor): boolean {
        return CombatStatus.has(world, actor, "electricterrain");
    }

    actionParameters.define(psybladeId, {
        /** 灵刃威力：80 + 物攻偏移[−18,60]；自己带电 ×1.5；穿排 ×0.88 / 聚锋 ×1.08；夹 60..230。 */
        blade: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.55).clamp(-18, 60))
                .times(F.when(F.status("electricterrain", text("worldcombat.skill.psyblade.value.grounded")).gt(0),
                    F.const(1.5), F.const(1)).as(text("worldcombat.skill.psyblade.value.charged")))
                .times(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(0.88), F.const(1.08)))
                .clamp(60, 230).round(1),
            "灵刃威力", {
                unit: "威力",
                description: "直刺那一下的威力；物攻越高刃越利。**自己脚下带着电场电荷时 ×1.5**——加成来自施法者站的地。对手防御、相性与暴击在命中时另算。"
            }),
        /** 短刃距离：4.0 + 速度偏移[−0.5,1.6]；夹 3.2..7.5。也是未带电时的实际射程。 */
        reach: formula(
            F.base(4.0).plus(F.stat("speed").minus(55).times(0.03).clamp(-0.5, 1.6)).clamp(3.2, 7.5).round(2),
            "短刃距离", {
                unit: "格",
                description: "压上去、刺出这一刀的距离；速度快的个体迈得更远，也是未带电时的实际射程。"
            }),
        /** 带电延展：2.2 + 物攻偏移[0,2.0] + (宽度−0.9)×0.4；穿排 ×1.3 / 聚锋 ×0.85；夹 1.2..6.0。 */
        surge: formula(
            F.base(2.2)
                .plus(F.stat("attack").minus(60).times(0.02).clamp(0, 2.0))
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.2, 0.8))
                .times(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(1.3), F.const(0.85)))
                .clamp(1.2, 6.0).round(2),
            "带电延展", {
                unit: "格",
                description: "自己脚下带着电场电荷时，灵刃沿同一条线额外延长多少；物攻高、体型大的个体延得更远，穿排式更长。离场后这一段消失。"
            }),
        /** 刃线半宽：0.34 + (宽度−0.9)×0.14；夹 0.24..0.7。 */
        bladeHalf: formula(
            F.base(0.34).plus(F.body("width").minus(0.9).times(0.14).clamp(-0.06, 0.3)).clamp(0.24, 0.7).round(2),
            "刃线半宽", {
                unit: "格",
                description: "这条直刺刃线的碰撞半宽；身体越宽的个体刃线略宽，但仍是一条窄线而不是横扫。"
            }),
        /** 压上速度：0.9 + 速度偏移[−0.15,0.5]；夹 0.75..1.4。 */
        dashSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.15, 0.5)).clamp(0.75, 1.4).round(2),
            "压上速度", {
                unit: "格/刻",
                description: "一步压到对手身前的速度；越快越难在刀到之前挪开。"
            }),
        /** 顶开距离：0.2 + 物攻偏移[0,0.45]；夹 0.1..0.7。 */
        push: formula(
            F.base(0.2).plus(F.stat("attack").minus(60).times(0.0075).clamp(0, 0.45)).clamp(0.1, 0.7).round(2),
            "顶开距离", {
                unit: "格",
                description: "一刀把命中的目标沿背离方向顶开多远；物攻越高顶得越开。"
            }),
        /** 灵屑量：16 + 物攻偏移[−4,24]；自己带电 ×1.3；夹 12..48。 */
        shards: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.28).clamp(-4, 24))
                .times(F.when(F.status("electricterrain", text("worldcombat.skill.psyblade.value.grounded")).gt(0), F.const(1.3), F.const(1)))
                .clamp(12, 48).round(0),
            "灵屑量", {
                unit: "片",
                description: "刺中时迸出的灵能碎屑数量，也驱动画面密度；物攻越高、带电时越多。"
            }),
        /** 起手：6 − 速度偏移[−1.5,2] + 穿排 2；夹 3..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(2), F.const(0))).clamp(3, 12).round(0),
            "起手", "灵刃凝出、压上之前的时间；速度越快越短，穿排式蓄得稍久。"),
        /** 收招：7 − 速度偏移[−1.2,1.5]；夹 4..11。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.2, 1.5)).clamp(4, 11).round(0),
            "收招", "收刀的时间；速度快的个体更利落。"),
        /** 冷却：24 − 速度偏移[−3,4] + 穿排 3 / 聚锋 −2；夹 16..38。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(3), F.const(-2))).clamp(16, 38).round(0),
            "冷却", "再凝一把灵刃前的等待；速度越快回得越快，穿排式更费。")
    });

    defineDamage(psybladeId, "blade", { rationale: "精神力凝成的刃绕过正面架势，对防御穿透略强，让电量与物攻的差别更可见。" }, { contact: true, slice: true });

    stages(psybladeId, [
        { level: 42, values: { blade: 96 } },
        { level: 58, values: { blade: 112, surge: 3.2 } }
    ]);

    describe(psybladeId, [
        { key: "description.0", values: ["blade"] },
        { key: "description.1", values: ["reach", "dashSpeed", "bladeHalf"] },
        { key: "description.2", values: ["surge", "push"] },
        { key: "extend.on", values: [], when: function (context) { return read(context.detail.values, ["extend"]) === true; } },
        { key: "extend.off", values: [], when: function (context) { return read(context.detail.values, ["extend"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade"] },
        { key: "growth.1", values: ["tier.1.level","tier.1.blade"] }
    ]);
}
