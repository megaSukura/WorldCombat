/**
 * 投掷 / fling —— 注册与动作。
 *
 * 念头两幕：一幕蓄力甩腕（提交前 `windup` 抬手把手里的东西举到身后），一幕脱手飞出（提交后道具本体
 * 沿弧线飞出、命中目标结算物理伤害并施加道具的效果），随后道具**落到地上留在世界里**，过一会儿才能被捡起。
 * 配置 `leave` 关闭时改为把道具摔碎：威力 ×1.2、不多留东西。
 * 道具在脱手那一刻就从手里消失（`consumeHeld`），所以威力、效果与落地延迟都在消耗前算好。
 */
namespace PokemonSkills {
    const flingScene = "world_combat:move_fling";
    const flingStatusText: { [code: string]: string } = {
        brn: "world_combat.move.fling.text.burn",
        par: "world_combat.move.fling.text.paralysis",
        psn: "world_combat.move.fling.text.poison",
        tox: "world_combat.move.fling.text.toxic"
    };

    function flingFeatures(status: string): any {
        var features: any = damageFeatures("fling", "throw");
        if (status) { features.status = status; features.chance = 1; }
        return features;
    }

    /** 让飞出去的道具落在地上：谁都能捡，落地延迟由道具重量决定。 */
    function flingDrop(current: CombatAction, point: CombatPoint, itemId: string, stack: string | null, delay: number): void {
        var world = current.world(), id = stack || itemId;
        if (!id) return;
        world.dropItem(point, id, 1, JSON.stringify({ pickupDelay: Math.max(0, Math.round(delay)) }));
        world.sound("minecraft:item.trident.hit_ground", point, 12, "{}");
        WorldFeedback.emit(world, flingScene, 1, point, { moment: "land", scale: 1 }, 26);
    }

    function flingImpact(current: CombatAction, hit: CombatImpact, data: any): void {
        var world = current.world(), target = hit.target(), point = hit.position();
        if (target === null) {
            if (data.leave) flingDrop(current, point, data.id, data.stack, data.pickup);
            return;
        }
        var body = world.observe(target), before = body ? body.health() : 0, maximum = body ? Math.max(1, body.maxHealth()) : 1;
        var landed = impact(current, hit, "fling", data.power, flingFeatures(data.item.status));
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        world.sound("minecraft:entity.item.break", point, 16, "{}");
        WorldFeedback.emit(world, flingScene, 1, point, { moment: "impact", target: String(target.ref()), intensity: intensity,
            scale: 1, bursts: Math.round(data.bursts * (0.7 + intensity * 0.2)) }, 30);
        if (data.item.berry) {
            if (world.valid(target)) {
                heal(world, target, 0.125, "fling_berry");
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.8, 0)), "world_combat.move.fling.text.berry", [], 28);
            }
        } else if (data.item.flinch) {
            if (world.valid(target)) world.deliver(target, "world_combat:interrupt");
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.8, 0)), "world_combat.move.fling.text.flinch", [], 28);
        } else if (data.item.status) {
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, 0.8, 0)), flingStatusText[data.item.status] || flingStatusText.psn, [], 28);
        }
        if (landed && world.valid(target)) world.displace(target, data.direction.scale(data.push));
        if (data.leave) flingDrop(current, point, data.id, data.stack, data.pickup);
    }

    function flingThrow(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), pokemon = CobblemonCombat.pokemon(actor);
        var item = flingItemOf(pokemon), itemId = String(pokemon.heldItem());
        if (!item || !itemId) { done(action); return; }
        var stack = pokemon.heldStack().serialized();
        // 消耗发生前把这次施放真正用的量算好：脱手后手里已经没有道具了。
        var power = p("fling", "throw", action), bursts = p("fling", "bursts", action), pickup = p("fling", "pickup", action);
        var speed = p("fling", "speed", action), radius = p("fling", "radius", action), gravity = p("fling", "gravity", action);
        var push = p("fling", "push", action), direction = aim(action);
        CobblemonCombat.consumeHeld(world, actor, String(pokemon.heldKey()), 1);
        sound(action, "minecraft:item.trident.throw");
        WorldFeedback.emit(world, flingScene, 1, action.origin(), { moment: "draw", scale: 1 }, 20);
        var appearance: any = { item: itemId, scale: 1, spin: true };
        var arc = LivingActions.ballistic(action.origin(), action.targetPosition(), speed, gravity);
        var flight = LivingActions.projectile(action, {
            speed: speed, gravity: gravity, range: action.range(), radius: radius,
            direction: arc || undefined, appearance: appearance,
            impact: function (current: CombatAction, hit: CombatImpact) {
                flingImpact(current, hit, { item: item, power: power, bursts: bursts, pickup: pickup, push: push,
                    leave: !(config && config.leave === false), id: itemId, stack: stack, direction: direction });
            }
        }, done);
        WorldFeedback.emit(world, flingScene, 1, action.origin(), { moment: "flight", projectile: flight, scale: 1 }, 70);
    }

    define({
        id: "fling",
        name: "投掷",
        description: "把携带的道具整个甩向目标：威力随道具重量、效果随道具种类；道具脱手即从手中消耗，默认留在落点可被捡起。",
        uses: ["远距离道具投掷", "把火珠、毒针一类道具丢给对手", "把树果当作给对手的回礼"],
        kind: "enemy",
        range: 12,
        maxRange: 16,
        prepare: 7,
        active: 0,
        recover: 8,
        cooldown: 26,
        style: "sling",
        defaults: { leave: true },
        fields: [flag("leave", "留下道具")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["fling"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("fling", "charge", context)), recover: 8, cooldown: 26, active: 0,
                range: p("fling", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var pokemon = CobblemonCombat.pokemon(action.actor());
            return pokemon && String(pokemon.heldItem()) ? "" : "no-item";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var pokemon = CobblemonCombat.pokemon(action.actor());
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:fling:" + action.id(), flingScene, 1, action.origin(), JSON.stringify({
                moment: "draw", item: String(pokemon.heldItem()), scale: scale, leave: !(config && config.leave === false) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            flingThrow(action, config, done);
        },
        indicator: function () { return { radius: 12, geometry: "line", style: "sling", label: "投掷" }; }
    });
}
