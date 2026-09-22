namespace ElectricSupplyWork {
    const id = "world_combat:work/electric_supply";
    const scene = "world_combat:work_electric_supply";
    function matches(pokemon: CombatPokemon): boolean {
        if (pokemon.wild() || !String(pokemon.owner())) return false;
        for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)).toLowerCase() === "electric") return true;
        return false;
    }
    /** Permanent Special Attack is generating strength; level is the individual's electrical control. */
    function pulse(pokemon: CombatPokemon): number { return Math.max(1, Math.round((pokemon.stat("spa") * 4 + pokemon.level() * 10) / 5)); }
    function text(key: string, args: any[] = []): any { return { key: "worldcombat.work.electric_supply." + key, args: args }; }
    function report(world: CombatWorld, point: CombatPoint, key: string, args: any[] = []): void {
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), "worldcombat.work.electric_supply." + key, args, 30);
    }
    MachineWork.register(CompanionBehavior.worksites, {
        id: id,
        available: function (world, actor) { return String(actor.domain()) === "cobblemon" && matches(CobblemonCombat.pokemon(actor)); },
        valid: function (world, _actor, job) {
            if (job.mode !== "supply") return "invalid-target";
            const energy = world.energy(MachineWork.point(job), "auto");
            return energy !== null && energy.receive() ? "" : "invalid-target";
        },
        step: function (world, actor, job) {
            const data = job.payload, point = MachineWork.point(job);
            if (world.tick() < data.next) return { state: "working" };
            data.next = world.tick() + 4;
            const energy = world.energy(point, "auto");
            if (energy === null || !energy.receive()) return { state: "invalid", reason: "work-target-changed" };
            const accepted = world.receiveEnergy(point, energy.side(), pulse(CobblemonCombat.pokemon(actor)), false);
            if (!(accepted > 0)) {
                report(world, point, energy.stored() >= energy.capacity() ? "full" : "refused", [data.total]);
                return { state: "complete", reason: "work-no-change" };
            }
            data.total += accepted;
            if (world.tick() >= data.reportAt) {
                report(world, point, "supplied", [data.total]); data.reportAt = world.tick() + 20;
            }
            WorldFeedback.emit(world, scene, 1, point,
                { moment: "transfer", sparks: Math.max(2, Math.min(24, Math.ceil(accepted / 40))) }, 8);
            return { state: "working" };
        }
    }, CompanionBehavior.readFacts);
    PokemonIndividuals.registry.define({ id: id, autonomous: true, matches: matches,
        apply: function (context) { MachineWork.grant(context.frame, id); } });
    CompanionRepertoire.catalogue.commands.register("electric-supply", function (view) {
        MachineWork.start(view, id, "supply", { next: 0, total: 0, reportAt: 0 });
    });
    CompanionRepertoire.catalogue.commands.register("electric-supply-stop", function (view) {
        const selected = MachineWork.current(view.world(), view.actor());
        if (!selected || selected.job.operation !== id) return;
        MachineWork.stop(view.world(), view.actor()); view.intent("follow", null, null);
        const body = view.world().observe(view.actor());
        if (body !== null) report(view.world(), body.position(), "stopped", [selected.job.payload.total]);
    });
    CompanionRepertoire.catalogue.menus.provide(id, function (context) {
        const world = context.world, actor = context.actor;
        if (!world || !actor || !MachineWork.available(world, actor, id)) return {};
        const items: CompanionMenus.Item[] = [{ id: "work/electric-supply", capability: id,
            label: text("menu"), detail: text("hint", [pulse(context.pokemon) * 5, context.pokemon.stat("spa"), context.pokemon.level()]),
            command: "electric-supply", target: "block", order: 61 }];
        const selected = MachineWork.current(world, actor);
        if (selected && selected.job.operation === id) items.push({ id: "work/electric-supply-stop", capability: id,
            label: text("stop"), detail: text("stop_hint"), command: "electric-supply-stop", target: "none", order: 62 });
        return { items: items };
    });
}
