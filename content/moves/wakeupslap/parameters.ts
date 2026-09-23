/**
 * 唤醒巴掌 / wakeupslap —— 参数与伤害段。
 *
 * 原生事实：Fighting／物理／威力 70／命中 100／PP 10／接触；「给予睡眠状态下的对手较大的伤害。
 *   但相反对手会从睡眠中醒过来」（Cobblemon 1.8，39 位学习者）。
 *
 * 翻译：一记**带整段扑步的重掌**——施法者先后撤抽臂、再一步压上去，把睡着的对手一掌拍醒。
 *   这一招读的是**目标此刻的睡眠**：睡着时威力翻倍，命中后目标被惊起（这个「醒」在共享规则里
 *   所有伤害都会触发，本招额外留下一段短促的惊醒僵直作为这一记的痕迹）。它比清醒（读麻痹、快而轻）
 *   更慢、更重，够得也更近。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   slap       重掌威力：物攻定分量、等级定层数；目标睡眠 ×2；余震式 ×0.85 / 聚掌式 ×1.08。
 *   lunge      扑击距离：速度；也是实际射程来源。
 *   step       每刻位移：速度。
 *   collisionRadius 判定半径：体型高度。
 *   push       拍退距离：物攻。
 *   startle    惊醒僵直：等级（醒来后短促的减速）。
 *   shockRadius 余震半径：物攻与体型高度。
 *   shockShare 余震比例：配置余震开时 0.4、关时 0（不开就不扩散）。
 *   dust/sparks 尘屑与惊醒火花：体重与等级，直接驱动画面发射量。
 *   grit/settle/recharge 速度决定起手、收招、冷却。
 *
 * 配置 `shock`（余震）：开启＝拍击震出一圈余波，把 `shockRadius` 内的其他敌人也拍中（按 `shockShare`）、
 *   并同样拍醒其中的睡眠者，但本击 ×0.85、冷却 +4 刻；关闭＝一记聚掌，本击 ×1.08。两向各有局面：
 *   一次震醒一片 vs 把一个人打重。
 *
 * 伤害段名 slap：这一掌随精灵数据变化的那部分；目标睡眠时的 ×2 在命中时按目标自己的睡眠结算。
 */
namespace PokemonSkills {
    export const wakeupslapId = "wakeupslap";
    export const wakeupslapScene = "world_combat:move_wakeupslap";
    export const wakeupslapWakeText = "world_combat.move.wakeupslap.text.wake";
    export const wakeupslapHitText = "world_combat.move.wakeupslap.text.hit";
    export const wakeupslapShockText = "world_combat.move.wakeupslap.text.shock";
    export const wakeupslapMissText = "world_combat.move.wakeupslap.text.miss";

    /** 目标此刻是否睡着；翻倍与惊醒都读它。 */
    export function wakeupslapSleeping(world: CombatWorld, actor: CombatActor): boolean {
        return world.valid(actor) && CombatStatus.has(world, actor, "sleep");
    }

