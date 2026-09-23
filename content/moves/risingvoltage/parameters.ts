/**
 * 电力上升 / risingvoltage —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Electric／特殊／威力 70／命中 100／PP 20／单体；
 *   「用从地面升腾而起的电击进行攻击。当对手处于电气场地上时，招式威力会变成 2 倍」（且要求目标接地）。
 *
 * 翻译：把「从地面升腾」落成**脚下的地脉被点着**——施法者先顿足把电按进地皮（起手），电流沿地面窜到对手
 *   脚下的落点（爬行），随后从那里竖起一根电柱、从下往上把站在上面的人击穿。目标脚下的地若能导电（贴着
 *   共享身份 `world_combat:status/electricterrain` 的电荷，由电气场地铺下、或别的来源赋予），这一柱翻倍、
 *   也更粗更高。读完的是**目标脚下有没有电**，所以站在电荷上的人最危险，离开那块地就只是普通一柱。
 *   与同族分开：精神剑是贴身的一记电光斩、加成来自施法者自己脚下的电荷；电力上升是隔空从目标脚下升起的
 *   电柱、加成来自**目标**脚下的电荷，而且它是一圈地面区域，站得近的人一起被贯穿。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   bolt          电柱威力：特攻定电压；目标带电场电荷时 ×2；过载式再 ×1.2；夹 48..210。
 *   reach         射程：特攻越高够得越远；过载式更近（要把电蓄在地里）。
 *   crawl         电流爬地速度：速度决定电流窜到脚下多快。
 *   columnRadius  电柱粗细：特攻；过载式更粗。
 *   columnHeight  电柱高度：特攻；过载式更高，够得到悬空一点的目标。
 *   arcs          电弧数：特攻换算，驱动表现密度。
 *   coil／settle／recharge：速度定节奏；过载式更慢更费。
 *
 * 配置 `overcharge`（过载式）双向取舍：开＝威力 ×1.2、电柱更粗更高，但射程 ×0.85、起手 +3、冷却 +8；
 *   关（稳压式，默认）＝射得更远、更快更省，柱身更细。够得着 vs 打得穿，各有局面。
 *
 * 伤害段 `bolt`：目标脚下有电荷时的 ×2 在命中时按**每个目标自己**脚下的事实重算（见 defineDamage 的 resolve）。
 */
namespace PokemonSkills {
    export const risingvoltageId = "risingvoltage";
    export const risingvoltageScene = "world_combat:move_risingvoltage";
    export const risingvoltageChargedText = "world_combat.move.risingvoltage.text.charged";
    export const risingvoltageHitText = "world_combat.move.risingvoltage.text.hit";
    export const risingvoltageMissText = "world_combat.move.risingvoltage.text.miss";
    /** 电柱粗细的参考值（格）：服务端传 scale = 实际粗细 / 这个值。 */
    export const risingvoltageReference = 1.1;

    /** 目标脚下是否带电：共享身份 world_combat:status/electricterrain（电气场地等来源铺下的电荷）。 */
    export function risingvoltageCharged(world: CombatWorld, actor: CombatActor): boolean {
        return CombatStatus.has(world, actor, "electricterrain");
    }

