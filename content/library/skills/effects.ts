namespace PokemonSkills {
    export function heal(world: CombatWorld, actor: CombatActor, fraction: number, reason: string): number {
        var body = world.observe(actor);
        if (!body)
            return 0;
        var missing = body.maxHealth() - body.health();
        if (missing <= 0)
            return 0;
        var actual = world.health(actor, Math.min(missing, body.maxHealth() * fraction), "world_combat:" + reason);
        if (actual > 0) {
            feedback(world, actor, body.position(), "heal", { amount: Math.round(actual * 10) / 10 });
        }
        return actual;
    }
    export type HitFeatures = PokemonDamage.Features & {
        knockback?: boolean;
        /** Name the damage segment; one registered segment is selected automatically, several require this. */
        segment?: string;
    };
    /** A unique segment resolves itself; several segments need an explicit name unless a damage spec is passed. */
    function segmentFor(move: string, requested: string | undefined, hasDamage: boolean): string {
        if (requested !== undefined) return requested;
        const keys = damageSegments(move);
        if (keys.length === 1) return keys[0];
        if (keys.length > 1 && keys.indexOf("power") < 0) {
            if (hasDamage) return "";
            throw new Error("Multiple damage segments require an explicit segment: " + move);
        }
        return "power";
    }
    function mergeFeatures(extra: any, power: number, features?: HitFeatures): void {
        extra.power = power;
        extra.knockback = false;
        if (features)
            Object.keys(features).forEach(function (key) { if (key !== "segment") extra[key] = (<any>features)[key]; });
    }
    /** Pass the action for action-owned damage so formula resources and invocation eligibility follow the paying action. */
    export function hurt(source: CombatWorld | CombatAction, target: CombatActor, move: string, power: number, features?: HitFeatures): boolean {
        var action = typeof (<CombatAction>source).sense === "function" ? <CombatAction>source : null;
        var world = action ? action.world() : <CombatWorld>source;
        if (!world.valid(target) || world.friendly(target))
            return false;
        var extra: any = damageFeatures(move, segmentFor(move, features && features.segment, !!(features && (<any>features).damage)));
        mergeFeatures(extra, power, features);
        if (!extra.damage)
            throw new Error("Missing authored damage segment: " + move);
        if (action) {
            extra.actionContext = action;
            NativeLoadout.hitMetadata(action, extra);
        }
        return PokemonDamage.apply(world, target, CobblemonCombat.moveTemplate(move), extra);
    }
    export function impact(action: CombatAction, hit: CombatImpact, move: string, power: number, features?: HitFeatures, strike?: string): boolean {
        var target = hit.target();
        if (target === null || !hit.projectile() && action.sense().friendly(target))
            return false;
        var extra: any = damageFeatures(move, segmentFor(move, features && features.segment, !!(features && (<any>features).damage)));
        if (hit.projectile()) extra.motionId = hit.projectile();
        mergeFeatures(extra, power, features);
        if (!extra.damage)
            throw new Error("Missing authored damage segment: " + move);
        return PokemonDamage.hit(action, hit, CobblemonCombat.moveTemplate(move), NativeLoadout.hitMetadata(action, extra), strike);
    }
    export function powder(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, options: {
        sleep: boolean;
        interval: number;
        duration: number;
        drowsyDuration?: number;
        drowsiness?: (dose: number) => number;
    }): void {
        var sleep = options.sleep;
        if (world.friendly(actor))
            return;
        if (PokemonDamage.combatants.read(world, actor).types.indexOf("grass") >= 0) {
            var warned = field.data.immune || (field.data.immune = {}), actorRef = String(actor.ref());
            if (!warned[actorRef]) {
                warned[actorRef] = true;
                feedback(world, actor, world.observe(actor)!.position(), "immune", { label: "不受粉末影响" });
            }
            return;
        }
        if (sleep && CombatStatus.has(world, actor, "sleep"))
            return;
        if (!field.data.exposure)
            field.data.exposure = {};
        var ref = String(actor.ref()), next = field.data.nextDose || (field.data.nextDose = {});
        if (world.tick() < (next[ref] || 0))
            return;
        next[ref] = world.tick() + (sleep ? field.data.doseInterval || options.interval : options.interval);
        var dose = field.data.exposure[ref] = (field.data.exposure[ref] || 0) + 1;
        if (!sleep) {
            if (!CombatStatus.inflict(world, actor, "poison", options.duration) && dose === 1)
                feedback(world, actor, world.observe(actor)!.position(), "immune", { label: "无法中毒" });
        }
        else {
            world.marker(actor, "minecraft:slowness", options.drowsyDuration!, options.drowsiness!(dose));
            if (dose >= field.data.density) {
                if (!CombatStatus.inflict(world, actor, "sleep", options.duration)) {
                    if (dose === field.data.density)
                        feedback(world, actor, world.observe(actor)!.position(), "immune", { label: "无法入睡" });
                    return;
                }
                field.data.exposure[ref] = 0;
            }
        }
    }
}
