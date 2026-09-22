/**
 * 烦恼种子 / worryseed — 执行组织。
 *
 * 三幕：
 *   聚（windup，提交前）：手心里鼓起一颗种子，身边绕着几颗同样的种子转（`action.present` 预告，可被打断且不花代价）。
 *   投（提交后）：种子沿瞄准方向飞出，带一条细尾迹（`LivingActions.projectile`，原生物理与碰撞，轻微追踪）。
 *   种（命中后）：种子在目标身上爆开、顶出一撮「？」；目标是宝可梦时把它的特性顶成不眠
 *     （共享 NativeModifiers ability 层，与扮演／描绘同一套机制，到期还原），再挂共享身份
 *     `world_combat:status/worryseed` 的标记；若它正在睡眠则当场唤醒。命中处的地面被根须顶出一小块苔
 *     （`world.terrain` 租借，到期原方块回来），能被看见、被绕开。
 *
 * 不眠是真的：rules.ts 在共享 CombatStatus 门上加了判定——有效特性是 insomnia 的战斗者不能入睡，
 * 不论这个不眠是这颗种子给的还是别的来源。任何生物都会被种子砸中并带上标记；只有宝可梦有特性可被顶掉。
 * 目标已是不眠、或特性带 cantsuppress 时预检直接拒绝，不浪费 PP。
 * 配置项 deep（深植／浅植）改变烦恼时长与冷却。
 */
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

    /** 在落点下方找第一块实心方块，换成一小块苔；到期原方块回来。 */
    function worryseedSprout(world: CombatWorld, point: CombatPoint, ticks: number): boolean {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), base = Math.floor(point.y());
        for (let dy = 0; dy <= 3; dy++) {
            const y = base - dy, block = world.block(WorldCombat.point(x, y, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock") return false;
            try {
                world.terrain(JSON.stringify({ cells: [{ x: x, y: y, z: z, block: "minecraft:moss_block" }], replace: true, linger: true }),
                    Math.max(40, Math.round(ticks)));
                return true;
            } catch (error) { return false; }
        }
        return false;
    }

    define({
        id: "worryseed",
        name: "Worry Seed",
        description: "把一颗烦恼种子投进对手身体，让它从此不能入眠，特性被顶成不眠，直到种子枯掉。",
        uses: ["顶掉对手的强力特性换成一枚不眠", "让对手睡不下去，封掉催眠类打法", "在命中处的地面顶出一小块苔"],
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
            const patch = Math.max(60, Math.round(p("worryseed", "patch", action)));
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
                    worryseedSprout(scope, at, patch);
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