    actionParameters.define(risingvoltageId, {
        /** 电柱威力：70 + 特攻偏移[−15,32]；目标带电 ×2；过载 ×1.2；夹 48..210。 */
        bolt: formula(
            F.base(70)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-15, 32))
                .times(F.when(F.target("status.electricterrain", text("worldcombat.skill.risingvoltage.value.grounded")).gt(0),
                    F.const(2), F.const(1)).as(text("worldcombat.skill.risingvoltage.value.charged")))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.risingvoltage.preference.overcharge")), F.const(1.2), F.const(1)))
                .clamp(48, 210).round(1),
            "电柱威力", {
                unit: "威力",
                description: "从地面升起那根电柱的威力；特攻越高电压越足。**目标脚下带着电场电荷时翻倍**——每个目标各算各的。对手特防、相性与暴击在命中时另算。"
            }),
        /** 射程：12 + 特攻偏移[−1,3]；过载 ×0.85；夹 8..18。也是实际射程来源。 */
        reach: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.03).clamp(-1, 3))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.risingvoltage.preference.overcharge")), F.const(0.85), F.const(1)))
                .clamp(8, 18).round(1),
            "射程", {
                unit: "格",
                description: "电流能沿地面窜到多远，也是本招的实际射程；特攻越高越远，过载式为了蓄电反而更近。"
            }),
        /** 爬地速度：2.4 + 速度偏移[−0.6,1.2]；夹 1.2..4.0。 */
        crawl: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.6, 1.2)).clamp(1.2, 4.0).round(2),
            "爬地速度", {
                unit: "格/刻",
                description: "电流沿地面窜到目标脚下的速度；决定电柱在第几刻升起，也决定画面里那条爬行电线的推进。"
            }),
        /** 电柱粗细：1.1 + 特攻偏移[−0.15,0.5]；过载 ×1.3；夹 0.9..2.4。 */
        columnRadius: formula(
            F.base(1.1).plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.15, 0.5))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.risingvoltage.preference.overcharge")), F.const(1.3), F.const(1)))
                .clamp(0.9, 2.4).round(2),
            "电柱粗细", {
                unit: "格",
                description: "电柱的判定半径，也就是会贯穿到哪一圈；特攻越高、过载式越粗，站得近的人一起被击穿。"
            }),
        /** 电柱高度：3.6 + 特攻偏移[−0.5,1.6]；过载 ×1.25；夹 3..9。 */
        columnHeight: formula(
            F.base(3.6).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.5, 1.6))
                .times(F.when(F.pref("overcharge", text("worldcombat.skill.risingvoltage.preference.overcharge")), F.const(1.25), F.const(1)))
                .clamp(3, 9).round(2),
            "电柱高度", {
                unit: "格",
                description: "电柱从地面向上冲多高；特攻越高、过载式越高，离地一点的目标也够得到。"
            }),
        /** 电弧数：18 + 特攻偏移[−6,30]；夹 12..56。 */
        arcs: formula(
            F.base(18).plus(F.stat("specialAttack").minus(60).times(0.25).clamp(-6, 30)).clamp(12, 56).round(0),
            "电弧数", {
                unit: "道",
                description: "电柱与爬行电线上窜出的电弧数量，也驱动画面密度；特攻越高越密。"
            }),
        /** 起手：9 − 速度偏移[−1.5,2] + 过载 3；夹 5..15。 */
        coil: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.risingvoltage.preference.overcharge")), F.const(3), F.const(0))).clamp(5, 15).round(0),
            "起手", "顿足把电按进地皮的时间；速度越快越短，过载式多蓄一会儿。"),
        /** 收招：8 − 速度偏移[−1.5,1.5]；夹 4..12。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.5, 1.5)).clamp(4, 12).round(0),
            "收招", "电柱落下后收势的时间；速度快的个体更利落。"),
        /** 冷却：26 − 速度偏移[−3,4] + 过载 8 / 稳压 −2；夹 18..42。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("overcharge", text("worldcombat.skill.risingvoltage.preference.overcharge")), F.const(8), F.const(-2))).clamp(18, 42).round(0),
            "冷却", "再点着一次地脉前的等待；速度越快回得越快，过载式更费。")
    });

    defineDamage(risingvoltageId, "bolt", { defenceCoefficient: 0.0048, rationale: "从下而上的电流绕开正面架势，对防御穿透略强，让电荷与特攻的差别更可见。" }, {
        // 每个人各自结算：命中时用该目标自己脚下的事实重算电柱威力，翻倍落到**这个人**身上。
        resolve: function (damage: PokemonDamage.FeatureContext) {
            return damage.facts ? { power: actionParameters.rules.formulaValue(risingvoltageId + "/bolt", damage.facts) } : undefined;
        }
    });

    stages(risingvoltageId, [
        { level: 38, values: { bolt: 84 } },
        { level: 54, values: { bolt: 98, columnRadius: 1.5 } }
    ]);

    describe(risingvoltageId, [
        { key: "description.0", values: ["bolt"] },
        { key: "description.1", values: ["reach", "crawl"] },
        { key: "description.2", values: ["columnRadius", "columnHeight"] },
        { key: "overcharge.on", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) === true; } },
        { key: "overcharge.off", values: [], when: function (context) { return read(context.detail.values, ["overcharge"]) !== true; } },
        { key: "timing", values: ["range", "coil", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bolt"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bolt", "tier.1.columnRadius"] }
    ]);
}
