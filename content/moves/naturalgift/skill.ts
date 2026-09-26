/**
 * 自然之恩 / naturalgift —— 注册与动作。
 *
 * 念头两幕：一幕咀嚼（提交前 `windup`，树果色从手心/嘴边亮起，细嚼时更久更亮），一幕突进命中
 * （提交后先经统一装备事务把携带树果 CAS 吃掉、记下真正吃的是哪颗，再沿瞄准方向踏前，撞上目标结算
 * 一记那颗树果属性的物理伤害，命中处迸出果屑与果肉，并按体重顶开）。踏击只结算一次。
 * 树果先消耗、再踏前：CAS 成功才进入踏前，物品被移除/替换时拒绝继续，不凭空造出这一击；打空或撞墙也照常吃果。
 * 树果的属性与威力由 `parameters.ts` 的同一个读取器给出（消耗后读动作里记下的那颗），伤害 `resolve` 与预览同源。
 * 空手或没有可用的树果时 `ready` 直接拒绝，不花 PP、不进冷却。选取为 `aim`：可瞄方向/落点，也可用敌人辅助瞄准。
 */
namespace PokemonSkills {
    const naturalgiftScene = "world_combat:move_naturalgift";

    /** 本次伤害的特征层：带 gift 段与属性 resolve，供 impact／hurt 在同一份数据上结算。 */
    function naturalgiftFeatures(): HitFeatures {
        return <HitFeatures>damageFeatures("naturalgift", "gift");
    }

    /** 踏前之前吃掉这颗树果：CAS 成功才算用掉；同时记下真正吃的是哪颗，供命中结算读取。 */
    function naturalgiftTake(current: CombatAction, carried: NaturalgiftHeld): NaturalgiftGift | null {
        var world = current.world(), actor = current.actor();
        if (!world.valid(actor)) return null;
        if (!NativeItems.takeHeld(world, actor, carried.held).ok) return null;
        var gift = carried.gift;
        current.data("naturalgift.gift", JSON.stringify(gift));
        return gift;
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
        if (landed && world.valid(target)) world.hitDisplace(target, direction.scale(p("naturalgift", "push", current)));
    }

    function naturalgiftStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        const movementScenes = WorldFeedback.actionScenes(naturalgiftScene);
        var world = action.world(), actor = action.actor(), carried = naturalgiftHeld(world, actor);
        if (carried === null) { movementScenes.finish(action, done); return; }
        const taken = naturalgiftTake(action, carried);
        if (taken === null) {
            // 树果在提交前已被移除或替换：不踏前，也不凭空结算伤害。
            WorldFeedback.emit(world, naturalgiftScene, 1, action.origin(), { moment: "fizzle", tint: carried.gift.colour, scale: 1 }, 18);
            movementScenes.finish(action, done);
            return;
        }
        const gift: NaturalgiftGift = taken;
        var direction = aim(action), speed = p("naturalgift", "step", action), length = p("naturalgift", "reach", action),
            radius = p("naturalgift", "radius", action);
        sound(action, "cobblemon:item.berry.eat");
        movementScenes.show(action, "step", action.origin(), { moment: "step", tint: gift.colour, scale: 1 });
        var travelled = 0;
        function advance(current: CombatAction): void {
            var currentWorld = current.world(), origin = current.origin(),
                delta = direction.scale(Math.min(speed, length - travelled));
            var swept = sweepStep(current, delta, radius);
            var hit = swept.hit;
            if (hit.hitEntity()) {
                var contacted = hit.target();
                // 自由瞄准可撞到友方；命中层不允许友方伤害，这里也只落一撮扬尘，不做出假命中。
                if (contacted !== null && currentWorld.friendly(contacted)) {
                    WorldFeedback.emit(currentWorld, naturalgiftScene, 1, hit.position(), { moment: "fizzle", tint: gift.colour, scale: 1 }, 20);
                } else {
                    naturalgiftHit(current, hit, gift, direction);
                }
                movementScenes.finish(current, done);
                return;
            }
            var moved = swept.moved;
            travelled += moved;
            if (hit.blocked() || moved < p("naturalgift", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(currentWorld, naturalgiftScene, 1, hit.position(), { moment: "fizzle", tint: gift.colour, scale: 1 }, 20);
                movementScenes.finish(current, done);
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
        description: "咬碎携带的树果，用它的元素踏前打出一记物理重击；伤害属性与威力都随那颗树果，可朝任意方向/落点踏出，撞空或撞上地形也照常吃果，施放后树果即被消耗（打空也算），空手或没有可用树果时无法发动。",
        uses: ["近身树果打击", "把用不上的树果换成一次属性攻击"],
        kind: "aim",
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
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("naturalgift", "reach", pokemon) : skills["naturalgift"].range,
                geometry: "line", style: "berry", label: "自然之恩" };
        }
    });
}
