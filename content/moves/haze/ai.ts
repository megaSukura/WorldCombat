/** haze：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 只读、回调内缓存的能力等级合计：argument "positive" 数正面，"negative" 数负面。 */
    CompanionBehavior.registerFact("world_combat:move_haze/stages", function (access, actor, argument) {
        if (!access.valid(actor)) return 0;
        const stages = hazeStages(access, actor), negative = String(argument) === "negative";
        let total = 0;
        for (let index = 0; index < hazeStats.length; index++) {
            const value = Number(stages[hazeStats[index]]) || 0;
            if (negative ? value < 0 : value > 0) total += Math.abs(value);
        }
        return total + (negative ? 0 : MobEffects.levels(access, actor, "beneficial"));
    });

    function hazeStageValue(context: WorldBehavior.Context, target: CompanionBehavior.Entity, negative: boolean): number {
        const value = CompanionBehavior.fact<number>(context, "world_combat:move_haze/stages", target, negative ? "negative" : "positive");
        return typeof value === "number" ? value : 0;
    }

    /** 本招真正的波及半径，直接读 resolve 出的 fogRadius（含该个体配置）；失败时退回保守估计。 */
    function hazeRadius(context: WorldBehavior.Context, item: WorldBehavior.Capability): number {
        try {
            const scope = CompanionBehavior.world(context);
            return Math.max(3, Math.min(8, p(hazeId, "fogRadius", { world: scope, actor: scope.source(), detail: { values: item.data.config } })));
        } catch (error) { return 4; }
    }

    /** 真实半径内某一方的正/负能力价值合计；friendly 为真时把施法者自己也算进去。
     *  `focus` 是本次认定的目标：它在判定时可能还没走进半径，但它是这次出手的对象，照实计入。 */
    function hazeGather(context: WorldBehavior.Context, item: WorldBehavior.Capability, friendly: boolean, negative: boolean, focus: CompanionBehavior.Entity | null): number {
        const self = CompanionBehavior.source(context), radius = hazeRadius(context, item);
        let total = friendly ? hazeStageValue(context, self, negative) : 0;
        const nearby = context.facts.nearby as CompanionBehavior.Entity[];
        for (let index = 0; index < nearby.length; index++) {
            const other = nearby[index];
            if (other.health <= 0 || !other.visible) continue;
            if (friendly ? !other.friendly : other.friendly) continue;
            const focused = focus !== null && other.ref === focus.ref;
            if (!focused && CompanionBehavior.distance(other.point, self.point) > radius) continue;
            total += hazeStageValue(context, other, negative);
        }
        return total;
    }

    /**
     * 尽抹式的净收益：清掉敌方正阶或己方负阶是收益，清掉敌方负阶或己方正阶是代价。
     * 定向式不动自己与队友，只算「敌方正阶 − 敌方负阶」。只有净收益为正才值得吐雾，
     * 不再出现「抹掉己方多层强化、只消掉对手一点」的赔本交换。
     */
    function hazeNet(context: WorldBehavior.Context, item: WorldBehavior.Capability, focus: CompanionBehavior.Entity | null): number {
        const enemy = hazeGather(context, item, false, false, focus) - hazeGather(context, item, false, true, focus);
        if (item.data.config && item.data.config.focused === true) return enemy;
        return enemy + hazeGather(context, item, true, true, null) - hazeGather(context, item, true, false, null);
    }

    /** 自用机会：自己身上有负阶、且这次交换净收益为正时，可以只为了清自己而吐雾（顺带清掉敌方正阶）。 */
    function hazeSelfWorth(context: WorldBehavior.Context, item: WorldBehavior.Capability): boolean {
        return hazeGather(context, item, true, true, null) > 0 && hazeNet(context, item, null) >= 1;
    }

    function hazeWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity | null): boolean {
        if (context.facts.mounted) return false;
        const self = CompanionBehavior.source(context);
        if (target && target.ref === self.ref) return hazeSelfWorth(context, item);
        if (!target) return false;
        if (target.health <= 0 || target.friendly || !target.visible) return false;
        if (context.facts.focus !== target.ref && CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        return hazeNet(context, item, target) >= 1;
    }

    CompanionBehavior.registerUse(hazeId, {
        // control drives the enemy read; prepare lets the same breath be used to clear its own lowered stages out of combat.
        protocols: ["world_combat:control", "world_combat:prepare"],
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) {
            if (context.facts.mounted) return false;
            const self = CompanionBehavior.source(context);
            if (target && target.ref !== self.ref) return hazeWants(context, item, target);
            if (hazeSelfWorth(context, item)) return true;
            const threat = context.senses["world_combat:threat"] as CompanionBehavior.Entity | null;
            return threat ? hazeWants(context, item, threat) : false;
        },
        accepts: function (context, item, target) {
            const self = CompanionBehavior.source(context);
            if (target.ref === self.ref) return hazeSelfWorth(context, item);
            return !target.friendly && target.health > 0 && target.visible && hazeWants(context, item, target);
        },
        // 黑雾以自己为中心：先把目标纳入波及半径再吐，别隔着半个战场白放（自用清减益时目标是自己，不移动）。
        approachTarget: function (_context, _item, target) { return target; },
        priority: function (context, item, target) {
            const self = CompanionBehavior.source(context);
            if (target && target.ref === self.ref) return hazeSelfWorth(context, item) ? 40 : 0;
            const threat = target || (context.senses["world_combat:threat"] as CompanionBehavior.Entity | null);
            if (!threat || !hazeWants(context, item, threat)) return 0;
            const enemy = hazeGather(context, item, false, false, threat);
            if (enemy < CompanionBehavior.ai<number>(item, "minStages", 2)) return 12;
            return Math.min(96, 40 + enemy * 8 + hazeGather(context, item, true, true, null) * 4);
        }
    });

    addPreferences(hazeId, {}, [
        field(pathOf("ai.maxChase"), "考虑距离", "number", { min: 4, max: 24, step: 1,
            help: "威胁进入这个距离内才考虑吐雾；越大越早铺开、也越容易被反打。" }),
        field(pathOf("ai.minStages"), "抹平门槛", "number", { min: 1, max: 6, step: 1,
            help: "对手正面等级合计达到这么多时，才把吐雾抬到高于普通交战；调 1 见一丝增益就优先抹，调大只在对手攒大了才优先。" })
    ]);
}
