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

    /**
     * 这颗种子还能不能顶掉目标的特性：读得出、不是不眠、不是天生免疫睡眠，且允许被压制。
     * 不可替换与已不眠都沿用原生拒绝，不虚构一次成功。
     */
    export function worryseedPlantable(ability: string): boolean {
        return !!ability && ability !== "insomnia"
            && !NativeAbilities.flag(ability, "cantsuppress") && !NativeAbilities.flag(ability, "statusImmune");
    }

    define({
        id: "worryseed",
        cooldownParameter: "recharge",
        name: "Worry Seed",
        description: "投出一颗烦恼种子：命中敌人时把它的特性暂时换成不眠、并叫醒它；命中睡着的友方会把它叫醒，种子存续期间两者都抵抗再次催眠。可以空投，落到地面就散开。",
        uses: ["顶掉对手的强力特性换成一枚不眠", "把睡着的伙伴叫醒，并替它挡住之后的催眠", "让对手睡不下去，封掉催眠类打法"],
        kind: "aim",
        range: 7,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 70,
        style: "seed",
        defaults: { deep: false, helpFriends: true, ai: { maxChase: 13, leaveStation: false } },
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
            const world = action.sense(), target = action.target(), origin = action.origin();
            // 空投：只朝一个世界点运种，能落到射程内就允许；没有实体也不额外找敌人。
            if (target === null) return action.targetPosition().minus(origin).length() > action.range() ? "out-of-range" : "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(origin).length() > action.range()) return "out-of-range";
            if (!world.clear(origin, body.position())) return "no-line";
            if (CombatStatus.has(world, target, "worryseed")) return "already-planted";
            if (String(target.domain()) === "cobblemon") {
                const ability = worryseedAbility(world, target);
                if (ability === "insomnia") return "already-wakeful";
                if (!NativeModifiers.abilitySuppressible(world, target)) return "no-effect";
            }
            return "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            const path = target === null ? [String(action.actor().ref())] : [String(action.actor().ref()), String(target.ref())];
            action.present("world_combat:worryseed:gather", worryseedScene, 1, action.origin(), JSON.stringify({
                moment: "gather", path: path, seeds: p("worryseed", "seeds", action), deep: config && config.deep ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const deep = !!(config && config.deep);
            const velocity = p("worryseed", "velocity", action);
            const radius = Math.max(0.15, p("worryseed", "radius", action));
            const hold = Math.max(80, Math.round(p("worryseed", "hold", action)));
            const seeds = Math.max(10, Math.round(p("worryseed", "seeds", action)));
            const worries = Math.max(4, Math.round(p("worryseed", "worries", action)));
            const roots = Math.max(6, Math.round(p("worryseed", "roots", action)));
            const worrySize = Math.round(0.2 * (deep ? 1.35 : 1) * 100) / 100;
            const worryLife = deep ? 22 : 16, worryLifeMax = deep ? 34 : 28;
            const chosen = target !== null && world.valid(target) ? String(target.ref()) : "";
            const chosenFriend = chosen !== "" && world.friendly(target!);
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
                // 只对明确选中的实体施加；空投顺路撞到敌人也算种上。撞到别的身体或方块就散开。
                const valid = hit !== null && scope.valid(hit);
                const intended = valid && chosen !== "" && String(hit!.ref()) === chosen;
                const strayEnemy = valid && chosen === "" && !scope.friendly(hit!);
                if (valid && (intended || strayEnemy)) {
                    if (String(hit!.domain()) === "cobblemon") {
                        const ability = worryseedAbility(scope, hit!);
                        if (ability === "insomnia" || !NativeModifiers.abilitySuppressible(scope, hit!)) {
                            WorldFeedback.emit(scope, worryseedScene, 1, at, { moment: "miss", seeds: seeds, scale: scale }, 22);
                            finish(current);
                            return;
                        }
                        NativeModifiers.apply(scope, hit!, { ability: "insomnia" }, hold);
                    }
                    MobEffects.apply(scope, hit!, worryseedMark, hold, deep ? 1 : 0);
                    const woke = CombatStatus.has(scope, hit!, "sleep") ? CombatStatus.cure(scope, hit!, "sleep") : false;
                    const spot = scope.observe(hit!);
                    const anchor = spot === null ? at : spot.position();
                    WorldFeedback.emit(scope, worryseedScene, 1, anchor,
                        { moment: "plant", target: String(hit!.ref()), seeds: seeds, worries: worries, roots: roots,
                            deep: deep ? 1 : 0, worrySize: worrySize, worryLife: worryLife, worryLifeMax: worryLifeMax, scale: scale }, 40);
                    if (woke)
                        WorldFeedback.emit(scope, worryseedScene, 1, anchor.plus(WorldCombat.point(0, spot === null ? 1.0 : spot.height() * 0.7, 0)),
                            { moment: "wake", target: String(hit!.ref()), glints: Math.max(8, Math.round(worries * 1.5)), scale: scale }, 30);
                    WorldFeedback.text(scope, anchor.plus(WorldCombat.point(0, 1.35, 0)), woke ? worryseedWokeText : worryseedPlantText, [], 40);
                    sound(current, "minecraft:block.grass.place");
                } else {
                    const wall = impact.blocked() ? impact.blockPosition() : null;
                    WorldFeedback.emit(scope, worryseedScene, 1, wall === null ? at : wall, { moment: "miss", seeds: seeds, scale: scale }, 24);
                }
                finish(current);
            }
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/grass/seed", scale: Math.max(0.6, scale), tint: 0x6E9B3A, hitAllies: chosenFriend
            };
            if (chosen !== "") appearance.homing = { target: chosen, turn: 5, delay: 1, range: action.range() };
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, lifetime: 140,
                direction: direction, appearance: appearance, impact: plant
            }, finish);
            WorldFeedback.emit(world, worryseedScene, 1, from,
                { moment: "toss", projectile: flight, seeds: seeds, scale: scale }, 40);
            sound(action, "minecraft:entity.snowball.throw");
        }
    });
}
