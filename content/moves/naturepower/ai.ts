/** AI reads the current medium's real called recipe: its resolved reach and native power set the score. */
namespace CompanionBehavior {
    /** 当前脚下介质借出的真实招式：介质、招式 id、真实解出的射程与原生威力；非宝可梦或读不到现场时返回 null。 */
    function naturepowerMedium(context: WorldBehavior.Context, item: WorldBehavior.Capability): { site: string; id: string; reach: number; power: number } | null {
        try {
            const scope = world(context), actor = scope.source();
            if (!scope.valid(actor) || String(actor.domain()) !== "cobblemon") return null;
            const body = scope.observe(actor); if (!body) return null;
            const site = PokemonSkills.naturepowerSiteAt(scope, PokemonSkills.naturepowerFoot(body));
            const id = PokemonSkills.naturepowerSites[site];
            const pokemon = CobblemonCombat.pokemon(actor);
            const medium = { pokemon: pokemon, skill: PokemonSkills.skills["naturepower"], detail: { values: item.data.config || {} }, world: scope, actor: actor };
            const reach = PokemonSkills.naturepowerBorrowedReach(medium as PokemonSkills.NumberContext, site);
            const template = CobblemonCombat.moveTemplate(id);
            const power = template && typeof template.power === "function" ? template.power() : 0;
            return { site: site, id: id, reach: reach, power: power };
        } catch (ignored) { return null; }
    }

    registerUse("naturepower", {
        protocols: ["world_combat:attack"],
        reach: function (context, item) { return item.data.range; },
        available: function (context, item, purpose, target) {
            return !!target && target.health > 0;
        },
        accepts: function (context, item, target) {
            var goal = context.choice && context.choice.goal && context.choice.goal.data;
            if (goal && goal.ref === target.ref) return true;
            return distance(source(context).point, target.point) <= ai<number>(item, "maxChase", 12);
        },
        priority: function (context, item, target) {
            if (!target || target.friendly || target.health <= 0 || !target.visible) return 0;
            const self = source(context), gap = distance(self.point, target.point);
            const medium = naturepowerMedium(context, item);
            const reach = medium ? medium.reach : item.data.range;
            if (gap > reach) return 4; // 借招也够不到：交给共享接近逻辑
            if (!medium) return 12;
            // 不同介质就是不同招式：水炮的锁线顶推、火舌的持续、宝石的长束、三重攻击的散束、能量球的首体。
            let score = 14 + Math.min(12, Math.round(medium.power / 10));
            if (!world(context).clear(CompanionBehavior.point(self.point), CompanionBehavior.point(target.point))) score -= 12; // 借招也会被实墙挡住
            switch (medium.site) {
                case "water": score += 5; break;
                case "ember": score += 4; break;
                case "earth": score += 3; break;
                case "plain": score += 3; break;
                case "verdant": score += 2; break;
            }
            return score;
        }
    });

    PokemonSkills.addPreferences("naturepower", { charged: false, ai: { maxChase: 12, leaveStation: false } },
        [PokemonSkills.flag("charged", "催发自然之力"), PokemonSkills.number("ai.maxChase", "出手距离", 2, 32, 1),
            PokemonSkills.flag("ai.leaveStation", "驻守时离位")]);
}
