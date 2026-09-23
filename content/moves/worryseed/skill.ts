/** worryseed：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const worryseedScene = "world_combat:move_worryseed";
    export const worryseedMark = "world_combat:worryseed";
    export const worryseedPlantText = "world_combat.move.worryseed.text.planted";
    export const worryseedWokeText = "world_combat.move.worryseed.text.woken";

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function worryseedAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        const pokemon = CobblemonCombat.pokemon(actor), state = NativeEffects.read(world, actor);
        return NativeEffects.ability(pokemon, state);
    }

    /** 目标特性是否还能被这颗种子顶掉：读得出、不是不眠、且允许被压制。 */
    export function worryseedPlantable(ability: string): boolean {
        return !!ability && ability !== "insomnia" && !NativeAbilities.flag(ability, "cantsuppress");
    }

    define({
        id: "worryseed",
        cooldownParameter: "recharge",
        name: "Worry Seed",
        description: "种下烦恼，使目标从招式造成的睡眠中醒来，并在种子存续期间抵抗再次催眠；宝可梦的特性还会暂时变为不眠。",
        uses: ["顶掉对手的强力特性换成一枚不眠", "让对手睡不下去，封掉催眠类打法"],
        kind: "enemy",
        range: 7,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 70,
        style: "seed",
        defaults: { deep: false, ai: { maxChase: 13, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["worryseed"], detail: { values: config } };
            return { radius: p("worryseed", "reach", context), geometry: "line", style: "seed", color: 0x8FBF4A, label: "烦恼种子" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["worryseed"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("worryseed", "tempo", context)),
                recover: Math.round(p("worryseed", "aftercast", context)),
                cooldown: Math.round(p("worryseed", "recharge", context)) + (deep ? 20 : -12),
                active: 0,
                range: p("worryseed", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("worryseed", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, "worryseed")) return "already-planted";
            if (String(target.domain()) === "cobblemon") {
                const ability = worryseedAbility(world, target);
                if (ability === "insomnia") return "already-wakeful";
                if (!NativeModifiers.abilitySuppressible(world, target)) return "no-effect";
            }
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:worryseed:gather", worryseedScene, 1, action.origin(), JSON.stringify({
                moment: "gather", seeds: p("worryseed", "seeds", action), deep: config && config.deep ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null) { done(action); return; }
            const deep = !!(config && config.deep);
            const velocity = p("worryseed", "velocity", action);
            const radius = Math.max(0.15, p("worryseed", "radius", action));
            const hold = Math.max(80, Math.round(p("worryseed", "hold", action)));
            const seeds = Math.max(10, Math.round(p("worryseed", "seeds", action)));
            const worries = Math.max(4, Math.round(p("worryseed", "worries", action)));
            const roots = Math.max(6, Math.round(p("worryseed", "roots", action)));
            const targetRef = String(target.ref());
            const from = body.position().plus(WorldCombat.point(0, body.height() * 0.55, 0));
            const aimed = action.targetPosition().minus(from);
            const direction = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            const scale = radius / 0.22;
            let settled = false;
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            function plant(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), hit = impact.target(), at = impact.position();
                if (hit !== null && scope.valid(hit) && !scope.friendly(hit)) {
                    if (String(hit.domain()) === "cobblemon") {
                        NativeModifiers.apply(scope, hit, { ability: "insomnia" }, hold);
                    }
                    MobEffects.apply(scope, hit, worryseedMark, hold, deep ? 1 : 0);
                    const woke = CombatStatus.has(scope, hit, "sleep") ? CombatStatus.cure(scope, hit, "sleep") : false;
                    const spot = scope.observe(hit);
                    if (spot !== null) {
                        WorldFeedback.emit(scope, worryseedScene, 1, spot.position(),
                            { moment: "plant", target: String(hit.ref()), seeds: seeds, worries: worries, roots: roots, deep: deep ? 1 : 0, scale: scale }, 40);
                        WorldFeedback.text(scope, spot.position().plus(WorldCombat.point(0, 1.35, 0)),
                            woke ? worryseedWokeText : worryseedPlantText, [], 40);
                    }
                    sound(current, "minecraft:block.grass.place");
                } else {
                    WorldFeedback.emit(scope, worryseedScene, 1, at, { moment: "miss", seeds: seeds, scale: scale }, 24);
                }
                finish(current);
            }
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, lifetime: 140,
                direction: direction,
                appearance: { sprite: "cobblemon:particle/grass/seed", scale: Math.max(0.6, scale), tint: 0x6E9B3A,
                    homing: { target: targetRef, turn: 5, delay: 1, range: action.range() } },
                impact: plant
            }, finish);
            WorldFeedback.emit(world, worryseedScene, 1, from,
                { moment: "toss", projectile: flight, seeds: seeds, scale: scale }, 40);
            sound(action, "minecraft:entity.snowball.throw");
        }
    });
}
