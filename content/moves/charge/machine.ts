namespace PokemonSkills {
    const chargeMachine = "world_combat:charge_machine";
    const chargeMachineKeys: { [key: string]: string } = {
        sent: "world_combat.move.charge.text.machine_sent",
        full: "world_combat.move.charge.text.machine_full",
        refused: "world_combat.move.charge.text.machine_refused",
        stopped: "world_combat.move.charge.text.machine_stopped"
    };
    function chargeMachineMark(world: CombatWorld, actor: CombatActor, id?: number): CombatEffectView | null {
        const marks = world.effects(actor, chargeMark);
        for (let i = 0; i < marks.length; i++) if (id === undefined || marks[i].id() === id) return marks[i];
        return null;
    }
    function chargeMachineText(world: CombatWorld, point: CombatPoint, suffix: string, args: any[] = []): void {
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1, 0)), chargeMachineKeys[suffix], args, 36);
    }
    WorldCombat.effectHandler(chargeMark, "operation:world_combat:charge_machine", function (effect) {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("effect-not-owned"); return; }
        const world = effect.world(), actor = effect.target(), data = JSON.parse(effect.state()), input = JSON.parse(effect.input());
        if (MobEffects.read(world, actor, chargeUp) === null || !(data.energyRemaining > 0)) return;
        if (!Array.isArray(input.point) || input.point.length !== 3) { effect.reject("invalid-target"); return; }
        const point = WorldCombat.point(input.point[0], input.point[1], input.point[2]);
        const energy = world.energy(point, "auto");
        if (energy === null || !energy.receive()) { chargeMachineText(world, point, "refused"); return; }
        const amount = Math.min(data.energyRemaining, Math.max(1, Math.round(data.energyPulse)));
        let accepted = 0;
        try { accepted = world.receiveEnergy(point, energy.side(), amount, false); }
        catch (error) { chargeMachineText(world, point, "refused"); return; }
        if (!(accepted > 0)) {
            chargeMachineText(world, point, energy.stored() >= energy.capacity() ? "full" : "refused", [data.energyBudget - data.energyRemaining, data.energyRemaining]);
            return;
        }
        data.energyRemaining = Math.max(0, data.energyRemaining - accepted);
        data.delivered = (data.delivered || 0) + accepted;
        const report = data.reportedAt === undefined || world.tick() - data.reportedAt >= 20 || data.energyRemaining <= 0;
        if (report) {
            chargeMachineText(world, point, "sent", [data.delivered, data.energyRemaining]);
            data.delivered = 0; data.reportedAt = world.tick();
        }
        effect.state(JSON.stringify(data));
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, chargeScene, 1, point,
            { moment: "discharge", actor: String(actor.ref()), burst: 12, surge: accepted / Math.max(1, data.energyPulse),
                scale: 0.65, point: [point.x(), point.y(), point.z()] }, 10);
        if (data.energyRemaining <= 0) MobEffects.consume(world, actor, chargeUp);
    });

    MachineWork.register(CompanionBehavior.worksites, {
        id: chargeMachine, move: "charge",
        valid: function (world, actor, job) {
            const mark = chargeMachineMark(world, actor, job.payload.mark);
            if (MobEffects.read(world, actor, chargeUp) === null || mark === null) return "work-resources";
            const energy = world.energy(MachineWork.point(job), "auto");
            return energy !== null && energy.receive() ? "" : "invalid-target";
        },
        step: function (world, actor, job) {
            const mark = chargeMachineMark(world, actor, job.payload.mark);
            if (mark === null) return { state: "complete" };
            const before = JSON.parse(String(mark.data())).energyRemaining;
            world.operation(mark.id(), "world_combat:charge_machine", JSON.stringify({ point: job.point }));
            const after = chargeMachineMark(world, actor, job.payload.mark);
            if (after === null || JSON.parse(String(after.data())).energyRemaining <= 0) return { state: "complete" };
            return JSON.parse(String(after.data())).energyRemaining < before
                ? { state: "working" } : { state: "complete", reason: "work-no-change" };
        }
    }, CompanionBehavior.readFacts);
    commands.register("charge-machine", function (view) {
        const world = view.world(), mark = chargeMachineMark(world, view.actor());
        if (mark === null || MobEffects.read(world, view.actor(), chargeUp) === null) view.reject("work-resources");
        MachineWork.start(view, chargeMachine, "supply", { mark: mark!.id(), resource: String(mark!.id()) }, Math.max(1, mark!.remaining()));
    });
    commands.register("charge-machine-stop", function (view) {
        const world = view.world(), actor = view.actor(), mark = chargeMachineMark(world, actor), body = world.observe(actor);
        if (mark && body) {
            const data = JSON.parse(String(mark.data()));
            chargeMachineText(world, body.position(), "stopped", [data.energyBudget - data.energyRemaining, data.energyRemaining]);
        }
        MachineWork.stop(world, actor); view.intent("follow", null, null);
    });
    skills.charge.menu = function (context, slot) {
        const world = context.world, actor = context.actor;
        if (!world || !actor) return {};
        const mark = chargeMachineMark(world, actor), job = MachineWork.current(world, actor), items: CompanionMenus.Item[] = [];
        if (mark !== null && MobEffects.read(world, actor, chargeUp) !== null) {
            const data = JSON.parse(String(mark.data()));
            if (data.energyRemaining > 0) items.push({ id: "charge/machine", label: text("worldcombat.skill.charge.machine.menu"),
                detail: { key: "worldcombat.skill.charge.machine.hint", args: [data.energyRemaining] },
                command: "charge-machine", target: "block", slot: slot, move: "charge", order: 61 });
        }
        if (job && job.job.operation === chargeMachine) items.push({ id: "charge/machine-stop", label: text("worldcombat.skill.charge.machine.stop"),
            detail: text("worldcombat.skill.charge.machine.stop_hint"), command: "charge-machine-stop", target: "none", order: 62 });
        return { items: items };
    };
}
