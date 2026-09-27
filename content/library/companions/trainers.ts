/** Native trainer sessions supply their actual parties; content composes deployment, targeting and the shared move AI. */
namespace TrainerChallenges {
    export interface Policy {
        decisionTicks: number; replacementTicks: number; arenaRadius: number; leaveGraceTicks: number;
        deploymentTimeout: number; spawnDistances: number[];
    }
    export interface Plan { challenge: CombatNpcChallenge; policy: Policy; }
    export interface Decision {
        challenge: CombatNpcChallenge; member: CombatNpcMember; frame: WorldBehavior.Frame;
        opponents: WorldMethods.Subject[]; target: WorldMethods.Subject | null;
    }
    /** Contributions can specialize native NPC classes without copying their parties or the move decision system. */
    export const policies = new WorldContributions.Registry<Plan>();
    export const decisions = new WorldContributions.Registry<Decision>();
    const brains = new WorldMethods.Pool(CompanionBehavior.registry);
    interface Memory {
        anchor: number[]; nextDecision: number; nextDeployment: number; outside: number;
        blockedSince: number; refs: string[]; targets: { [id: string]: string };
    }
    let installed = false;
    function distance(a: number[], b: number[]): number { return WorldMethods.distance(a, b); }
    function point(a: number[]): CombatPoint { return WorldBehaviorHost.point(a); }
    function forget(memory: Memory): void { memory.refs.forEach(ref => brains.forget(ref)); }
    function policy(challenge: CombatNpcChallenge, defaults: Policy): Policy {
        const value: Policy = JSON.parse(JSON.stringify(defaults));
        return policies.apply({ challenge, policy: value }).policy;
    }
    function deploy(view: CombatNpcChallenge, member: CombatNpcMember, ordinal: number, plan: Policy, memory: Memory): boolean {
        const world = view.world(); if (!world) return false;
        const player = world.observe(view.player());
        const anchor = memory.anchor, toward = player ? WorldBehaviorHost.coordinates(player.position()) : [anchor[0], anchor[1], anchor[2] + 1];
        const dx = toward[0] - anchor[0], dz = toward[2] - anchor[2], length = Math.sqrt(dx * dx + dz * dz);
        const forward = length > .01 ? [dx / length, dz / length] : [0, 1];
        // Slot-relative angles separate a double/triple team; native geometry is the final authority for each position.
        const side = ordinal - (view.slots() - 1) / 2;
        for (const radius of plan.spawnDistances) {
            for (const offset of [side * 4, side * 4 + 3, side * 4 - 3, 0]) {
                const x = anchor[0] + forward[0] * radius - forward[1] * offset;
                const z = anchor[2] + forward[1] * radius + forward[0] * offset;
                const floor = world.clipBlocks(WorldCombat.point(x, anchor[1] + 3, z), WorldCombat.point(x, anchor[1] - 5, z));
                if (!floor || !floor.blocked() || floor.blockFace() !== "up") continue;
                const result = JSON.parse(String(view.send(member.index, floor.position().plus(WorldCombat.point(0, .02, 0)))));
                if (result.ok) { view.message("worldcombat.npc_challenge.sent_out", JSON.stringify([member.name])); return true; }
                // A cancelled native send event is a real refusal, not an invitation to fire the same event at every spot.
                if (result.reason !== "blocked") return false;
            }
        }
        return false;
    }
    function decide(view: CombatNpcChallenge, member: CombatNpcMember, plan: Policy, memory: Memory): void {
        const world = view.memberWorld(member.index); if (!world) return;
        const actor = world.source(), pokemon = CobblemonCombat.pokemon(actor);
        if (!pokemon.aiEnabled() || !CompanionBehavior.supports(pokemon, world)) return;
        const self = String(actor.ref()), player = view.player(), trainer = view.trainer();
        const playerId = String(player.ref()).split("/")[0];
        const previous = memory.targets[member.id], previousActor = previous ? world.actor(previous) : null;
        const focus = previousActor || player;
        const frame = CompanionBehavior.frame(world, pokemon, "focus", point(memory.anchor), trainer, null, focus,
            plan.arenaRadius, "", (slot, target, at, direction, _input) => Number(CobblemonCombat.skill(world, slot).submit(target, at, direction)),
            (_stage, _reason) => {});
        const nearby = frame.facts.nearby as WorldMethods.Subject[];
        const eligible = (other: WorldMethods.Subject): boolean => other.ref === String(player.ref())
            || !!other.facts && other.facts.owner === playerId;
        // The challenge names its opponents. Healing, self preparations and cooperation still use the whole friendly team.
        frame.facts.nearby = nearby.filter(other => other.friendly || eligible(other));
        const candidates = nearby.filter(other => eligible(other) && !other.friendly && other.health > 0 && other.visible);
        const source = frame.facts.self as WorldMethods.Subject;
        candidates.sort((a, b) => score(a) - score(b));
        function score(other: WorldMethods.Subject): number {
            return distance(source.point, other.point) + (other.player ? 2 : 0) - (other.ref === previous ? 3 : 0);
        }
        const selected = decisions.apply({ challenge: view, member, frame, opponents: candidates, target: candidates[0] || null });
        if (selected.target) {
            memory.targets[member.id] = selected.target.ref;
            frame.facts.focus = selected.target.ref; frame.facts.focusIssue = "";
        }
        frame.facts.managed = true; frame.facts.wild = false;
        frame.facts.trainerChallenge = String(view.id()); frame.facts.trainerClass = String(view.definition());
        world.controlled(true);
        brains.get(frame).agent.tick(frame);
    }
    function update(view: CombatNpcChallenge, defaults: Policy): void {
        const operation = String(view.operation()), raw = String(view.state());
        let memory: Memory | null = raw && raw !== "{}" ? JSON.parse(raw) : null;
        if (operation === "end") {
            if (memory) forget(memory);
            const outcome = String(view.outcome());
            if (outcome === "player-win" || outcome === "npc-win") view.message("worldcombat.npc_challenge." + outcome, "[]");
            else view.message("worldcombat.npc_challenge.cancelled", "[]");
            return;
        }
        const world = view.world(); if (!world) return;
        const now = world.tick(), trainer = world.observe(view.trainer()), player = world.observe(view.player());
        if (!trainer || !player) return; // The native lifecycle settles death and invalid participants.
        const plan = policy(view, defaults);
        if (!memory) {
            memory = { anchor: WorldBehaviorHost.coordinates(trainer.position()), nextDecision: now, nextDeployment: now,
                outside: -1, blockedSince: -1, refs: [], targets: {} };
            view.message("worldcombat.npc_challenge.started", JSON.stringify([view.slots()]));
        }
        if (distance(memory.anchor, WorldBehaviorHost.coordinates(player.position())) > plan.arenaRadius) {
            if (memory.outside < 0) { memory.outside = now; view.message("worldcombat.npc_challenge.leaving", "[]"); }
            if (now - memory.outside >= plan.leaveGraceTicks) { view.finish("cancelled", "left-arena"); return; }
        } else memory.outside = -1;
        let roster: CombatNpcMember[] = JSON.parse(String(view.roster()));
        if (roster.length && roster.every(member => member.fainted || member.health <= 0)) { view.finish("player-win", "team-defeated"); return; }
        const refs = roster.filter(member => !!member.ref).map(member => member.ref);
        memory.refs.forEach(ref => { if (refs.indexOf(ref) < 0) brains.forget(ref); }); memory.refs = refs;
        const active = roster.filter(member => member.active && !member.fainted && member.health > 0);
        if (active.length < view.slots() && now >= memory.nextDeployment) {
            const waiting = roster.filter(member => !member.active && !member.fainted && member.health > 0);
            let opened = active.length, succeeded = false;
            for (const member of waiting) {
                if (opened >= view.slots()) break;
                if (deploy(view, member, opened, plan, memory)) { opened++; succeeded = true; }
            }
            if (succeeded || active.length) memory.blockedSince = -1;
            else if (waiting.length && memory.blockedSince < 0) { memory.blockedSince = now; view.message("worldcombat.npc_challenge.deployment_blocked", "[]"); }
            memory.nextDeployment = now + plan.replacementTicks;
            if (memory.blockedSince >= 0 && now - memory.blockedSince >= plan.deploymentTimeout) {
                view.finish("cancelled", "deployment-blocked"); return;
            }
            roster = JSON.parse(String(view.roster()));
        }
        if (now >= memory.nextDecision) {
            roster.forEach(member => { if (member.ref && !member.fainted && member.health > 0) decide(view, member, plan, memory!); });
            memory.nextDecision = now + plan.decisionTicks;
        }
        view.state(JSON.stringify(memory));
    }
    export function install(defaults: Policy): void {
        if (installed) throw new Error("Duplicate native trainer policy"); installed = true;
        CobblemonCombat.npcChallenges(view => update(view, defaults));
    }
}
