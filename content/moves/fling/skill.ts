/** A consumed held stack follows one real throw and is eaten, broken or dropped exactly once. */
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
        if (!world.valid(target)) { if (data.leave) flingDrop(current, point, data.id, data.stack, data.pickup); return; }
        const friendly = world.friendly(target);
        const landed = !friendly && impact(current, hit, "fling", data.power, flingFeatures(data.item.status));
        if (data.berry) {
            if (friendly || landed) {
                const result = NativeItems.eat(world, target, data.berry, 1, 0, "fling_berry");
                WorldFeedback.emit(world, flingScene, 1, point, { moment: "feed", target: String(target.ref()), healed: result.healed }, 24);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, .8, 0)), "world_combat.move.fling.text.berry", [], 24);
                return;
            }
        } else if (landed && data.item.flinch) {
            world.deliver(target, "world_combat:interrupt");
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, .8, 0)), "world_combat.move.fling.text.flinch", [], 24);
        } else if (landed && data.item.status) {
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, .8, 0)), flingStatusText[data.item.status] || flingStatusText.psn, [], 24);
        }
        if (landed && world.valid(target)) world.hitDisplace(target, data.direction.scale(data.push));
        WorldFeedback.emit(world, flingScene, 1, point, { moment: "impact", target: String(target.ref()), bursts: data.bursts, scale: 1 }, 24);
        if (data.leave) flingDrop(current, point, data.id, data.stack, data.pickup);
    }

    function flingThrow(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor(), pokemon = CobblemonCombat.pokemon(actor);
        var item = flingItemOf(pokemon), itemId = String(pokemon.heldItem());
        if (!item || !itemId) { done(action); return; }
        var held = NativeItems.heldOf(world, actor);
        if (!held) { done(action); return; }
        var stack = held.stack, berry = NativeItems.berryFrom(held);
        // 消耗发生前把这次施放真正用的量算好：脱手后手里已经没有道具了。
        var power = p("fling", "throw", action), bursts = p("fling", "bursts", action), pickup = p("fling", "pickup", action);
        var speed = p("fling", "speed", action), radius = p("fling", "radius", action), gravity = p("fling", "gravity", action);
        var push = p("fling", "push", action), direction = aim(action);
        if (!NativeItems.takeHeld(world, actor, held, 1).ok) { done(action); return; }
        sound(action, "minecraft:item.trident.throw");
        WorldFeedback.emit(world, flingScene, 1, action.origin(), { moment: "draw", scale: 1 }, 20);
        var appearance: any = { item: itemId, scale: 1, spin: true, hitAllies: true };
        var settled = false, last = action.origin();
        const scenes = WorldFeedback.actionScenes(flingScene);
        var arc = LivingActions.ballistic(action.origin(), action.targetPosition(), speed, gravity);
        var flight = LivingActions.projectile(action, {
            speed: speed, gravity: gravity, range: action.range(), radius: radius,
            direction: arc || undefined, appearance: appearance,
            impact: function (current: CombatAction, hit: CombatImpact) {
                if (settled) return; settled = true; scenes.stop(current);
                flingImpact(current, hit, { berry: berry, item: item, power: power, bursts: bursts, pickup: pickup, push: push,
                    leave: !(config && config.leave === false), id: itemId, stack: stack, direction: direction });
            }
        }, function (current) {
            if (!settled && !(config && config.leave === false)) flingDrop(current, last, itemId, stack, pickup);
            settled = true; scenes.finish(current, done);
        });
        scenes.show(action, "flight", action.origin(), { moment: "flight", projectile: flight, scale: 1 });
        function observe(current: CombatAction): void {
            if (settled) return;
            const entities = current.world().nativeEntities(last, Math.max(2, speed * 2 + 1), "");
            for (let i=0;i<entities.length;i++) if (String(entities[i].uuid !== undefined ? entities[i].uuid : entities[i].stringUUID)===flight) {
                const at=entities[i].position(); last = WorldCombat.point(Number(at.x()), Number(at.y()), Number(at.z())); break;
            }
            current.after(1, observe);
        }
        action.releaseTarget(); action.after(1, observe);
    }

    define({
        id: "fling",
        name: "投掷",
        description: "把携带的道具整个甩向目标：威力随道具重量、效果随道具种类；道具脱手即从手中消耗，默认留在落点可被捡起。",
        uses: ["远距离道具投掷", "把火珠、毒针一类道具丢给对手", "把树果当作给对手的回礼"],
        kind: "aim",
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
