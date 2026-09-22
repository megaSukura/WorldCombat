/** Shared script policy for native partners, wild encounters and core-only actors. */
namespace WorldAI {
    export interface Memory { next?: number; ref?: string; seen?: number; point?: number[]; busy?: boolean; initialized?: boolean; home?: number[]; navigation?: Travel; }
    interface Travel { goal: number[]; distance: number; progressed: number; began: number; retry: number; }
    export var navigationPolicy = { changed: 1, progress: 0.25, stalledTicks: 60, attemptTicks: 200, retryTicks: 10 };
    export interface Skill { id: string; kind: string; range: number; ready: boolean; }
    export interface Situation { origin: CombatPoint; ally: CombatObservation; threat: CombatObservation | null; health: number; maximum: number; conservative: boolean; skills: Skill[]; }
    export interface Candidate {
        slot: number; score: number; cost?: number; risk?: number; outcome?: string;
        target: CombatActor | null; point: CombatPoint; direction: CombatPoint;
    }
    interface Provider { id: string; offer: (facts: Situation, slot: number) => Candidate | null; }
    var providers: Provider[] = [];
    export function provider(id: string, offer: (facts: Situation, slot: number) => Candidate | null): void {
        if (providers.length >= 32 || providers.some(function (p) { return p.id === id; })) throw new Error("Duplicate or excessive AI candidate provider");
        providers.push({ id: id, offer: offer });
    }
    export function point(value: number[]): CombatPoint { return WorldCombat.point(value[0], value[1], value[2]); }
    export function coordinates(value: CombatPoint): number[] { return [value.x(), value.y(), value.z()]; }
    export function direction(from: CombatPoint, to: CombatPoint): CombatPoint { var d = to.minus(from); return d.length() < 0.01 ? WorldCombat.point(0, 0, 1) : d.unit(); }
    export function tagged(facts: CombatObservation, tag: string): boolean { return ("," + facts.tags() + ",").indexOf("," + tag + ",") >= 0; }
    export function best(facts: Situation): Candidate | null {
        var choices: Candidate[] = [];
        facts.skills.forEach(Object.freeze); Object.freeze(facts.skills); Object.freeze(facts);
        facts.skills.forEach(function (skill, slot) {
            if (!skill.ready) return;
            providers.forEach(function (provider) {
                var value = provider.offer(facts, slot);
                if (value !== null && isFinite(value.score) && isFinite(value.cost || 0) && isFinite(value.risk || 0)
                    && (value.cost || 0) >= 0 && (value.risk || 0) >= 0 && value.slot === slot && value.point.minus(facts.origin).length() <= 64) choices.push(value);
            });
        });
        function value(candidate: Candidate): number { return candidate.score - (candidate.cost || 0) - (candidate.risk || 0) * (facts.conservative ? 2 : 1); }
        choices.sort(function (a, b) { return value(b) - value(a) || a.slot - b.slot; });
        return choices.length ? choices[0] : null;
    }
    /** Memory keeps a last observation; hidden targets never provide fresh aim coordinates. */
    export function perceive(world: CombatWorld, anchor: CombatPoint, range: number, memory: Memory,
                             score: (facts: CombatObservation) => number): CombatObservation | null {
        var origin = world.observe(world.source())!.position(), best: CombatObservation | null = null, rank = -Infinity;
        var nearby = world.query(origin, range, true);
        for (var i = 0; i < nearby.length; i++) {
            var candidate = world.observe(nearby[i]);
            if (candidate === null || candidate.friendly() || candidate.position().minus(anchor).length() > range) continue;
            if (world.effects(candidate.actor(), "world_combat:hidden").length) continue;
            var value = score(candidate);
            if (value === -Infinity) continue;
            value -= candidate.position().minus(origin).length() * 0.1;
            if (value > rank) { rank = value; best = candidate; }
        }
        if (best !== null) { memory.ref = best.actor().ref(); memory.point = coordinates(best.position()); memory.seen = world.tick(); }
        else if (world.tick() - (memory.seen || 0) > 60) { memory.ref = ""; delete memory.point; }
        return best;
    }
    function travel(world: CombatWorld, goal: CombatPoint, within: number, memory: Memory,
                    request: () => string, stop: () => void): string {
        var source = world.observe(world.source())!, distance = source.position().minus(goal).length(), now = world.tick();
        if (distance <= within) { stop(); delete memory.navigation; return "arrived"; }
        var nav = memory.navigation, policy = navigationPolicy;
        if (!nav || point(nav.goal).minus(goal).length() > policy.changed)
            nav = { goal: coordinates(goal), distance: distance, progressed: now, began: now, retry: 0 };
        if (distance < nav.distance - policy.progress) { nav.distance = distance; nav.progressed = now; }
        if (now - nav.progressed > policy.stalledTicks || now - nav.began > policy.attemptTicks) {
            stop(); delete memory.navigation; return "path-blocked";
        }
        memory.navigation = nav;
        if (now < nav.retry) return "moving";
        nav.retry = now + policy.retryTicks;
        var result = String(request());
        // Walking navigation may have no path while the actor lands after a displacement.
        if (result === "not-grounded") { nav.retry = now + 1; return "moving"; }
        if (result !== "moving") { stop(); delete memory.navigation; }
        return result;
    }
    export function navigate(world: CombatWorld, goal: CombatPoint, within: number, memory: Memory): string {
        return travel(world, goal, within, memory, function () { return world.navigate(goal, within, 1); }, function () { world.stopMovement(); });
    }
    export function approach(action: CombatAction, within: number, memory: Memory): string {
        return travel(action.sense(), action.targetPosition(), within, memory,
            function () { return action.approach(within, 1); }, function () { action.stopMovement(); });
    }
}
