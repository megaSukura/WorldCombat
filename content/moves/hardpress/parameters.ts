/**
 * 硬压 / hardpress —— 参数、数值来源与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：钢、物理、威力 0、命中 100、PP 10、接触、单体；
 *   威力 = ⌊目标当前 HP / 最大 HP × 100⌋（下限 1）——**对手剩余的 HP 越多，威力越大**。
 *
 * 翻译：把「用手臂或钳子压迫对手」落成**一腕从上方直压下来**——施法者抬臂，目标头顶落下一根实心的下压柱，
 *   把那块地一起压沉。它读的是**目标此刻还剩多少**：对手越完好，压下去越实；对手已经残了，这一下就轻。
 *   于是它天然是一记**开局压制**招，而非收割招。与同族分开：它唯一从**上方**来（绞紧从四周拧、捏碎从两侧合拢），
 *   也是三压招里起手最快、冷却最短的一记，靠一记接一记地压而不是单发。
 *
 * 数据分散（每个参数读不同的精灵数据）：
 *   press       压顶威力：物攻给压下去的分量，体重给落下的势头；再乘上「目标完整度」系数（满血最重、残血最轻）。
 *   pressRadius 压顶半径：碰撞箱宽度给掌面大小；双腕式把掌面摊开一倍多。
 *   sink        压沉深度：体重决定把目标向下按多深。
 *   shove       顶开距离：体重与配置一起决定沿背离方向推多远。
 *   reach       伸手距离：身高给臂长，也是实际射程来源。
 *   motes       碎屑数：物攻与体重换算，驱动画面的下压柱与碎屑量。
 *   tempo／aftercast／recharge：速度定节奏；双腕式更慢更费。
 *
 * 配置 `brace`（双腕式，默认关）双向取舍：开＝掌面半径 ×1.7、顶开 ×1.25，代价是单点威力 ×0.86、起手 +2 刻、冷却 +4 刻
 *   ——换一片压制面；关（单腕式）＝单点更重、更快，但只压得住一个目标。
 *
 * 伤害段 `press`：目标完整度在**命中时按每个目标自己的血量重算**（见 defineDamage 的 resolve）。
 */
namespace PokemonSkills {
    export const hardpressId = "hardpress";
    export const hardpressScene = "world_combat:move_hardpress";
    /** 表现里的参考半径（格）：服务端传 scale = 实际压顶半径 / 这个值。 */
    export const hardpressReference = 0.7;

    /** 「目标完整度」系数：0.32（残血）～1.0（满血）；未知读作 0.32，预览不虚高。 */
    function hardpressScale(): Formula.Node {
        return F.const(0.32).plus(
            F.target("actor.healthRatio", text("worldcombat.skill.hardpress.value.hpRatio")).times(0.68))
            .as(text("worldcombat.skill.hardpress.value.healthFactor"));
    }

    /** 命中时目标是否还有大半条血：结算与表现同源，用于选择「重压」表现强度。 */
    export function hardpressRatioNow(world: CombatWorld, actor: CombatActor): number {
        const body = world.observe(actor);
        return body === null || body.maxHealth() <= 0 ? 0 : Math.max(0, Math.min(1, body.health() / body.maxHealth()));
    }

