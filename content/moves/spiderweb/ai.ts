/** Directly cocoon dangerous contacts; lead moving runners with a real floor web and avoid refreshing full layers. */
namespace CompanionBehavior {
    registerFact("world_combat:spiderweb/layers", function (access, actor) { const web = MobEffects.read(access, actor, "world_combat:spiderweb_wrapped"); return web ? web.amplifier() + 1 : 0; });
    registerFact("world_combat:spiderweb/cap", function (access, actor, config) { return PokemonSkills.p("spiderweb", "layerCap",
        { pokemon: CobblemonCombat.pokemon(actor), world: access, actor, skill: PokemonSkills.skills["spiderweb"], detail: { values: config } }); });
    PokemonSkills.addPreferences("spiderweb", { ai: { maxChase: 10, layerUp: true, catchRunners: true, avoidBurning: true, leaveStation: false } }, [
        PokemonSkills.number("ai.maxChase", "考虑距离", 3, 20, 1),
        PokemonSkills.flag("ai.layerUp", "补缠已缠目标"),
        PokemonSkills.flag("ai.catchRunners", "优先逃跑目标"),
        PokemonSkills.flag("ai.avoidBurning", "目标着火时不出手"),
        PokemonSkills.flag("ai.leaveStation", "驻守时离位")
    ]);

    function spiderwebWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, threat: Entity): boolean {
        const self = source(context);
        if (threat.health <= 0 || threat.friendly || !threat.visible) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !ai<boolean>(item, "leaveStation", false)) return false;
        const wrapped = status(context, threat, "trapped");
        const layers = fact<number>(context, "world_combat:spiderweb/layers", threat) || 0;
        const cap = fact<number>(context, "world_combat:spiderweb/cap", self, item.data.config) || 3;
        if (layers >= cap) return false;
        if (wrapped && !ai<boolean>(item, "layerUp", true)) return false;
        if (ai<boolean>(item, "avoidBurning", true) && status(context, threat, "burn")) return false;
        return context.facts.focus === threat.ref || distance(self.point, threat.point) <= ai<number>(item, "maxChase", 10);
    }

    registerUse("spiderweb", {
        protocols: ["world_combat:control"],
        target: function (context, item, target) {
            const velocity = target.velocity || [0,0,0], speed = Math.sqrt(velocity[0] * velocity[0] + velocity[2] * velocity[2]);
            if (!ai<boolean>(item, "catchRunners", true) || speed < .08 || !target.grounded) return target;
            const access = world(context), self = source(context);
            const predicted = WorldGeometry.ground(access, point([target.point[0] + velocity[0] * 6, target.point[1], target.point[2] + velocity[2] * 6]));
            if (predicted.minus(point(self.point)).length() > item.data.range) return target;
            const floor = access.block(predicted.plus(WorldCombat.point(0,-.1,0))); if (!floor || floor.id() === "minecraft:air") return target;
            const choice = JSON.parse(JSON.stringify(target)); choice.ref = ""; choice.point = [predicted.x(), predicted.y(), predicted.z()]; return choice;
        },
        reach: function (_context, item) { return item.data.range; },
        available: function (context, item, _purpose, target) { return !target || spiderwebWants(context, item, target); },
        accepts: function (_context, _item, target) { return !target.friendly && target.health > 0 && target.visible; },
        priority: function (context, item, target) {
            if (!target || !spiderwebWants(context, item, target)) return 0;
            if (status(context, target, "trapped")) return 34;
            let value = 44;
            if (ai<boolean>(item, "catchRunners", true) && fleeing(context, target)) value += 18;
            if (context.facts.focus === target.ref) value += 8;
            return Math.min(88, value);
        }
    });
}
