/**
 * 飞身重压 / flyingpress 的参数与伤害段。
 *
 * 原生事实：Fighting／Physical／威力 100／命中 95／PP 10／contact＋gravity＋distance／nonsky。
 *   它同时算格斗与飞行两种属性（onEffectiveness 把飞行相性加到格斗相性上），飞行属性使用者也能吃到本系。
 *
 * 翻译：把「从空中俯冲压在对手身上」翻成一次**短距离跃起 → 从上方压下来**的重压。它是「垂直轴」里
 *   唯一按自身体重结算、且专打空中的近身招：跃到一个目标头上、用身体压下来，命中时若目标离地就把它
 *   一并按到地面上；走地的目标挨一记重压并被撞开。
 *
 * 双属性是这招的身份，用两个自定义事实把它接进共享结算：
 *   type.flyingFactor —— 目标对飞行属性的相性乘积（可能 0.25/0.5/1/2/4）；共享结算再乘一次格斗相性，
 *     两者相乘即原生的「格斗×飞行」。
 *   type.flyingStab   —— 使用者是飞行属性且不是格斗属性时给 1.5；是格斗属性时共享结算已经给了本系，
 *     这里返回 1，避免双本系叠成 2.25。
 *   没有目标（详情页悬浮）时两者都按中性 1 处理，只影响命中时的实际结算。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   press       重压威力 100 + 物攻偏移 + **自身体重**偏移；高空配置再乘一档，命中时若目标离地 ×1.2。
 *   leapHeight  跃起高度 3.2 格 + 施法者身高偏移。
 *   leapSpeed   上升速度 0.55 格/刻 + 速度偏移。
 *   diveSpeed   俯冲速度 1.0 格/刻 + 速度偏移。
 *   pressRadius 压击判定 0.9 格 + 体型高度偏移。
 *   reach       施放距离 6 格 + 速度 + 等级。
 *   push        撞开距离 0.4 格 + 自身体重偏移。
 *
 * 配置 `highDive`（高空压顶）：开启＝跃得更高（+1.2 格）、重压 ×1.12、俯冲更快，起手 +2 刻、冷却 +8 刻；
 *   关闭（低空快压）＝贴地压过去、重压 ×0.92、收手更快。
 *
 * 伤害段 `press` 与参数同名，走共享换算（原生类别 Physical、属性 Fighting、contact）。
 */
namespace PokemonSkills {
    defineFacts("flyingpress", function (context) {
        function typeList(world: CombatWorld | null | undefined, actor: CombatActor | null | undefined): string[] | null {
            if (!world || !actor) return null;
            try { return PokemonDamage.combatants.read(world, actor).types; } catch (error) { return null; }
        }
        function targetActor(): CombatActor | null {
            if (context.target) return context.target.actor || null;
            if (context.action) return context.action.target();
            return null;
        }
        return { read: function (id: string): Formula.Fact {
            if (id === "type.flyingFactor") {
                const list = typeList(context.world, targetActor());
                if (list === null || !list.length) return 1;
                let factor = 1;
                for (let i = 0; i < list.length; i++) factor *= CobblemonCombat.typeEffectiveness("flying", String(list[i]));
                return isFinite(factor) && factor > 0 ? factor : 1;
            }
            if (id === "type.flyingStab") {
                const own = typeList(context.world, context.actor);
                if (own === null) return 1;
                return own.indexOf("flying") >= 0 && own.indexOf("fighting") < 0 ? 1.5 : 1;
            }
            return undefined;
        } };
    });

