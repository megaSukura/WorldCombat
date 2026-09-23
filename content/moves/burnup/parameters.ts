/**
 * 燃尽 / burnup —— 参数、伤害段与「自己是不是火属性」的现场判读。
 *
 * 原生事实：Fire／特殊／威力 130／命中 100／PP 5；「将自己全身燃烧起火焰来，给予对手大大的伤害。
 *   自己的火属性将会消失」（Cobblemon 1.8，15 位学习者）。
 *
 * 翻译：把身体里的火一次抽干——先向内收拢（kindle），再把整团火朝身前一个锥面喷出去（outburst），
 *   锥内的敌人都被烧到，正对的那个人吃满。喷完施法者真的**燃尽**：本单元 startup 效果
 *   `world_combat:burnup_spent`（共享身份 world_combat:status/burned_out）挂上一段时间，期间它不再带火属性
 *   （由 rules.ts 通过共享 NativeModifiers 的 types 层摘掉 fire），于是火本系加成与抗性一并消失，
 *   也**再点不着第二发燃尽**（`ready` 拒绝）。这就是这一招的代价，也是它和其他火招分开的地方。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   outburst  燃尽威力：特攻定分量、等级定层数；自己带火属性时 ×1.12（烧的是自己的本系）。
 *   reach     喷发距离：特攻；也是实际射程来源。
 *   cone      锥面张角：特攻（灵力越足喷得越开）。
 *   share     侧焰比例：特攻；锥内非正对目标吃几成。
 *   speed     焰锋速度：特攻；决定伤害与画面推进的先后。
 *   hold      燃尽时长：等级；余烬式 ×0.7（更快复燃）。
 *   ember     余烬数：特攻与等级，直接驱动画面发射量。
 *   kindle/settle/recharge 速度决定起手、收招、冷却。
 *
 * 配置 `banked`（余烬）：开启＝燃尽时长 ×0.7（更快恢复火属性）、本击 ×0.9；关闭＝烧得更久、本击 ×1.1。
 *   两向各有局面：想尽快拿回本系与抗性 vs 一次把伤害打足。
 *
 * 伤害段名 outburst：这道白焰随精灵数据变化的那部分；正对目标吃满，锥内其他目标按 share 结算。
 */
namespace PokemonSkills {
    export const burnupId = "burnup";
    export const burnupSpentEffect = "world_combat:burnup_spent";
    export const burnupScene = "world_combat:move_burnup";
    export const burnupBlastText = "world_combat.move.burnup.text.blast";
    export const burnupFizzleText = "world_combat.move.burnup.text.fizzle";
    export const burnupSpentText = "world_combat.move.burnup.text.spent";

    /** 施法者此刻是否带火属性（含 NativeModifiers 的 types 层）。 */
    export function burnupHasFireNow(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        return PokemonDamage.combatants.read(world, actor).types.indexOf("fire") >= 0;
    }

