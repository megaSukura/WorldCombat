/**
 * 精神剑 / psyblade —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Psychic／物理／威力 80／命中 100／PP 15／单体／接触（contact）、
 *   切斩（slicing）；「用无形的利刃劈开对手。处于电气场地时，招式威力会变成 1.5 倍」（加成来自**施法者**自己
 *   站在电气场地上）。
 *
 * 翻译：把「无形的利刃」落成一记**电光一闪的贴身穿刺斩**——施法者手中先凝出一把几乎看不见的灵刃（只在
 *   空气里留下一道折光），一步压到对手身上横向劈开，刃锋扫过身前一段弧；自己脚下若带着电场的电荷
 *   （共享身份 `world_combat:status/electricterrain`），灵刃被电荷镀亮，威力 ×1.5，斩痕里窜出电弧。
 *   与同族分开：电力上升是从**目标**脚下升起的电柱；精神剑是贴着**自己**脚下的电荷贴身斩出的一刀。
 *   与近战切割招分开（叶刃／燕返／气旋攻击）：精神剑的刃几乎不可见，只有一道折光与斩痕，加成也来自地形。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   blade      灵刃威力：物攻定刃锋；自己脚下带电时 ×1.5；延展式 ×0.88、聚锋式 ×1.08；夹 60..230。
 *   reach      贴身距离：速度决定压上的一步能迈多远，也是实际射程。
 *   dashSpeed  压上速度：速度决定一步多快。
 *   span       挥斩张角：碰撞箱宽度决定弧有多大；延展式更宽。
 *   echo       波及比例：刃风扫到旁人时吃几成。
 *   push       顶开距离：物攻决定把主目标顶开多远。
 *   shards     灵屑量：物攻换算，驱动表现密度。
 *   tempo／settle／recharge：速度定节奏；延展式更慢、更费。
 *
 * 配置 `extend`（延展式）双向取舍：开＝挥斩张角 ×1.2、波及比例 +0.08，但威力 ×0.88；关（聚锋式，默认）
 *   ＝更窄更重、更快，适合点名单体。扫一排 vs 破一个，各有局面。
 *
 * 伤害段 `blade` 走共享换算（原生类别 Physical，Psychic，接触，带 slice 标记）。
 */
namespace PokemonSkills {
    export const psybladeId = "psyblade";
    export const psybladeScene = "world_combat:move_psyblade";
    export const psybladeChargedText = "world_combat.move.psyblade.text.charged";
    export const psybladeCutText = "world_combat.move.psyblade.text.cut";
    export const psybladeEchoText = "world_combat.move.psyblade.text.echo";
    export const psybladeMissText = "world_combat.move.psyblade.text.miss";
    export const psybladeReference = 3.0;

    /** 施法者脚下是否带电：共享身份 world_combat:status/electricterrain（电气场地等来源铺下的电荷）。 */
    export function psybladeChargedNow(world: CombatWorld, actor: CombatActor): boolean {
        return CombatStatus.has(world, actor, "electricterrain");
    }

