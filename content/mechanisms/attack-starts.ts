/** Actual shared preparation and registered native starts. Past damage and an AI target are never starts. */
namespace AttackStarts {
    export interface Authored { sequence: number; instance: number; identity: string; tick: number; prepare: number; remaining: number; }
    interface Record { sequence: number; instance: number; identity: string; tick: number; prepare: number; }
    const history: { [actor: string]: Record[] } = Object.create(null);
    let sequence = 0;
    LivingActions.started.define({ id: "world_combat:attack_starts/shared", apply: start => {
        sequence = Math.max(sequence, start.sequence);
        const key = String(start.action.actor().ref()), values = history[key] || [];
        history[key] = values.filter(value => start.tick - value.tick <= 2);
        history[key].push({ sequence: start.sequence, instance: start.action.id(), identity: start.identity, tick: start.tick, prepare: start.prepare });
    } });
    export function cursor(): number { return sequence; }
    /** Current standard preparations are explicit intent. Zero-prepare starts are readable only as a new same-beat receipt. */
    export function authored(world: CombatWorld, actor: CombatActor, after: number): Authored[] {
        const body = world.valid(actor) ? world.observe(actor) : null;
        if (!body || !body.visible()) return [];
        const now = world.tick(), values = history[String(actor.ref())] || [];
        const live = LivingActions.preparing(world, actor), result: Authored[] = [];
        live.forEach(clock => {
            const start = values.filter(value => value.sequence === clock.sequence)[0];
            result.push({ sequence: clock.sequence, instance: clock.instance, identity: clock.identity,
                tick: start ? start.tick : now - (clock.total - clock.remaining), prepare: clock.total, remaining: clock.remaining });
        });
        values.forEach(value => {
            if (value.prepare === 0 && value.sequence > after && now - value.tick <= 1)
                result.push({ sequence: value.sequence, instance: value.instance, identity: value.identity, tick: value.tick, prepare: 0, remaining: 0 });
        });
        return result.sort((a, b) => a.sequence - b.sequence);
    }
    export function native(world: CombatWorld, actor: CombatActor, after: number): CombatNativeAttackStarts {
        return JSON.parse(String(world.attackStarts(actor, after)));
    }
    let pruned = -1;
    WorldCombat.on("world_combat:attack_starts/prune", "world_combat:actor_tick", "", event => {
        const now = event.world().tick(); if (now % 20 !== 0 || now === pruned) return;
        pruned = now;
        Object.keys(history).forEach(key => { if (history[key].every(value => now - value.tick > 2)) delete history[key]; });
    });
}
