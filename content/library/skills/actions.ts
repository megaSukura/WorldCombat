namespace PokemonSkills {
    /** Preference paths are written "ai.maxChase"; the field stores them as segments. */
    export function pathOf(path: string): string[] { return path.split(".").filter(function (part) { return part.length > 0; }); }
    export function choice(path: string, label: string, options: string[], labels: string[]): Field {
        return field(pathOf(path), label, "choice", { options: options.map(function (value, index) { return { value: value, label: labels[index] }; }) });
    }
    export function number(path: string, label: string, min: number, max: number, step: number): Field { return field(pathOf(path), label, "number", { min: min, max: max, step: step }); }
    export function flag(path: string, label: string): Field { return field(pathOf(path), label, "boolean"); }
    export function sound(action: CombatAction, id: string): void { action.world().sound(id, action.origin(), 16, "{}"); }
    export function aim(action: CombatAction): CombatPoint {
        var delta = action.targetPosition().minus(action.origin());
        return delta.length() < 0.01 ? action.direction() : delta.unit();
    }
    /** Native body sweep stops at real contact. Content may spend the untravelled part after resolving that contact. */
    export function sweepStep(action: CombatAction, delta: CombatPoint, radius: number): { hit: CombatImpact; moved: number; remaining: CombatPoint } {
        const origin = action.origin(), distance = delta.length();
        const hit = action.moveSweep(delta, radius);
        const moved = action.origin().minus(origin).length();
        return { hit: hit, moved: moved, remaining: distance > 0 ? delta.unit().scale(Math.max(0, distance - moved)) : delta };
    }
    export function enemies(world: CombatWorld, move: string, point: CombatPoint, radius: number, visit: (target: CombatActor) => void): void {
        var values = world.query(point, radius, false);
        for (var i = 0; i < Math.min(p(move, "maxTargets", world), values.length); i++) {
            var target = values[i], facts = world.observe(target);
            if (facts && !facts.friendly() && world.clear(point, facts.position()))
                visit(target);
        }
    }
    export function bolt(action: CombatAction, move: string, style: string, speed: number, power: number, done: (current: CombatAction) => void, onHit?: (current: CombatAction, hit: CombatImpact) => void): void {
        LivingActions.projectile(action, { speed: speed, range: action.range(), radius: p(move, "collisionRadius", action),
            impact: function (current, hit) {
                if (power > 0 && hit.hitEntity())
                    impact(current, hit, move, power);

                if (onHit)
                    onHit(current, hit);
            }
        }, done);
    }
    export function dash(action: CombatAction, move: string, length: number, power: number, recoil: boolean, done: (current: CombatAction) => void): void {
        var direction = aim(action), travelled = 0;
        function advance(current: CombatAction): void {
            var world = current.world(), origin = current.origin(), delta = direction.scale(Math.min(p(move, "speed", current), length - travelled));
            var swept = sweepStep(current, delta, p(move, "collisionRadius", current)), hit = swept.hit;
            if (hit.hitEntity()) {

                var landed = impact(current, hit, move, power);
                if (landed) {
                    var target = hit.target()!;
                    if (world.valid(target))
                        world.displace(target, direction.scale(p(move, "push", current)));
                    if (recoil) {
                        var self = world.observe(current.actor())!;
                        world.health(current.actor(), -self.health() * p(move, "recoil", current), "world_combat:takedown_recoil");
                    }
                }
                done(current);
                return;
            }
            var moved = swept.moved;

            travelled += moved;
            if (hit.blocked() || moved < p(move, "minimumMove", current) || travelled >= length) {
                done(current);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }
    /** The caller registers the field rule and supplies its exposure data. */
    export function cloud(id: string, name: string, description: string, rule: string, exposure?: (config: any, action: CombatAction) => any): void {
        if (!WorldEffects.hasFieldRule(rule)) throw new Error("Unknown field rule: " + rule);
        define({ id: id, name: name, description: description, uses: ["区域覆盖"],
            kind: "point", range: 10, prepare: 14, active: 140, recover: 10, cooldown: 110, style: "powder",
            defaults: { cloudSize: 2.5 }, fields: [number("cloudSize", "覆盖半径", 1.5, 3.5, 0.5)],
            indicator: function (config) { return { radius: config.cloudSize, geometry: "area", style: "powder", label: name }; },
            execute: function (action, move, config, done) {
                WorldEffects.field(action.world(), rule, action.targetPosition(), config.cloudSize, exposure ? exposure(config, action) : {}, p(id, "duration", action));
                sound(action, "minecraft:block.grass.break");
                done(action);
            }
        });
    }
    export function supportFlag(path: string, label: string): Field { return field(pathOf(path), label, "boolean"); }
    export function supportNumber(path: string, label: string, min: number, max: number, step: number, extra?: any): Field {
        var options: any = { min: min, max: max, step: step };
        if (extra)
            Object.keys(extra).forEach(function (key) { options[key] = extra[key]; });
        return field(pathOf(path), label, "number", options);
    }
    export function supportChoice(path: string, label: string, values: string[], labels: string[]): Field {
        return field(pathOf(path), label, "choice", { options: values.map(function (value, i) { return { value: value, label: labels[i] }; }) });
    }
    export function supported(action: CombatAction, range: number, allowSelf: boolean): string {
        var world = action.sense(), target = action.target();
        if (!target || !world.valid(target) || !world.friendly(target) || !allowSelf && String(target.ref()) === String(action.actor().ref()))
            return "invalid-target";
        var point = world.observe(target)!.position();
        return point.minus(action.origin()).length() > range ? "out-of-range" : !world.clear(action.origin(), point) ? "target-not-visible" : "";
    }
    export function result(world: CombatWorld, actor: CombatActor, kind: string, amount: number, label: string): void {
        var body = world.observe(actor);
        if (!body)
            return;
        feedback(world, actor, body.position(), kind, { amount: Math.round(amount * 10) / 10, label: label });
    }
    export function guardFeedback(label: string, color: number, move?: string): GuardEffects.Rule {
        return {
            pulse: function (effect, guard) {
                var world = effect.world(), body = world.observe(effect.target());
                if (!body)
                    return;

                world.present("world_combat:guard", "world_combat:guard", 1, body.position(), JSON.stringify({ actor: String(effect.target().ref()), label: label,
                    remaining: guard.mode === "survive" ? guard.charges : guard.capacity, unit: guard.mode === "survive" ? "charge" : "capacity", start: world.tick(), duration: 10 }));
            },
            guarded: function (effect, guard, amount) { result(effect.world(), effect.target(), guard.mode === "survive" ? "endure" : "guard", amount, label); }
        };
    }
}
