namespace PokemonSkills {
    const gearupMachine = "world_combat:gearup_machine";
    const gearupCrank = "create:hand_crank";
    const gearupMachineKeys: { [key: string]: string } = {
        done: "world_combat.move.gearup.text.machine_done", forward: "world_combat.move.gearup.text.machine_forward",
        reverse: "world_combat.move.gearup.text.machine_reverse", refused: "world_combat.move.gearup.text.machine_refused"
    };
    function gearupMachineText(world: CombatWorld, point: CombatPoint, suffix: string, args: any[] = []): void {
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), gearupMachineKeys[suffix], args, 36);
    }
    function gearupCrankValid(world: CombatWorld, actor: CombatActor, job: MachineWork.Job): string {
        const block = world.block(MachineWork.point(job));
        if (block === null || String(block.id()) !== gearupCrank) return "invalid-target";
        const resource = MachineWork.equipped(world, actor, "gearup");
        if (resource === null || String(resource.move.key()) !== job.payload.moveKey) return "loadout-changed";
        if (!job.payload.paid && resource.move.pp() < job.payload.pp) return "no-pp";
        return NativeModifiers.restriction(world, actor, resource.move);
    }
    MachineWork.register(CompanionBehavior.worksites, {
        id: gearupMachine, move: "gearup", valid: gearupCrankValid,
        step: function (world, actor, job) {
            const point = MachineWork.point(job), block = world.block(point), data = job.payload;
            if (data.left <= 0) {
                gearupMachineText(world, point, "done");
                return { state: "complete" };
            }
            if (world.tick() < (data.next || 0)) return { state: "working" };
            const resource = MachineWork.equipped(world, actor, "gearup");
            if (block === null || resource === null) return { state: "invalid", reason: "work-target-changed" };
            const before = resource.move.pp(), reserved = !data.paid;
            if (reserved && (before < data.pp || !CobblemonCombat.pp(world, actor, resource.slot, String(resource.move.key()), before, before - data.pp)))
                return { state: "invalid", reason: "no-pp" };
            let result = "refused";
            try { result = world.interactBlock(point, "up", job.mode === "reverse", block.state()); }
            catch (error) { result = "refused"; }
            if (result !== "used") {
                // Refund only our exact reservation; another native PP write always wins the compare-and-write.
                if (reserved) CobblemonCombat.pp(world, actor, resource.slot, String(resource.move.key()), before - data.pp, before);
                gearupMachineText(world, point, "refused");
                return { state: "complete", reason: "work-no-change" };
            }
            data.paid = true; data.left = Math.max(0, data.left - 4); data.next = world.tick() + 4;
            if (data.left === data.total - 4 || data.left % 20 === 0)
                gearupMachineText(world, point, job.mode === "reverse" ? "reverse" : "forward", [Math.ceil(data.left / 20)]);
            return { state: "working" };
        }
    }, CompanionBehavior.readFacts);
    function gearupStartCrank(view: CombatTactics, mode: string): void {
        const world = view.world(), actor = view.actor(), resource = MachineWork.equipped(world, actor, "gearup");
        if (resource === null || world.registry("block", gearupCrank) === null) view.reject("loadout-changed");
        const duration = Math.max(4, Math.round(p("gearup", "crankTicks", world))), pp = Math.max(1, Math.round(p("gearup", "crankPp", world)));
        MachineWork.start(view, gearupMachine, mode, { total: duration, left: duration, pp: pp,
            paid: false, moveKey: String(resource!.move.key()), resource: String(resource!.move.key()), next: 0 }, duration + 600);
    }
    commands.register("gearup-crank-forward", function (view) { gearupStartCrank(view, "forward"); });
    commands.register("gearup-crank-reverse", function (view) { gearupStartCrank(view, "reverse"); });
    commands.register("gearup-crank-stop", function (view) { MachineWork.stop(view.world(), view.actor()); view.intent("follow", null, null); });
    skills.gearup.menu = function (context, slot) {
        const world = context.world, actor = context.actor;
        if (!world || !actor || world.registry("block", gearupCrank) === null) return {};
        const items: CompanionMenus.Item[] = [
            { id: "gearup/machine", label: text("worldcombat.skill.gearup.machine.menu"), detail: text("worldcombat.skill.gearup.machine.hint"), order: 65 },
            { id: "gearup/machine-forward", parent: "gearup/machine", label: text("worldcombat.skill.gearup.machine.forward"),
                detail: text("worldcombat.skill.gearup.machine.hint"), command: "gearup-crank-forward", target: "block", slot: slot, move: "gearup" },
            { id: "gearup/machine-reverse", parent: "gearup/machine", label: text("worldcombat.skill.gearup.machine.reverse"),
                detail: text("worldcombat.skill.gearup.machine.hint"), command: "gearup-crank-reverse", target: "block", slot: slot, move: "gearup" }
        ];
        const job = MachineWork.current(world, actor);
        if (job && job.job.operation === gearupMachine) items.push({ id: "gearup/machine-stop", parent: "gearup/machine",
            label: text("worldcombat.skill.gearup.machine.stop"), detail: text("worldcombat.skill.gearup.machine.stop_hint"),
            command: "gearup-crank-stop", target: "none" });
        return { items: items };
    };
}
