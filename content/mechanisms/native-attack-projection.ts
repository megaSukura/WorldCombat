/** Explicit, bounded descriptions of replayable native attacks; content owns when to copy and its multiplier. */
namespace NativeAttackProjection {
    export interface Replay { kind: "contact" | "projectile"; fact: DamageSemantics.RecentAttack; speed: number; range: number; gravity: number; radius: number; appearance: LivingActions.ProjectileAppearance; }
    export interface Description { fact: DamageSemantics.RecentAttack; replay: Replay | null; }
    export const descriptions = new WorldContributions.Registry<Description>();
    const melee = ["minecraft:mob_attack", "minecraft:mob_attack_no_aggro", "minecraft:player_attack", "minecraft:sting", "minecraft:ram", "minecraft:mace_smash"];
    const shots: { [id: string]: { types: string[]; gravity: number; item?: string; sprite?: string } } = {
        "minecraft:arrow": { types: ["minecraft:arrow", "minecraft:spectral_arrow"], gravity: .05, item: "minecraft:arrow" },
        "minecraft:trident": { types: ["minecraft:trident"], gravity: .05, item: "minecraft:trident" },
        "minecraft:fireball": { types: ["minecraft:fireball", "minecraft:small_fireball"], gravity: 0, sprite: "world_combat_core:cobblemon/generic/fire/wisp" },
        "minecraft:unattributed_fireball": { types: ["minecraft:fireball", "minecraft:small_fireball"], gravity: 0, sprite: "world_combat_core:cobblemon/generic/fire/wisp" }
    };
    descriptions.define({ id: "world_combat:native_projection/standard", apply: context => {
        const fact = context.fact;
        if (!(fact.amount > 0) || !isFinite(fact.amount)) return;
        if (fact.contact && melee.indexOf(fact.type) >= 0) {
            context.replay = { kind: "contact", fact: fact, speed: 0, range: 1.5, gravity: 0, radius: .3, appearance: {} }; return;
        }
        const shot = shots[fact.type], path = fact.projectilePath || [];
        if (!shot || shot.types.indexOf(fact.directType || "") < 0 || !path.length) return;
        const lengths = path.map(leg => Math.sqrt(leg.to.reduce((sum, value, index) => sum + Math.pow(value - leg.from[index], 2), 0)));
        const speed = lengths.filter(value => value > .001)[0], range = lengths.reduce((sum, value) => sum + value, 0);
        if (!(speed > 0) || !(range > 0) || !isFinite(speed) || !isFinite(range)) return;
        context.replay = { kind: "projectile", fact: fact, speed: speed, range: range, gravity: shot.gravity, radius: .2,
            appearance: { item: shot.item, sprite: shot.sprite, scale: .35, glow: true } };
    } });
    export function describe(fact: DamageSemantics.RecentAttack | null): Replay | null {
        return fact ? descriptions.apply({ fact: fact, replay: null }).replay : null;
    }
    export function recent(world: CombatWorld, actor: CombatActor, maximumAge: number): Replay | null {
        return describe(DamageSemantics.recentAttack(world, actor, maximumAge));
    }
    export function reach(world: CombatWorld, actor: CombatActor, replay: Replay): number {
        const body = world.observe(actor); return replay.kind === "contact" ? replay.range + (body ? body.width() / 2 : 0) : replay.range;
    }
    const declarationKey = "world_combat:native_projection/declaration";
    function features(replay: Replay): PokemonDamage.Features {
        return { type: "", power: 0, category: replay.fact.category, damageType: replay.fact.type, contact: replay.kind === "contact" };
    }
    /** Declare the observed attack before commit; an unknown Pokemon type never becomes the caller move's Normal/Flying type. */
    export function prepare(action: CombatAction, replay: Replay): void { action.data(declarationKey, JSON.stringify(features(replay))); }
    MoveExecutions.declarations.define({ id: "world_combat:native_projection/declaration", after: ["world_combat:skills/execution"], apply: context => {
        const input = context.action.data(declarationKey); if (input !== null) context.features = [JSON.parse(input)];
    } });
    export interface Playback {
        move: string; multiplier: number;
        show(action: CombatAction, phase: "contact" | "launch" | "hit" | "miss", at: CombatPoint, projectile?: string): void;
        done(action: CombatAction): void;
    }
    /** The caller commits before playing. Real contact/flight grants damage; no remote damage-by-record fallback. */
    export function play(action: CombatAction, replay: Replay, options: Playback): void {
        const origin = action.origin(), offset = action.targetPosition().minus(origin);
        const direction = offset.length() > .001 ? offset.unit() : action.direction();
        const range = Math.min(action.range(), reach(action.world(), action.actor(), replay));
        const amount = replay.fact.amount * options.multiplier;
        if (!(amount > 0) || !isFinite(amount)) throw new Error("Invalid projected attack budget");
        function hit(current: CombatAction, impact: CombatImpact): void {
            const metadata = PokemonDamage.sourceMetadata(current.world(), current.actor(), CobblemonCombat.moveTemplate(options.move), features(replay), current);
            metadata.nativeProjection = replay.kind;
            let budget = amount;
            if (metadata.type && impact.target()) {
                const source = PokemonDamage.combatants.read(current.world(), current.actor()), target = PokemonDamage.combatants.read(current.world(), impact.target()!);
                metadata.effectiveness = 1;
                target.types.forEach(type => metadata.effectiveness *= CobblemonCombat.typeEffectiveness(metadata.type, type));
                budget *= PokemonDamage.sameType(source, metadata.type) * metadata.effectiveness;
            }
            const landed = budget > 0 && impact.hitEntity() && LivingActions.settleHit(current,
                () => current.hit(impact, budget, "native_projection", JSON.stringify(NativeLoadout.hitMetadata(current, metadata))));
            options.show(current, landed ? "hit" : "miss", impact.position(), impact.projectile());
        }
        if (replay.kind === "contact") {
            options.show(action, "contact", origin);
            action.after(2, current => {
                const here = current.origin(), impact = current.trace(here, here.plus(direction.scale(range)), replay.radius);
                hit(current, impact); options.done(current);
            });
        } else {
            const ballistic = replay.gravity > 0 ? LivingActions.ballistic(origin, action.targetPosition(), replay.speed, replay.gravity) : null;
            const lifetime = Math.max(1, Math.ceil(range / replay.speed) * 2 + 10);
            const id = action.projectile(origin, (ballistic || direction).scale(replay.speed), replay.gravity, replay.radius, range, lifetime,
                hit, options.done, JSON.stringify(replay.appearance));
            options.show(action, "launch", origin, id);
        }
    }
}
