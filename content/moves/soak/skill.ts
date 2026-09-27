/**
 * A drench carrier owns the temporary Water-type layer and its visible film for every living domain.
 * The water pours over the real sight line for a short, distance-derived span before the new Water-type
 * lands, so the type change follows an actual watering process instead of happening at commit.
 */
namespace PokemonSkills {
    export const soakId = "soak";
    export const soakScene = "world_combat:move_soak";
    export const soakEffect = "world_combat:soaked_through";
    export const soakDrenchText = "world_combat.move.soak.text.drench";
    export const soakDryText = "world_combat.move.soak.text.dry";
    export const soakFizzleText = "world_combat.move.soak.text.fizzle";
    export const soakEmptyText = "world_combat.move.soak.text.empty";

    function soakAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.25, 0)); }

    /** 顶点数组形式，给表现的 path 使用。 */
    function soakVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 短浇水时长：水柱按约一格每刻沿视线冲过去，再留两刻收口。纯几何常量，不占玩家参数。 */
    function soakPourTicks(origin: CombatPoint, landing: CombatPoint): number {
        return Math.max(4, Math.min(18, Math.round(landing.minus(origin).length()) + 2));
    }

    /** Current effective types, including provider facts and temporary layers. */
    function soakTypes(world: CombatWorld, target: CombatActor): string[] {
        return world.valid(target) ? PokemonDamage.combatants.read(world, target).types : [];
    }

    /** Pure Water and a native type lock refuse a new drench. */
    function soakRefusal(world: CombatWorld, target: CombatActor): string {
        const types = soakTypes(world, target);
        if (NativeModifiers.typeLocked(world, target)) return "type-locked";
        return types.join(",") === "water" ? "already-water" : "";
    }

    // 水属性身份到期：从目标身上滴下水珠、水膜散去。属性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_soak/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== soakEffect) return;
        const world = event.world(), target = event.actor();
        if (String(data.cause) !== "expired") return;
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, soakScene, 1, body.position(), { moment: "dry", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, soakAbove(body.position()), soakDryText, [], 26);
    });

    define({
        id: soakId,
        cooldownParameter: "recharge",
        name: "浸水",
        description: "把大量水浇在选中的对象上，把它的属性整个冲成水属性；可浇敌人也可浇友方，漫流档只波及同一阵营的一圈人。",
        uses: ["把对手的属性和本系一起冲成水", "打开雷与草的弱点、封掉火与地的本系", "给友方披一身水抗性，或漫流一次浇透同一阵营的一圈人"],
        kind: "aim",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 88,
        style: "drench",
        defaults: { flood: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[soakId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(soakId, "tempo", context)),
                recover: Math.round(p(soakId, "aftercast", context)),
                cooldown: Math.round(p(soakId, "recharge", context)),
                active: 1,
                range: p(soakId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[soakId], detail: { values: config } };
            return { radius: p(soakId, "reach", context), geometry: "line", style: "drench", color: 0x4FA8E8,
                label: config && config.flood === true ? "浸水 · 漫流" : "浸水" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            // 空点：只泼水，没有属性目标，直接允许。
            if (target === null) return action.targetPosition().minus(action.origin()).length() > action.range() ? "out-of-range" : "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > p(soakId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return soakRefusal(world, target);
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_soak:gather", soakScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", streaks: p(soakId, "streaks", action),
                    flood: config && config.flood === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const scenes = WorldFeedback.actionScenes(soakScene);
            const flood = !!(config && config.flood);
            const hold = Math.max(40, Math.round(p(soakId, "hold", action)));
            const splash = Math.max(1.2, p(soakId, "splash", action));
            const streaks = Math.max(8, Math.round(p(soakId, "streaks", action)));
            const ripples = Math.max(4, Math.round(p(soakId, "ripples", action)));
            const scale = Math.max(0.6, Math.min(2.4, splash / 1.6));
            const at = target === null ? null : world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            const targetRef = target === null || at === null ? "" : String(target.ref());
            const pour = soakPourTicks(action.origin(), point);

            /** 落定一个目标：先落身份载体，再用同一 carrier 写 CombatTypes 水层；水膜由类型层拥有，随 carrier 生灭。 */
            function drench(world: CombatWorld, other: CombatActor, from: CombatPoint | null, spread: boolean): boolean {
                if (!world.valid(other)) return false;
                if (soakRefusal(world, other)) return false;
                const previous = MobEffects.read(world, other, soakEffect);
                const carrier = MobEffects.apply(world, other, soakEffect, hold, flood ? 1 : 0);
                if (carrier === null) return false;
                const layer = CombatTypes.apply(world, other, { operation: "replace", types: ["water"] }, carrier);
                if (layer <= 0) {
                    if (previous === null || String(previous.key()) !== String(carrier.key()))
                        world.removeMobEffect(other, soakEffect, carrier.key());
                    return false;
                }
                const body = world.observe(other);
                if (body === null) return true;
                WorldFeedback.onEffect(world, layer, "soak:film", soakScene, 1, body.position(),
                    { moment: "film", target: String(other.ref()), drops: streaks });
                // 漫流的人不在主水柱上：从落点补一道短水流回执，让「水铺过去」看得见。
                if (spread && from !== null)
                    WorldFeedback.emit(world, soakScene, 1, body.position(),
                        { moment: "pour", target: String(other.ref()), path: [soakVertex(from), String(other.ref())],
                            streaks: Math.max(4, Math.round(streaks / 2)), ripples: ripples, splash: splash, scale: scale }, 22);
                WorldFeedback.emit(world, soakScene, 1, body.position(),
                    { moment: "splash", target: String(other.ref()), splash: splash, ripples: ripples,
                        streaks: streaks, scale: scale }, 30);
                WorldFeedback.text(world, soakAbove(body.position()), soakDrenchText, [], 30);
                return true;
            }

            const refusal = target === null ? "" : soakRefusal(world, target);
            if (refusal) {
                scenes.show(action, "fizzle", point, { moment: "fizzle", target: targetRef });
                WorldFeedback.text(world, soakAbove(point), soakFizzleText, [], 26);
                scenes.finish(action, done); return;
            }
            let elapsed = 0;
            function water(current: CombatAction): void {
                const scope = current.world(), live = current.target();
                const body = live === null || !scope.valid(live) ? null : scope.observe(live);
                const aim = body === null ? point : body.position(), from = current.origin();
                const delta = aim.minus(from), inRange = delta.length() <= current.range();
                const limit = inRange ? aim : from.plus(delta.unit().scale(current.range()));
                const clip = scope.clipBlocks(from, limit);
                if (clip === null) { scenes.finish(current, done); return; }
                const contact = clip.blocked() ? clip.position() : limit;
                const reachable = !clip.blocked() && inRange && (target === null || body !== null);
                scenes.show(current, "pour", contact, { moment: "pour", target: "",
                    path: [soakVertex(from), soakVertex(contact)], streaks: streaks, ripples: ripples, splash: splash, scale: scale });
                if (reachable && elapsed < pour) { elapsed++; current.after(1, water); return; }
                scenes.stop(current, "pour");
                if (reachable && live !== null && body !== null) {
                    drench(scope, live, contact, false);
                    if (flood) {
                        const sameSide = scope.friendly(live);
                        WorldGeometry.select(scope, WorldGeometry.ring(contact, 0, splash, { below: 2, above: 3 }),
                            function (other, facts) {
                                if (String(other.ref()) === String(live.ref()) || facts.friendly() !== sameSide) return;
                                if (!scope.clear(contact, facts.position())) return;
                                drench(scope, other, contact, true);
                            });
                    }
                } else {
                    WorldFeedback.emit(scope, soakScene, 1, contact, { moment: "empty", point: soakVertex(contact),
                        ripples: ripples, splash: splash, scale: scale }, 22);
                    WorldFeedback.text(scope, soakAbove(contact), target === null ? soakEmptyText : soakFizzleText, [], 26);
                }
                sound(current, "cobblemon:move.watergun.actor");
                scope.sound("minecraft:entity.generic.splash", contact, 14, "{}");
                scenes.finish(current, done);
            }
            water(action);
        }
    });
}