    actionParameters.define(psybladeId, {
        /** 灵刃威力：80 + 物攻偏移[−18,60]；自己带电 ×1.5；延展 ×0.88 / 聚锋 ×1.08；夹 60..230。 */
        blade: formula(
            F.base(80)
                .plus(F.stat("attack").minus(60).times(0.55).clamp(-18, 60))
                .times(F.when(F.status("electricterrain", text("worldcombat.skill.psyblade.value.grounded")).gt(0),
                    F.const(1.5), F.const(1)).as(text("worldcombat.skill.psyblade.value.charged")))
                .times(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(0.88), F.const(1.08)))
                .clamp(60, 230).round(1),
            "灵刃威力", {
                unit: "威力",
                description: "贴身横挥那一下的威力；物攻越高刃越利。**自己脚下带着电场电荷时 ×1.5**——加成来自施法者站的地。对手防御、相性与暴击在命中时另算。"
            }),
        /** 贴身距离：4.0 + 速度偏移[−0.5,1.6]；夹 3.2..7.5。也是实际射程来源。 */
        reach: formula(
            F.base(4.0).plus(F.stat("speed").minus(55).times(0.03).clamp(-0.5, 1.6)).clamp(3.2, 7.5).round(2),
            "贴身距离", {
                unit: "格",
                description: "压上去、劈出这一刀的距离；速度快的个体迈得更远，也是本招的实际射程。"
            }),
        /** 压上速度：0.9 + 速度偏移[−0.15,0.5]；夹 0.75..1.4。 */
        dashSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.15, 0.5)).clamp(0.75, 1.4).round(2),
            "压上速度", {
                unit: "格/刻",
                description: "一步压到对手身前的速度；越快越难在刀到之前挪开。"
            }),
        /** 挥斩张角：104 + (宽度−0.9)×26；延展 ×1.2 / 聚锋 ×0.9；夹 70..175。 */
        span: formula(
            F.base(104).plus(F.body("width").minus(0.9).times(26).clamp(-10, 40))
                .times(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(1.2), F.const(0.9)))
                .clamp(70, 175).round(0),
            "挥斩张角", {
                unit: "度",
                description: "这一刀扫过的扇形角度；身体越宽的个体挥出的弧越大，延展式更宽、聚锋式更窄。"
            }),
        /** 波及比例：0.4 + 延展 +0.08 / 聚锋 −0.04；夹 0.2..0.65。 */
        echo: formula(
            F.base(0.4).plus(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(0.08), F.const(-0.04)))
                .clamp(0.2, 0.65).round(2),
            "波及比例", {
                unit: "倍",
                description: "刃风扫到近旁其他敌人时吃主伤几成的威力；延展式挥得更开、波及更足。"
            }),
        /** 波及上限：固定 2。 */
        echoCap: hidden(2),
        /** 顶开距离：0.2 + 物攻偏移[0,0.45]；夹 0.1..0.7。 */
        push: formula(
            F.base(0.2).plus(F.stat("attack").minus(60).times(0.0075).clamp(0, 0.45)).clamp(0.1, 0.7).round(2),
            "顶开距离", {
                unit: "格",
                description: "一刀把主目标沿背离方向顶开多远；物攻越高顶得越开。"
            }),
        /** 灵屑量：16 + 物攻偏移[−4,24]；自己带电 ×1.3；夹 12..48。 */
        shards: formula(
            F.base(16).plus(F.stat("attack").minus(60).times(0.28).clamp(-4, 24))
                .times(F.when(F.status("electricterrain", text("worldcombat.skill.psyblade.value.grounded")).gt(0), F.const(1.3), F.const(1)))
                .clamp(12, 48).round(0),
            "灵屑量", {
                unit: "片",
                description: "斩中时迸出的灵能碎屑数量，也驱动画面密度；物攻越高、带电时越多。"
            }),
        /** 起手：6 − 速度偏移[−1.5,2] + 延展 2；夹 3..12。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(2), F.const(0))).clamp(3, 12).round(0),
            "起手", "灵刃凝出、压上之前的时间；速度越快越短，延展式蓄得稍久。"),
        /** 收招：7 − 速度偏移[−1.2,1.5]；夹 4..11。 */
        settle: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.2, 1.5)).clamp(4, 11).round(0),
            "收招", "收刀的时间；速度快的个体更利落。"),
        /** 冷却：24 − 速度偏移[−3,4] + 延展 3 / 聚锋 −2；夹 16..38。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("extend", text("worldcombat.skill.psyblade.preference.extend")), F.const(3), F.const(-2))).clamp(16, 38).round(0),
            "冷却", "再凝一把灵刃前的等待；速度越快回得越快，延展式更费。")
    });

    defineDamage(psybladeId, "blade", { rationale: "精神力凝成的刃绕过正面架势，对防御穿透略强，让电量与物攻的差别更可见。" }, { contact: true, slice: true });

    stages(psybladeId, [
        { level: 42, values: { blade: 96 } },
        { level: 58, values: { blade: 112, span: 118 } }
    ]);

    describe(psybladeId, [
        { key: "description.0", values: ["blade"] },
        { key: "description.1", values: ["reach", "dashSpeed", "span"] },
        { key: "description.2", values: ["echo", "push"] },
        { key: "extend.on", values: [], when: function (context) { return read(context.detail.values, ["extend"]) === true; } },
        { key: "extend.off", values: [], when: function (context) { return read(context.detail.values, ["extend"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blade"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blade", "tier.1.span"] }
    ]);
}