    actionParameters.define(hardpressId, {
        /** 压顶威力：78 + 物攻偏移[−16,44] + 体重偏移[−8,36]；× 完整度(0.32..1)；双腕 ×0.86；夹 30..170。 */
        press: formula(
            F.base(78)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-16, 44))
                .plus(F.body("weight").minus(50).times(0.18).clamp(-8, 36))
                .times(hardpressScale())
                .times(F.when(F.pref("brace", text("worldcombat.skill.hardpress.preference.brace")), F.const(0.86), F.const(1)))
                .clamp(30, 170).round(1),
            "压顶威力", {
                unit: "威力",
                description: "这一压落在目标身上的威力；物攻给压下去的分量、体重给落下的势头。目标剩余生命越满，系数越高（0.32～1.0，每个人各算各的）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 压顶半径：0.55 + (宽度−0.9)×0.45[−0.12,0.5]；双腕 ×1.7；夹 0.4..1.9。 */
        pressRadius: formula(
            F.base(0.55).plus(F.body("width").minus(0.9).times(0.45).clamp(-0.12, 0.5))
                .times(F.when(F.pref("brace", text("worldcombat.skill.hardpress.preference.brace")), F.const(1.7), F.const(1)))
                .clamp(0.4, 1.9).round(2),
            "压顶半径", {
                unit: "格",
                description: "手掌／钳子压下去覆盖多大一块地；身板越宽掌面越大，双腕式把这一面摊开。判定与表现同径。"
            }),
        /** 压沉深度：0.18 + (体重−50)×0.004[−0.05,0.55]；夹 0.12..0.85。 */
        sink: formula(
            F.base(0.18).plus(F.body("weight").minus(50).times(0.004).clamp(-0.05, 0.55)).clamp(0.12, 0.85).round(2),
            "压沉深度", {
                unit: "格",
                description: "命中时把目标向地面按下去多深；身体越沉按得越实。"
            }),
        /** 顶开距离：0.28 + (体重−50)×0.003[−0.06,0.5]；双腕 ×1.25 / 单腕 ×0.9；夹 0.12..1.0。 */
        shove: formula(
            F.base(0.28).plus(F.body("weight").minus(50).times(0.003).clamp(-0.06, 0.5))
                .times(F.when(F.pref("brace", text("worldcombat.skill.hardpress.preference.brace")), F.const(1.25), F.const(0.9)))
                .clamp(0.12, 1.0).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中后把目标沿背离方向推开多远；身体越沉推得越远，双腕式推得更开。"
            }),
        /** 伸手距离：2.1 + (高度−1.4)×0.35[−0.2,0.6]；夹 1.7..3.0。 */
        reach: formula(
            F.base(2.1).plus(F.body("height").minus(1.4).times(0.35).clamp(-0.2, 0.6)).clamp(1.7, 3.0).round(2),
            "伸手距离", {
                unit: "格",
                description: "这一腕能够到多远，也是本招的实际射程来源；体型越高大伸得越远。"
            }),
        /** 碎屑数：14 + 物攻偏移[−4,16] + 体重偏移[−2,10]；夹 10..44。 */
        motes: formula(
            F.base(14).plus(F.stat("attack").minus(60).times(0.22).clamp(-4, 16))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-2, 10)).clamp(10, 44).round(0),
            "碎屑数", {
                unit: "点",
                description: "下压柱与落地碎屑的数量，驱动画面密度；物攻越高、身体越沉溅得越多。"
            }),
        /** 起手：7 − (速度−55)×0.02[−1.5,2]；双腕 +2；夹 4..13。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.hardpress.preference.brace")), F.const(2), F.const(0)))
                .clamp(4, 13).round(0),
            "起手", "抬臂到手臂落下的时间；速度越快越短，双腕式要多起一势。"),
        /** 收招：6 − (速度−55)×0.015[−1,1.5]；夹 4..10。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-1, 1.5)).clamp(4, 10).round(0),
            "收招", "压完收回手腕的时间；速度快的个体更利落。"),
        /** 冷却：22 − (等级−20)×0.08[0,4]；双腕 +4；夹 14..34。 */
        recharge: seconds(
            F.base(22).minus(F.level().minus(20).times(0.08).clamp(0, 4))
                .plus(F.when(F.pref("brace", text("worldcombat.skill.hardpress.preference.brace")), F.const(4), F.const(0)))
                .clamp(14, 34).round(0),
            "冷却", "再压一记前的等待；等级越高回得越快，双腕式更费。")
    });

    defineDamage(hardpressId, "press", { defenceCoefficient: 0.0045,
        rationale: "钢属性的硬压对护甲穿透略强，让「压满血目标」的差别更可见。" }, {
        contact: true,
        // 每个目标各自结算：命中时用该目标自己的血量重算压顶威力，完整度系数落到**这个人**身上。
        resolve: function (damage: PokemonDamage.FeatureContext) {
            return damage.facts ? { power: actionParameters.rules.formulaValue(hardpressId + "/press", damage.facts) } : undefined;
        }
    });

    stages(hardpressId, [
        { level: 28, values: { press: 34 } },
        { level: 46, values: { press: 42, pressRadius: 0.8 } }
    ]);

    describe(hardpressId, [
        { key: "description.0", values: ["press"] },
        { key: "description.1", values: ["pressRadius", "sink", "shove"] },
        { key: "description.2", values: ["reach"] },
        { key: "brace.on", values: [], when: function (context) { return read(context.detail.values, ["brace"]) === true; } },
        { key: "brace.off", values: [], when: function (context) { return read(context.detail.values, ["brace"]) !== true; } },
        { key: "timing", values: ["prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.press"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.press", "tier.1.pressRadius"] }
    ]);
}
