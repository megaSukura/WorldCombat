/**
 * 颠倒 的伙伴 AI 用途：这招自己的一套出手计划——趁对手把增益顶高时把账本翻过来。
 *
 * 什么局面有意义：有可见、存活、敌对的威胁，且在 `ai.maxChase`（默认 10）格以内，或已被指定为焦点。
 *   对手攒的正面等级达到 `ai.minStages`（默认 1）时大幅抬价（+8／级），这是它真正的用途；
 *   达不到也保持一档基础分——镜片本身还是一次干扰。
 * 什么时候压价：全翻式下，对手身上的负面等级会被翻成增益帮到它，所以每级负面扣分；择映式只翻正面，没有这笔代价。
 * 对谁出手：当前威胁；越靠增益吃饭的越优先。
 * 够不到怎么办：reach 就是镜片射程，超出先走近；镜片会飞，掩体挡住时交给共享接近逻辑找角度。
 * 放完之后：目标的等级符号被翻过来，交回共享交战顺序继续压制或换目标。
 * 配置 gain（择映）：只翻正面变化，绝不帮对手，但更慢、更近、冷却更长。
 */
namespace CompanionBehavior {
    /** 只读、回调内缓存的能力等级合计：argument "positive" 数正面，"negative" 数负面，"net" 数净值。 */
    CompanionBehavior.registerFact("world_combat:move_topsyturvy/stages", function (access: CombatWorld, actor: CombatActor, argument: any) {
        if (!access.valid(actor)) return 0;
        const stages = PokemonSkills.topsyStages(access, actor), mode = String(argument);
        let total = 0;
        for (let index = 0; index < PokemonSkills.topsyStats.length; index++) {
            const value = Number(stages[PokemonSkills.topsyStats[index]]) || 0;
            if (mode === "positive") { if (value > 0) total += value; }
            else if (mode === "negative") { if (value < 0) total += Math.abs(value); }
            else total += value;
        }
        return total;
    });

    function topsyStageValue(context: WorldBehavior.Context, target: Entity, mode: string): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_topsyturvy/stages", target, mode);
        return typeof value === "number" ? value : 0;
    }

    function topsyWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        if (context.facts.mounted) return false;
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if (context.facts.focus === threat.ref) return true;
        return CompanionBehavior.distance(source(context).point, threat.point) <= CompanionBehavior.ai<number>(item, "maxChase", 10);
    }

    registerUse("topsyturvy", {
        protocols: ["world_combat:control"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            return target === null ? true : topsyWants(context, item, target);
        },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            if (!target || !topsyWants(context, item, target)) return 2;
            const positive = topsyStageValue(context, target, "positive");
            const negative = topsyStageValue(context, target, "negative");
            const onlyGains = !!(item.data.config && item.data.config.gain === true);
            let score = 16 + positive * 8;
            if (positive >= CompanionBehavior.ai<number>(item, "minStages", 1)) score += 10;
            if (!onlyGains) score -= negative * 6;
            if (context.facts.focus === target.ref) score += 8;
            return Math.max(2, Math.min(96, score));
        }
    });

    PokemonSkills.addPreferences("topsyturvy", {}, [
        PokemonSkills.field(PokemonSkills.pathOf("ai.maxChase"), "考虑距离", "number", {
            min: 4, max: 20, step: 1,
            help: "威胁进入这个距离内才考虑甩镜；越大越早出手、也越容易空放。"
        }),
        PokemonSkills.field(PokemonSkills.pathOf("ai.minStages"), "抬价门槛", "number", {
            min: 1, max: 6, step: 1,
            help: "对手正面等级合计达到这么多时，才把颠倒抬到高于普通交战；调 1 见一丝增益就优先翻，调大只在对手攒大了才优先。"
        })
    ]);
}
