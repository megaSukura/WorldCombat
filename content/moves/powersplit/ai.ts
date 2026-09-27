namespace PokemonSkills {
    const powersplitMemory = "world_combat:move_powersplit/recent";
    WorldCombat.effect(powersplitMemory, 1, 160, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(powersplitMemory, "start", () => {});
    WorldCombat.effectHandler(powersplitMemory, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.on("world_combat:powersplit/memory", "world_combat:damage_applied", "", event => {
        const world = event.world(), actor = event.actor(), target = event.target(), data = JSON.parse(event.data());
        if (!target || !world.valid(actor) || String(actor.ref()) === String(target.ref()) || !(data.actual > 0) || !DamageSemantics.directOffense(data)) return;
        const split = data.powerSplit, amount = Number(data.amount) + (split ? Number(split.donated || 0) - Number(split.borrowed || 0) : 0);
        world.effects(actor, powersplitMemory).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
        world.effect(powersplitMemory, actor, JSON.stringify({ amount, tick: world.tick() }), 160);
    });
    CompanionBehavior.registerFact("world_combat:powersplit-budget", (world, actor) => {
        const records = world.effects(actor, powersplitMemory);
        return records.length ? Number(JSON.parse(records[records.length - 1].data()).amount) : 0;
    });
    function powersplitFollows(context: WorldBehavior.Context): boolean {
        return context.capabilities.some(item => {
            const id = String(item.data && item.data.move || "");
            return !!id && id !== "powersplit" && item.protocols.indexOf("world_combat:attack") >= 0
                && String(CobblemonCombat.moveTemplate(id).category()) !== "status";
        });
    }
    function powersplitWants(context: WorldBehavior.Context, item: WorldBehavior.Capability, target: CompanionBehavior.Entity): boolean {
        if (context.facts.mounted || !powersplitFollows(context) || target.health <= 0 || !target.visible) return false;
        const self = CompanionBehavior.source(context);
        if (CompanionBehavior.status(context, self, "powersplit") || CompanionBehavior.status(context, target, "powersplit")) return false;
        if ((context.facts.intent === "hold" || context.facts.intent === "stay") && !CompanionBehavior.ai<boolean>(item, "leaveStation", false)) return false;
        if (CompanionBehavior.distance(self.point, target.point) > CompanionBehavior.ai<number>(item, "maxChase", 12)) return false;
        const mine = CompanionBehavior.fact<number>(context, "world_combat:powersplit-budget", self) || 0;
        const theirs = CompanionBehavior.fact<number>(context, "world_combat:powersplit-budget", target) || 0;
        const edge = CompanionBehavior.ai<number>(item, "edge", 1.15);
        return target.friendly ? CompanionBehavior.ai<boolean>(item, "share", false) && mine > 0 && theirs > 0 && mine >= theirs * edge
            : theirs > 0 && (mine <= 0 || theirs >= mine * edge);
    }
    CompanionBehavior.registerUse("powersplit", {
        protocols: ["world_combat:attack", "world_combat:support"],
        reach: (_context, item) => item.data.range,
        available: (context, item, _purpose, target) => target ? powersplitWants(context, item, target)
            : !context.facts.mounted && powersplitFollows(context),
        accepts: (_context, _item, target) => target.health > 0 && target.visible,
        priority: (context, item, target) => target && powersplitWants(context, item, target) ? 95 : 0
    });
    addPreferences("powersplit", { ai: { maxChase: 12, edge: 1.15, leaveStation: false, share: false } }, [
        number("ai.maxChase", "连接考虑距离", 3, 24, 1),
        field(pathOf("ai.edge"), "近期攻势差", "number", { min: 1, max: 2.5, step: .05, help: "比较近期真正命中的伤害预算；差距够大且自己有后续攻击才连接。" }),
        flag("ai.leaveStation", "允许离开驻守位"), flag("ai.share", "与伙伴交换")
    ]);
}
