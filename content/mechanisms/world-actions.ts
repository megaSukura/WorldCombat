namespace WorldActions {
    export function ray(action: CombatAction, origin: CombatPoint, direction: CombatPoint, range: number,
                        hit: (impact: CombatImpact) => void): CombatImpact | null {
        var travelled = 0, position = origin, heading = direction.unit();
        while (travelled < range) {
            var length = Math.min(4, range - travelled), next = position.plus(heading.scale(length));
            var impact = action.trace(position, next, 0.15); action.particle(impact.position());
            if (impact.hitEntity()) { hit(impact); return impact; }
            if (impact.blocked()) return impact;
            travelled += length; position = next;
        }
        return null;
    }
    /** Repeated pulses own different strike IDs but share one committed action and cost. */
    export function beam(action: CombatAction, pulses: number, spacing: number, amount: number): void {
        var pulse = 0;
        action.on("world_combat:interrupt", function (current) { current.cancel(); });
        action.stage("maintaining");
        function advance(current: CombatAction): void {
            var direction = current.direction(), target = current.target();
            if (target !== null && current.sense().valid(target) && current.sense().visible(target)) direction = current.targetPosition().minus(current.origin()).unit();
            ray(current, current.origin(), direction, current.range(), function (impact) { current.hit(impact, amount, "pulse:" + pulse, '{"kind":"beam","bypassCooldown":true}'); });
            if (++pulse >= pulses) current.finish(); else current.after(spacing, advance);
        }
        advance(action);
    }
    export function chain(world: CombatWorld, first: CombatActor, amount: number, jumps: number): void {
        var current: CombatActor | null = first, hit: string[] = [], origin = world.observe(world.source())!.position();
        for (var i = 0; i < jumps && current !== null; i++) {
            var facts = world.observe(current);
            if (facts === null || world.friendly(current) || !world.clear(origin, facts.position())) return;
            hit.push(current.ref()); world.particle(facts.position()); world.hurt(current, amount, '{"kind":"chain"}');
            origin = facts.position(); current = null;
            var others = world.query(origin, 4, false);
            for (var j = 0; j < others.length; j++) if (hit.indexOf(others[j].ref()) < 0 && !world.friendly(others[j]) && world.clear(origin, world.observe(others[j])!.position())) { current = others[j]; break; }
        }
    }
    /** Homing has a turning limit and loses updates behind occluding geometry. */
    export function seek(action: CombatAction, speed: number, ticks: number): void {
        var position = action.origin(), velocity = action.direction().unit(), age = 0;
        function advance(current: CombatAction): void {
            var target = current.target();
            if (target !== null && current.sense().valid(target) && current.sense().visible(target))
                velocity = velocity.scale(0.8).plus(current.targetPosition().minus(position).unit().scale(0.2)).unit();
            var next = position.plus(velocity.scale(speed)), impact = current.trace(position, next, 0.2); current.particle(impact.position());
            if (impact.hitEntity()) { current.damage(impact, 3); current.finish(); return; }
            if (impact.blocked() || ++age >= ticks) { current.finish(); return; }
            position = next; current.after(1, advance);
        }
        action.after(1, advance);
    }
}
