namespace HandCrankWork {
    const id = "world_combat:work/hand_crank", crank = "create:hand_crank";
    function matches(pokemon: CombatPokemon): boolean { return !pokemon.wild() && !!String(pokemon.owner()); }
    function text(key: string): any { return { key: "worldcombat.work.hand_crank." + key }; }
    function report(world: CombatWorld, point: CombatPoint, key: string): void {
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), "worldcombat.work.hand_crank." + key, [], 30);
    }
    MachineWork.register(CompanionBehavior.worksites, {
        id: id,
        available: function (world, actor) {
            return String(actor.domain()) === "cobblemon" && matches(CobblemonCombat.pokemon(actor)) && world.registry("minecraft:block", crank) !== null;
        },
        valid: function (world, _actor, job) {
            const block = world.block(MachineWork.point(job));
            return (job.mode === "forward" || job.mode === "reverse") && block !== null && String(block.id()) === crank ? "" : "invalid-target";
        },
        step: function (world, _actor, job) {
            const data = job.payload, point = MachineWork.point(job);
            if (world.tick() < data.next) return { state: "working" };
            data.next = world.tick() + 4;
            const block = world.block(point);
            if (block === null) return { state: "invalid", reason: "work-target-changed" };
            const result = world.interactBlock(point, "up", job.mode === "reverse", block.state());
            if (result !== "used") { report(world, point, "refused"); return { state: "complete", reason: "work-no-change" }; }
            if (world.tick() >= data.reportAt) { report(world, point, job.mode); data.reportAt = world.tick() + 40; }
            return { state: "working" };
        }
    }, CompanionBehavior.readFacts);
    PokemonIndividuals.registry.define({ id: id, autonomous: true, matches: matches,
        apply: function (context) { MachineWork.grant(context.frame, id); } });
    CompanionRepertoire.catalogue.commands.register("hand-crank-forward", function (view) { MachineWork.start(view, id, "forward", { next: 0, reportAt: 0 }); });
    CompanionRepertoire.catalogue.commands.register("hand-crank-reverse", function (view) { MachineWork.start(view, id, "reverse", { next: 0, reportAt: 0 }); });
    CompanionRepertoire.catalogue.commands.register("hand-crank-stop", function (view) {
        const selected = MachineWork.current(view.world(), view.actor());
        if (!selected || selected.job.operation !== id) return;
        MachineWork.stop(view.world(), view.actor()); view.intent("follow", null, null);
    });
    CompanionRepertoire.catalogue.menus.provide(id, function (context) {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !MachineWork.available(world, actor, id)) return {};
        const items: CompanionMenus.Item[] = [
            { id: "work/hand-crank", capability: id, label: text("menu"), detail: text("hint"), order: 65 },
            { id: "work/hand-crank/forward", parent: "work/hand-crank", capability: id, label: text("forward"),
                detail: text("hint"), command: "hand-crank-forward", target: "block" },
            { id: "work/hand-crank/reverse", parent: "work/hand-crank", capability: id, label: text("reverse"),
                detail: text("hint"), command: "hand-crank-reverse", target: "block" }
        ];
        const selected = MachineWork.current(world, actor);
        if (selected && selected.job.operation === id) items.push({ id: "work/hand-crank/stop", parent: "work/hand-crank", capability: id,
            label: text("stop"), detail: text("stop_hint"), command: "hand-crank-stop", target: "none" });
        return { items: items };
    });
}
