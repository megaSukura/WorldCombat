/**
 * 杂技 / acrobatics —— 第 026 组「以持有物为材料的一击」。
 *
 * 机制与数值来源：
 * - 原生（Cobblemon 1.8 / Showdown）：威力 55、飞行、物理、命中 100、PP 15、接触；自身没有携带道具时威力翻倍。
 * - 即时战斗翻译：一次轻巧的腾身翻滚——空手时身体更轻，翻得更远、砸得更重；带着道具时只是普通的一记飞身撞击。
 *   它与同族另外三招的区别在于：本招不碰对手的东西，力量来自“自己手里什么都没有”。
 * - 参数分散到精灵数据：威力取速度（翻得轻）与物攻，突进距离、每刻位移与命中后的穿过距离取速度，判定半径取体型高度，
 *   顶开取体重；火花数量取速度。空手翻倍由一个自定义纯事实 `acrobatics.bare` 给出，预览与命中读同一份。
 * 配置 sweep（长掠）：突进更远、穿过更多，代价是本击略轻、收招更久；关闭则贴身翻滚、本击更重。
 *
 * 伤害段名 roll：这一翻随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    export interface AcrobaticsHeld { id: string; pokemon: CombatPokemon | null; }
    /** 自身的“持有物”：宝可梦取原生持有物，其他生物取主手装备（只读）。空手是空手。 */
    export function acrobaticsHeldOf(world: CombatWorld, actor: CombatActor): AcrobaticsHeld | null {
        if (!world.valid(actor)) return null;
        if (String(actor.domain()) === "cobblemon") {
            var id = String(CobblemonCombat.pokemon(actor).heldItem());
            return id ? { id: id, pokemon: CobblemonCombat.pokemon(actor) } : null;
        }
        var worn = world.equipment(actor);
        for (var i = 0; i < worn.length; i++) if (String(worn[i].slot()) === "mainhand") return { id: String(worn[i].item()), pokemon: null };
        return null;
    }
    /** 空手判据；现场不足时退回原生个体事实，供详情页展开。 */
    export function acrobaticsBare(context: any): boolean {
        if (context.world && context.actor && context.world.valid(context.actor)) return acrobaticsHeldOf(context.world, context.actor) === null;
        var pokemon: CombatPokemon | null = context.pokemon || context.attributes && context.attributes.pokemon || null;
        return !(pokemon && String(pokemon.heldItem()));
    }
    defineFacts("acrobatics", function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "acrobatics.bare") return acrobaticsBare(context) ? 1 : 0;
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "acrobatics.bare") return undefined;
                return { value: acrobaticsBare(context) ? 1 : 0, label: { key: "worldcombat.skill.acrobatics.value.bare" }, terms: [] };
            }
        };
    });

    actionParameters.define("acrobatics", {
        /** 翻滚威力：速度每比 60 多 1 加 0.30（夹 -10..+26），物攻每比 55 多 1 加 0.30（夹 -10..+28）；空手 ×2，长掠 ×0.9、贴身 ×1.1；夹在 28..132。 */
        roll: formula(
            F.base(55)
                .plus(F.stat("speed").minus(60).times(0.30).clamp(-10, 26))
                .plus(F.stat("attack").minus(55).times(0.30).clamp(-10, 28))
                .times(F.when(F.pref("sweep"), F.const(0.9), F.const(1.1)))
                .times(F.when(F.var("acrobatics.bare", { key: "worldcombat.skill.acrobatics.value.bare", fallback: "空手加成" }), F.const(2.0), F.const(1.0)))
                .clamp(28, 132).round(1),
            "翻滚威力", {
                unit: "威力",
                description: "这一翻随精灵数据变化的那部分：速度让身体更轻，物攻给出撞上去的狠度；自身没有携带道具时翻倍（命中前由现场判定）。对手防御、相性与暴击在命中时另算。"
            }),
        /** 起跳时间：速度每比 60 多 1 减 0.012 秒（下限 2 秒），夹在 2..4 秒。 */
        charge: seconds(
            F.base(3).minus(F.stat("speed").minus(60).max(0).times(0.012)).clamp(2, 4).round(0),
            "起跳时间", "腾身之前的起手；身法越快起得越短。"),
        /** 突进距离：速度每比 60 多 1 加 0.022 格（夹 -0.4..+1.8）；长掠 ×1.3、贴身 ×0.85；夹在 2.2..5.6 格。 */
        reach: formula(
            F.base(3.0).plus(F.stat("speed").minus(60).times(0.022).clamp(-0.4, 1.8))
                .times(F.when(F.pref("sweep"), F.const(1.3), F.const(0.85)))
                .clamp(2.2, 5.6).round(2),
            "突进距离", {
                unit: "格",
                description: "从起跳到撞上的总位移；腿快的个体翻得更远，长掠开启时再拉长。"
            }),
        /** 每刻位移：速度每比 60 多 1 加 0.007 格（夹 -0.12..+0.45），夹在 0.55..1.15 格/刻。 */
        step: formula(
            F.base(0.7).plus(F.stat("speed").minus(60).times(0.007).clamp(-0.12, 0.45)).clamp(0.55, 1.15).round(2),
            "翻滚速度", {
                unit: "格/刻",
                description: "腾身翻滚时每刻前进的距离；越快越难被反应。"
            }),
        /** 穿过距离：速度每比 60 多 1 加 0.014 格（夹 -0.2..+0.9）；长掠 ×1.3、贴身 ×0.9；夹在 0.3..2.2 格。 */
        carry: formula(
            F.base(0.7).plus(F.stat("speed").minus(60).times(0.014).clamp(-0.2, 0.9))
                .times(F.when(F.pref("sweep"), F.const(1.3), F.const(0.9)))
                .clamp(0.3, 2.2).round(2),
            "穿过距离", {
                unit: "格",
                description: "撞实后顺着翻滚势头从对方身侧穿过去的距离；长掠开启时穿得更远。"
            }),
        /** 顶开距离：体重每比 50 多 1 加 0.001 格（夹 -0.03..+0.25），夹在 0.05..0.4 格。 */
        push: formula(
            F.base(0.1).plus(F.body("weight").minus(50).times(0.001).clamp(-0.03, 0.25)).clamp(0.05, 0.4).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中时把目标沿翻滚方向推开的距离；越重推得越远。"
            }),
        /** 判定半径：高度每比 1.4 高 1 格加 0.11，夹在 0.26..0.6 格。 */
        collisionRadius: formula(
            F.base(0.36).plus(F.body("height").minus(1.4).times(0.11)).clamp(0.26, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "翻滚时够到活体的横向判定半径；身板越大判定越宽。"
            }),
        /** 火花数量：速度每比 60 多 1 加 0.3（夹 -5..+20），夹在 8..34 个；驱动命中粒子。 */
        motes: formula(
            F.base(14).plus(F.stat("speed").minus(60).times(0.3).clamp(-5, 20)).clamp(8, 34).round(0),
            "火花数量", {
                unit: "个",
                description: "翻滚与命中时迸出的气旋火花数量；越快越多，粒子按它发射。"
            }),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    stages("acrobatics", [
        { level: 20, values: { roll: 64 } },
        { level: 40, values: { roll: 74, reach: 3.4 } }
    ]);

    defineDamage("acrobatics", "roll", { defenceCoefficient: 0.0048, rationale: "轻巧的飞行撞击对防御的穿透略强于默认，突出速度与空手翻倍。" }, { contact: true });

    describe("acrobatics", [
        { key: "description.0", values: ["roll", "collisionRadius"] },
        { key: "description.1", values: ["reach", "step", "carry"] },
        { key: "description.2", values: ["push"] },
        { key: "sweep.on", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) === true; } },
        { key: "sweep.off", values: [], when: function (context) { return read(context.detail.values, ["sweep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.roll"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.roll", "tier.1.reach"] }
    ]);
}
