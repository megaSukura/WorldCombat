/**
 * 自然之恩 / naturalgift —— 注册与动作。
 *
 * 念头两幕：一幕咀嚼（提交前 `windup`，树果色从手心/嘴边亮起，细嚼时更久更亮），一幕突进命中
 * （提交后沿瞄准方向踏前，撞上目标结算一记树果属性的物理伤害，命中处迸出果屑与果肉，并按体重顶开）。
 * 命中或落空之后，这颗树果经统一装备事务被吃掉（CAS 取走），本次施放无论是否打中都不再带着它。
 * 树果的属性与威力由 `parameters.ts` 的同一个读取器给出，伤害 `resolve` 在命中时读取，预览同源。
 * 空手或没有可用的树果时 `ready` 直接拒绝，不花 PP、不进冷却。
 */
namespace PokemonSkills {
    const naturalgiftScene = "world_combat:move_naturalgift";

    /** 本次伤害的特征层：带 gift 段与属性 resolve，供 impact／hurt 在同一份数据上结算。 */
    function naturalgiftFeatures(): HitFeatures {
        return <HitFeatures>damageFeatures("naturalgift", "gift");
    }

    /** 吃掉这颗树果：命中与落空都算用掉了它。走统一装备事务，原生拒绝时不扣掉原物。 */
    function naturalgiftSpend(current: CombatAction, held: NaturalgiftHeld | null): void {
        if (held === null) return;
        var world = current.world(), actor = current.actor();
        if (!world.valid(actor)) return;
        NativeItems.takeHeld(world, actor, held.held);
    }

    function naturalgiftHit(current: CombatAction, hit: CombatImpact, gift: NaturalgiftGift, direction: CombatPoint): void {
        var world = current.world(), target = hit.target(), point = hit.position();
        var power = p("naturalgift", "gift", current);
        if (target === null) {
            WorldFeedback.emit(world, naturalgiftScene, 1, point, { moment: "fizzle", tint: gift.colour, scale: 1 }, 24);
            return;
        }
        var body = world.observe(target), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
        var landed = impact(current, hit, "naturalgift", power, naturalgiftFeatures());
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        var bursts = Math.round(p("naturalgift", "bursts", current));
        world.sound("cobblemon:move.seedbomb.target", point, 16, "{}");
        WorldFeedback.emit(world, naturalgiftScene, 1, point, { moment: "impact", target: String(target.ref()), tint: gift.colour,
            intensity: intensity, scale: p("naturalgift", "halo", current), bursts: Math.round(bursts * (0.7 + intensity * 0.2)),
            seeds: Math.max(6, Math.round(bursts * 0.5)) }, 32);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.8, 0)),
            "world_combat.move.naturalgift.text.gift", [{ key: "cobblemon.type." + gift.type, fallback: gift.type }], 30);
        if (landed && world.valid(target)) world.displace(target, direction.scale(p("naturalgift", "push", current)));
    }

    function naturalgiftStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), carried = naturalgiftHeld(world, actor);
        var direction = aim(action), speed = p("naturalgift", "step", action), length = p("naturalgift", "reach", action),
            radius = p("naturalgift", "radius", action);
        var fallback: NaturalgiftGift = carried ? carried.gift : { power: 60, type: "normal", colour: 0x9ED47A };
        sound(action, "cobblemon:item.berry.eat");
        WorldFeedback.emit(world, naturalgiftScene, 1, action.origin(), { moment: "step", tint: fallback.colour, scale: 1 }, 22);
        var travelled = 0;
        function advance(current: CombatAction): void {
            var currentWorld = current.world(), origin = current.origin(),
                delta = direction.scale(Math.min(speed, length - travelled));
            var hit = current.trace(origin, origin.plus(delta.scale(p("naturalgift", "traceAhead", current))), radius);
            if (hit.hitEntity()) {
                naturalgiftHit(current, hit, fallback, direction);
                naturalgiftSpend(current, carried);
                done(current);
                return;
            }
            var moved = currentWorld.displace(current.actor(), delta);
            travelled += moved;
            if (hit.blocked() || moved < p("naturalgift", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(currentWorld, naturalgiftScene, 1, hit.position(), { moment: "fizzle", tint: fallback.colour, scale: 1 }, 20);
                naturalgiftSpend(current, carried);
                done(current);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: "naturalgift",
        name: "自然之恩",
        description: "咬碎携带的树果，用它的元素踏前打出一记物理重击；伤害属性与威力都随那颗树果，施放后树果即被消耗（打空也算），空手或没有可用树果时无法发动。",
        uses: ["近身树果打击", "把用不上的树果换成一次属性攻击"],
        kind: "enemy",
        range: 4,
        maxRange: 5,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "berry",
        defaults: { savor: false },
        fields: [flag("savor", "细嚼")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["naturalgift"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("naturalgift", "charge", context)), recover: 8, cooldown: 30, active: 0,
                range: p("naturalgift", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            return naturalgiftHeld(action.sense(), action.actor()) ? "" : "no-berry";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var carried = naturalgiftHeld(action.sense(), action.actor()), gift = carried ? carried.gift : null;
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var colour = gift ? gift.colour : 0x9ED47A;
            action.present("world_combat:naturalgift:" + action.id(), naturalgiftScene, 1, action.origin(), JSON.stringify({
                moment: "chew", tint: colour, scale: scale, savor: !!(config && config.savor === true),
                motes: 10 + Math.round((gift ? gift.power : 80) * 0.14) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            naturalgiftStrike(action, done);
        },
        indicator: function () { return { radius: 4, geometry: "line", style: "berry", label: "自然之恩" }; }
    });
}