    actionParameters.define("flyingpress", {
        /** 重压威力：100 + 物攻偏移[−15,30] + 自身体重偏移[−6,32]；高空 ×1.12 / 快压 ×0.92；离地目标 ×1.2；夹 70..190。 */
        press: formula(
            F.base(100)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-15, 30))
                .plus(F.body("weight").minus(300).times(0.06).clamp(-6, 32))
                .times(F.when(F.pref("highDive"), F.const(1.12), F.const(0.92)))
                .times(F.when(F.target("actor.grounded", { key: "worldcombat.skill.flyingpress.value.airborne", fallback: "空中目标" }), F.const(1), F.const(1.2)))
                .times(F.var("type.flyingFactor", { key: "worldcombat.skill.flyingpress.value.flyingFactor", fallback: "飞行相性" }))
                .times(F.var("type.flyingStab", { key: "worldcombat.skill.flyingpress.value.flyingStab", fallback: "飞行本系" }))
                .clamp(70, 190).round(1),
            "重压威力", { base: 100,
                unit: "威力",
                description: "从上方压下来那一下的威力；物攻越高、身体越沉压得越重。命中离地目标更重；本招同时算格斗与飞行相性，飞行属性使用者另有本系。对手防御、相性与暴击在命中时另算。"
            }),
        /** 跃起高度：3.2 + 身高偏移[−0.3,1.2] + 高空 1.2；夹 2.4..5.5 格。 */
        leapHeight: formula(
            F.base(3.2)
                .plus(F.body("height").minus(1.4).times(0.8).clamp(-0.3, 1.2))
                .plus(F.when(F.pref("highDive"), F.const(1.2), F.const(0)))
                .clamp(2.4, 5.5).round(2),
            "跃起高度", { base: 3.2,
                unit: "格",
                description: "跃到多高再压下来；身量越高、高空配置跃得越高，也越难在半空被拦。"
            }),
        /** 上升速度：0.55 + 速度偏移[−0.1,0.35]；夹 0.35..1.0 格/刻。 */
        leapSpeed: formula(
            F.base(0.55).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.1, 0.35)).clamp(0.35, 1.0).round(2),
            "上升速度", {
                unit: "格/刻",
                description: "跃起爬升的快慢；速度快的个体更快到位。"
            }),
        /** 俯冲速度：1.0 + 速度偏移[−0.2,0.6]；高空 ×1.1；夹 0.6..1.8 格/刻。 */
        diveSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.6))
                .times(F.when(F.pref("highDive"), F.const(1.1), F.const(1.0)))
                .clamp(0.6, 1.8).round(2),
            "俯冲速度", {
                unit: "格/刻",
                description: "从空中压下来的速度；速度快的个体更难在落地前侧移躲开，高空配置更快。"
            }),
        /** 压击判定：0.9 + 体型高度偏移[−0.15,0.5]；夹 0.7..1.6 格。 */
        pressRadius: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.15, 0.5)).clamp(0.7, 1.6).round(2),
            "压击判定", {
                unit: "格",
                description: "落地那一下能压到多大一圈；身体越高大越大。"
            }),
        /** 施放距离：6 + 速度偏移[−0.5,1.2] + 等级偏移[0,1.5]；夹 4..9 格。 */
        reach: formula(
            F.base(6).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.5, 1.2))
                .plus(F.level().minus(25).times(0.04).clamp(0, 1.5))
                .clamp(4, 9).round(1),
            "施放距离", {
                unit: "格",
                description: "能跃到多远的目标头上；速度与等级提高距离。它也是本招的实际射程来源。"
            }),
        /** 撞开距离：0.4 + 自身体重偏移[0,0.6]；夹 0.2..1.0 格。 */
        push: formula(
            F.base(0.4).plus(F.body("weight").minus(300).times(0.0006).clamp(0, 0.6)).clamp(0.2, 1.0).round(2),
            "撞开距离", {
                unit: "格",
                description: "压中后把目标沿水平方向撞开的距离；身体越沉撞得越远。"
            }),
        crush: hidden(0.3),
        traceAhead: hidden(1.5)
    });

    defineDamage("flyingpress", "press", {}, { contact: true });

    stages("flyingpress", [
        { level: 32, values: { press: 116 } },
        { level: 50, values: { press: 130, leapHeight: 3.8 } }
    ]);

    describe("flyingpress", [
        { key: "description.0", values: ["press"] },
        { key: "description.1", values: ["leapHeight", "leapSpeed", "diveSpeed"] },
        { key: "description.2", values: ["pressRadius", "push"] },
        { key: "dive.on", values: [], when: function (context) { return read(context.detail.values, ["highDive"]) === true; } },
        { key: "dive.off", values: [], when: function (context) { return read(context.detail.values, ["highDive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.press"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.press", "tier.1.leapHeight"] }
    ]);
}