    actionParameters.define(wakeupslapId, {
        /** 重掌威力：基础 62 + 物攻偏移[−16,36] + 等级偏移[−4,10]；目标睡眠 ×2；余震 ×0.85 / 聚掌 ×1.08；夹 42..170。 */
        slap: formula(
            F.base(62)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-16, 36))
                .plus(F.level().minus(28).times(0.3).clamp(-4, 10))
                .times(F.when(F.target("status.sleep", text("worldcombat.skill.wakeupslap.value.asleep")).gt(0), F.const(2), F.const(1)).as(text("worldcombat.skill.wakeupslap.value.wakeup")))
                .times(F.when(F.pref("shock", text("worldcombat.skill.wakeupslap.preference.shock")), F.const(0.85), F.const(1.08)))
                .clamp(42, 170).round(1),
            "重掌威力", {
                unit: "威力",
                description: "这一掌的基准威力；物攻与等级越高越重。**目标正睡眠时翻倍**。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑击距离：基础 3.6 格 + 速度偏移[−0.4,1.2]；夹 3.2..5.4；也是实际射程来源。 */
        lunge: formula(
            F.base(3.6).plus(F.stat("speed").minus(55).times(0.014).clamp(-0.4, 1.2)).clamp(3.2, 5.4).round(2),
            "扑击距离", {
                unit: "格",
                description: "从撤臂到压上的总位移，也是本招的实际射程来源；腿快的个体够得更远。"
            }),
        /** 每刻位移：基础 0.95 格/刻 + 速度偏移[−0.15,0.4]；夹 0.7..1.5。 */
        step: formula(
            F.base(0.95).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.15, 0.4)).clamp(0.7, 1.5).round(2),
            "压上速度", {
                unit: "格/刻",
                description: "压上去每刻移动的距离；越快越打得睡着的人措手不及。"
            }),
        /** 判定半径：基础 0.34 格 + 高度偏移[−0.06,0.26]；夹 0.3..0.6。 */
        collisionRadius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.09).clamp(-0.06, 0.26)).clamp(0.3, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "这一掌能拍中多大一圈；身板大的个体掌面更宽。"
            }),
        /** 拍退距离：基础 0.2 格 + 物攻偏移[−0.04,0.3]；夹 0.15..0.65。 */
        push: formula(
            F.base(0.2).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.04, 0.3)).clamp(0.15, 0.65).round(2),
            "拍退距离", {
                unit: "格",
                description: "命中后把目标拍开一点的距离；物攻高的个体拍得更远。"
            }),
        /** 惊醒僵直：16 刻 + 等级偏移[0,10]；夹 12..34 刻（被拍醒后短促的减速）。 */
        startle: seconds(
            F.base(16).plus(F.level().minus(28).times(0.15).clamp(0, 10)).clamp(12, 34).round(0),
            "惊醒僵直", "睡着的目标被拍醒后还会僵立多久；等级越高这一下震得越久。"),
        /** 余震半径：基础 1.8 格 + 物攻偏移[0,0.8] + 高度偏移[0,0.4]；夹 1.5..3.2。 */
        shockRadius: formula(
            F.base(1.8).plus(F.stat("attack").minus(60).times(0.008).clamp(0, 0.8))
                .plus(F.body("height").minus(1.4).times(0.2).clamp(0, 0.4)).clamp(1.5, 3.2).round(2),
            "余震半径", {
                unit: "格",
                description: "余震式拍击震开的范围；物攻越高、身板越大，震得越广。"
            }),
        /** 余震比例：余震式 0.4 / 聚掌式 0（不扩散）。 */
        shockShare: percent(
            F.when(F.pref("shock", text("worldcombat.skill.wakeupslap.preference.shock")), F.const(0.4), F.const(0)).clamp(0, 0.6),
            "余震比例", "余震式下，半径内其他敌人吃到的伤害比例；聚掌式为 0、完全不扩散。"),
        /** 尘屑数：基础 12 + 体重偏移[−3,14] + 等级偏移[0,4]；夹 8..28。 */
        dust: formula(
            F.base(12).plus(F.body("weight").minus(300).times(0.02).clamp(-3, 14))
                .plus(F.level().minus(28).times(0.1).clamp(0, 4)).clamp(8, 28).round(0),
            "尘屑数", {
                unit: "撮",
                description: "掌风与顿足扬起的尘屑数量；体重与等级越大越多，直接驱动画面发射量。"
            }),
        /** 惊醒火花：基础 6 + 等级偏移[0,6]；夹 4..14（目标醒来时迸出的白星）。 */
        sparks: formula(
            F.base(6).plus(F.level().minus(28).times(0.18).clamp(0, 6)).clamp(4, 14).round(0),
            "惊醒火花", {
                unit: "枚",
                description: "目标从睡眠中被震醒时迸出的火花数；等级越高越密。"
            }),
        /** 起手：6 刻 − 速度偏移[−2,2]；夹 4..9。 */
        grit: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-2, 2)).clamp(4, 9).round(0),
            "起手", "从撤臂到出手之间的时间；速度快的个体起得更快。"),
        /** 收招：8 刻；夹 5..12。 */
        settle: seconds(F.base(8).clamp(5, 12).round(0), "收招", "拍完收住的时间。"),
        /** 冷却：24 − 速度偏移[−3,5] + 余震 4；夹 15..36。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.10).clamp(-3, 5))
                .plus(F.when(F.pref("shock", text("worldcombat.skill.wakeupslap.preference.shock")), F.const(4), F.const(0))).clamp(15, 36).round(0),
            "冷却", "这一掌之后多久能再拍；速度快的个体回得更快，余震式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(wakeupslapId, "slap", {}, { contact: true });

    stages(wakeupslapId, [
        { level: 27, values: { slap: 76 } },
        { level: 44, values: { slap: 90, lunge: 3.4 } }
    ]);

    describe(wakeupslapId, [
        { key: "description.0", values: ["slap"] },
        { key: "description.1", values: ["lunge", "step", "collisionRadius", "push"] },
        { key: "description.2", values: ["startle", "shockRadius", "shockShare"] },
        { key: "shock.on", values: [], when: function (context) { return read(context.detail.values, ["shock"]) === true; } },
        { key: "shock.off", values: [], when: function (context) { return read(context.detail.values, ["shock"]) !== true; } },
        { key: "timing", values: ["range", "grit", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slap"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slap", "tier.1.lunge"] }
    ]);
}