    /** 纯事实 burnup.fire：供公式与悬浮说明读取「自己带不带火」。 */
    function burnupFireFact(context: FactContext): number {
        const world = context.world, actor = context.actor;
        if (world && actor && world.valid(actor)) return burnupHasFireNow(world, actor) ? 1 : 0;
        const pokemon = context.pokemon;
        if (pokemon) for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)) === "fire") return 1;
        return 0;
    }
    defineFacts(burnupId, function (context: FactContext): Formula.Facts {
        return { read: function (id: string): Formula.Fact {
            if (id === "burnup.fire") return burnupFireFact(context);
            return undefined;
        } };
    });

    actionParameters.define(burnupId, {
        /** 燃尽威力：基础 105 + 特攻偏移[−20,44] + 等级偏移[−4,10]；带火属性 ×1.12 / 不带 ×0.9；余烬 ×0.9 / 径庭 ×1.1；夹 80..215。 */
        outburst: formula(
            F.base(105)
                .plus(F.stat("specialAttack").minus(60).times(0.34).clamp(-20, 44))
                .plus(F.level().minus(28).times(0.3).clamp(-4, 10))
                .times(F.when(F.var("burnup.fire", text("worldcombat.skill.burnup.value.ownFire")).gt(0), F.const(1.12), F.const(0.9)))
                .times(F.when(F.pref("banked", text("worldcombat.skill.burnup.preference.banked")), F.const(0.9), F.const(1.1)))
                .clamp(80, 215).round(1),
            "燃尽威力", {
                unit: "威力",
                description: "整团火喷出去的基准威力；特攻与等级越高越重，自己带火属性时再 ×1.12（烧的是自己的本系）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 喷发距离：基础 6.8 格 + 特攻偏移[−0.6,2.4]；夹 5..12；也是实际射程来源。 */
        reach: formula(
            F.base(6.8).plus(F.stat("specialAttack").minus(60).times(0.016).clamp(-0.6, 2.4)).clamp(5, 12).round(2),
            "喷发距离", {
                unit: "格",
                description: "这道白焰能喷到的最大距离，也是本招的实际射程来源；特攻越高喷得越远。"
            }),
        /** 锥面张角：基础 62 度 + 特攻偏移[−8,26]；夹 45..95。 */
        cone: formula(
            F.base(62).plus(F.stat("specialAttack").minus(60).times(0.35).clamp(-8, 26)).clamp(45, 95).round(0),
            "锥面张角", {
                unit: "度",
                description: "白焰张开的锥面总角度；特攻越高喷得越开，能扫到更多人。"
            }),
        /** 侧焰比例：基础 0.45 + 特攻偏移[−0.05,0.15]；夹 0.3..0.6。 */
        share: percent(
            F.base(0.45).plus(F.stat("specialAttack").minus(60).times(0.001).clamp(-0.05, 0.15)).clamp(0.3, 0.6),
            "侧焰比例", "锥面里非正对目标吃到的伤害比例；正对的那个吃满。"),
        /** 焰锋速度：基础 1.7 格/刻 + 特攻偏移[−0.4,1.2]；夹 1.1..3.0。 */
        speed: formula(
            F.base(1.7).plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.4, 1.2)).clamp(1.1, 3.0).round(2),
            "焰锋速度", {
                unit: "格/刻",
                description: "白焰前沿冲出去的速度；它决定伤害与画面推进的先后，特攻越高冲得越急。"
            }),
        /** 燃尽时长：基础 340 刻 + 等级偏移[0,120]；余烬 ×0.7；夹 180..620 刻。 */
        hold: seconds(
            F.base(340).plus(F.level().minus(28).times(3).clamp(0, 120))
                .times(F.when(F.pref("banked", text("worldcombat.skill.burnup.preference.banked")), F.const(0.7), F.const(1)))
                .clamp(180, 620).round(0),
            "燃尽时长", "施法者这段时间里不带火属性、也点不着第二发燃尽；等级越高烧得越久。"),
        /** 余烬数：基础 18 + 特攻偏移[0,26] + 等级偏移[0,10]；夹 14..60。 */
        ember: formula(
            F.base(18).plus(F.stat("specialAttack").minus(60).times(0.2).clamp(0, 26))
                .plus(F.level().minus(28).times(0.25).clamp(0, 10)).clamp(14, 60).round(0),
            "余烬数", {
                unit: "点",
                description: "白焰喷发时迸出的余烬数量；特攻与等级越高越多，直接驱动画面发射量。"
            }),
        /** 蓄火：8 刻 − 速度偏移[−2,3]；夹 5..12。 */
        kindle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.025).clamp(-2, 3)).clamp(5, 12).round(0),
            "蓄火", "把全身的火向内收拢需要多久；速度快的个体收得更快。"),
        /** 收招：10 刻；夹 6..16。 */
        settle: seconds(F.base(10).clamp(6, 16).round(0), "收招", "喷完之后收势的时间。"),
        /** 冷却：30 − 速度偏移[−4,6] − 余烬 4；夹 16..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.12).clamp(-4, 6))
                .minus(F.when(F.pref("banked", text("worldcombat.skill.burnup.preference.banked")), F.const(4), F.const(0))).clamp(16, 44).round(0),
            "冷却", "这一发之后多久能再蓄火；速度快的个体回得更快，余烬式留了火、回得更快。")
    });

    defineDamage(burnupId, "outburst", { defenceCoefficient: 0.005, rationale: "白焰温度极高，对防御的穿透略强于默认，让特攻差别更明显。" });

    stages(burnupId, [
        { level: 30, values: { outburst: 125 } },
        { level: 48, values: { outburst: 145, reach: 8.4 } }
    ]);

    describe(burnupId, [
        { key: "description.0", values: ["outburst"] },
        { key: "description.1", values: ["reach","cone","share","speed"] },
        { key: "description.2", values: ["hold"] },
        { key: "banked.on", values: [], when: function (context) { return read(context.detail.values, ["banked"]) === true; } },
        { key: "banked.off", values: [], when: function (context) { return read(context.detail.values, ["banked"]) !== true; } },
        { key: "timing", values: ["range", "kindle", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.outburst"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.outburst", "tier.1.reach"] }
    ]);
}
