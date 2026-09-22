/**
 * 丛林治疗 / Jungle Healing —— 参数与数值来源。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Grass、变化、威力 0、命中必中、PP 10、目标 allies、
 *   onHit：回复最大 HP 的 25% 并 cureStatus（自己与场上同伴；只要回血或解状态成功一项即算生效）。
 *
 * 世界化：把「与丛林融为一体」翻成一件**从地里长起来的事**——施法者伏低、把根扎进脚下的土，一圈藤蔓与嫩芽
 *   从土里炸起、缠上自己与身边的伙伴；被缠住在绿意里的人伤口愈合、身上的主异常被一起化掉。脚下若是真正的
 *   自然地面（草／土／苔／菌／泥／根／黏土），丛林长得更旺（半径更大、回复更多、嫩芽更密）；踩在石头或沙上，
 *   它只勉强冒几根芽、回复也更少。它和生命水滴同是「自己＋同伴」的治愈，但水会走、只回血；丛林是**瞬间从地
 *   里长起、回血并解状态、还看脚下**的一圈藤，且在地面留下会自己谢去的嫩芽。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   nature   脚下是不是自然地面（读施法者脚下方块，草／土／苔／菌／泥／根／黏土＝1，否则 0）。
 *   heal     回复比例：基础 0.15 + 亲密度偏移 + 自然地面 ×0.05 + 深根档 ×1.1，夹 0.10..0.34。
 *   radius   藤蔓半径：基础 2.6 + 特攻偏移 + 等级偏移 + 自然地面 ×0.5，深根档 ×1.2，夹 2.0..5.4 格。
 *   sprouts  地面嫩芽数：基础 8 + 身高 + 等级偏移，深根档 ×1.4，夹 6..30 格。
 *   motes    叶片数量：特攻 + 身高，夹 18..64 点，直接驱动粒子。
 *   tempo / aftercast / wait 分别读速度／身高／等级。
 * 配置 deeproot（深根）：半径 ×1.2、回复 ×1.1、嫩芽 ×1.4，代价是起手 +3 刻、冷却更久；
 *   关闭（浅根）起手快、冷却短，圈更小、芽更少。两向各有局面（一次救一队 vs 快速净身）。
 */
namespace PokemonSkills {
    export const junglehealingId = "junglehealing";

    /** 脚下是不是自然地面：决定丛林长得多旺。 */
    function junglehealingNature(context: FactContext): number {
        if (!context.world || !context.actor || !context.world.valid(context.actor)) return 0;
        const view = context.world.observe(context.actor);
        if (view === null) return 0;
        const position = view.position();
        const feet = WorldCombat.point(position.x(), position.y() - view.height() / 2 - 0.2, position.z());
        const block = context.world.block(feet);
        if (block === null) return 0;
        return /grass|dirt|podzol|moss|mud|mycelium|root|farmland|nylium|clay/.test(String(block.id())) ? 1 : 0;
    }

    defineFacts(junglehealingId, function (context: FactContext): Formula.Facts {
        return {
            read: function (id: string): Formula.Fact {
                if (id === "nature") return Formula.fact(junglehealingNature(context));
                return undefined;
            },
            expand: function (id: string): Formula.Explanation | undefined {
                if (id !== "nature") return undefined;
                return { value: junglehealingNature(context), label: { key: "worldcombat.skill." + junglehealingId + ".value.nature" }, terms: [] };
            }
        };
    });

    actionParameters.define(junglehealingId, {
        /** 回复比例：亲密度给出丛林与人的呼应，脚下的自然地面再滋养一层。 */
        heal: percent(
            F.base(0.15)
                .plus(F.individual("friendship").minus(70).times(0.0006).clamp(-0.04, 0.08).as("亲密度"))
                .plus(F.var("nature", { key: "worldcombat.skill." + junglehealingId + ".value.nature" }).times(0.05))
                .times(F.when(F.pref("deeproot"), F.const(1.1), F.const(1)).as("深根"))
                .clamp(0.10, 0.34).round(3),
            "回复比例", "被藤蔓缠住时回复其最大生命的这个比例；亲密度越高丛林越亲近，站在自然地面上回复更多，深根档 ×1.1。"),
        /** 藤蔓半径：特攻决定长势，等级决定熟练，脚下地面决定肥力。 */
        radius: formula(
            F.base(2.6)
                .plus(F.stat("specialAttack").minus(55).times(0.006).clamp(-0.4, 0.8).as("特攻"))
                .plus(F.level().minus(20).max(0).times(0.02).clamp(0, 0.8).as("等级"))
                .plus(F.var("nature", { key: "worldcombat.skill." + junglehealingId + ".value.nature" }).times(0.5))
                .times(F.when(F.pref("deeproot"), F.const(1.2), F.const(1)).as("深根"))
                .clamp(2.0, 5.4).round(2),
            "藤蔓半径", { unit: " 格", description: "藤蔓从脚边炸到多远；特攻、等级与脚下的自然地面都会放大它，深根档 ×1.2。这个圈就是真的会被缠住的范围。" }),
        /** 嫩芽数量：身高与等级决定丛林留下的生机。 */
        sprouts: formula(
            F.base(8).plus(F.body("height").minus(1.2).times(3).clamp(-1, 4)).plus(F.level().minus(20).max(0).times(0.2).clamp(0, 4))
                .times(F.when(F.pref("deeproot"), F.const(1.4), F.const(1)).as("深根"))
                .clamp(6, 30).round(0),
            "嫩芽数量", { unit: " 格", description: "丛林在身周自然地面上真的种下几格嫩芽；身量越大、等级越高越多，深根档 ×1.4。" }),
        /** 叶片数量：特攻与身高派生。 */
        motes: formula(
            F.base(22).plus(F.stat("specialAttack").times(0.25)).plus(F.body("height").times(3)).clamp(18, 64).round(0),
            "叶片数量", { unit: " 点", description: "藤蔓炸起与缠绕时迸出的叶片、嫩芽粒子总数；特攻与体型越大越多。" }),
        /** 起手。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.03).clamp(-2, 3))
                .plus(F.when(F.pref("deeproot"), F.const(3), F.const(0)).as("深根"))
                .clamp(4, 14).round(0),
            "起手", "把根扎进土里、唤出丛林之前的准备；速度越快越利落，深根档多花 3 刻。"),
        /** 收招。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 9).round(0),
            "收招", "藤蔓缩回、绿意散去的收势；身板越大收得稍慢。"),
        /** 冷却。 */
        wait: seconds(
            F.base(140).minus(F.level().times(0.6))
                .plus(F.when(F.pref("deeproot"), F.const(14), F.const(0)).as("深根"))
                .clamp(90, 170).round(0),
            "冷却", "两次丛林治疗之间的等待；等级越高越熟练，深根档更长。")
    });

    stages(junglehealingId, [
        { level: 40, values: { wait: 126 } },
        { level: 60, values: { wait: 110 } }
    ]);

    describe(junglehealingId, [
        { key: "description.0", values: ["heal"] },
        { key: "description.1", values: ["radius", "sprouts"] },
        { key: "description.2", values: ["motes", "tempo", "aftercast", "wait"] },
        { key: "stance.deeproot", values: [], when: function (context) { return read(context.detail.values, ["deeproot"]) === true; } },
        { key: "stance.shallow", values: [], when: function (context) { return read(context.detail.values, ["deeproot"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
