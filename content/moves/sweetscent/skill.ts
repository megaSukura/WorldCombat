/** A finite scent cloud leaves owned evasion loss and short, actual-position scent traces. */
namespace PokemonSkills {
    function sweetscentCentre(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    /** 落点必须落在真实可站立的地面上：脚下有实体方块，才让甜云有地方铺开。 */
    function sweetscentGround(world: CombatWorld, point: CombatPoint): boolean {
        const below = world.block(WorldCombat.point(point.x(), point.y() - 1, point.z()));
        if (below === null) return false;
        const id = String(below.id());
        return id !== "minecraft:air" && id !== "minecraft:cave_air" && id !== "minecraft:void_air"
            && id !== "minecraft:water" && id !== "minecraft:lava";
    }

    const sweetscentTrail = "world_combat:sweetscent_trail";
    WorldCombat.effect(sweetscentTrail, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(sweetscentTrail, "start", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!MobEffects.matches(world, target, data.carrier)) { effect.end(); return; }
        // An external glowing application remains under its existing owner.
        if (!MobEffects.read(world, target, "minecraft:glowing")) {
            const glow = MobEffects.apply(world, target, "minecraft:glowing", effect.remaining(), 0);
            if (glow) data.glow = MobEffects.bind(world, target, "minecraft:glowing", glow);
        }
        // 降闪避窗口由本层留香自己拥有；刷新时换上新 carrier，旧窗口随旧 anchor 关闭，不叠加也不遗留。
        const window = NativeEffects.boostWindow(world, target, { evasion: -data.rank }, effect.remaining(), "world_combat:move/sweetscent", MobEffects.read(world, target, sweetscentEffect));
        if (window) data.window = window;
        effect.state(JSON.stringify(data)); effect.schedule("trace", "trace", 4, "{}");
    });
    WorldCombat.effectHandler(sweetscentTrail, "end", function (effect) {
        const data = JSON.parse(effect.state());
        // 留香结束/被清除时收回自己这份降闪避与发光租约，不留驱散后的残留。
        if (data.window) NativeEffects.windowClose(effect.world(), data.window);
        if (data.glow) MobEffects.release(effect.world(), data.glow);
    });
    WorldCombat.effectHandler(sweetscentTrail, "trace", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state()), body = world.observe(target);
        if (!body || !MobEffects.matches(world, target, data.carrier)) { effect.end(); return; }
        const at = body.position(), before = WorldCombat.point(data.last[0], data.last[1], data.last[2]);
        if (at.minus(before).length() >= .25) {
            WorldFeedback.emit(world, sweetscentScene, 1, at, { moment: "trail", path: [data.last, [at.x(), at.y(), at.z()]], rank: data.rank }, 12);
            data.last = [at.x(), at.y(), at.z()]; effect.state(JSON.stringify(data));
        }
        effect.schedule("trace", "trace", 4, "{}");
    });
    WorldCombat.effectHandler(sweetscentTrail, "operation:world_combat:dispel", effect => effect.end());
    function sweetscentExpose(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, fresh: boolean): boolean {
        if (world.friendly(actor)) return false;
        const ref = String(actor.ref()), next = field.data.next || (field.data.next = {}), now = world.tick();
        if (!fresh && now < (next[ref] || 0)) return false;
        next[ref] = now + Math.max(10, Math.round(field.data.refresh || 40));
        const rank = Math.max(1, Math.min(3, Math.round(field.data.rank || 1))), ticks = Math.max(40, Math.round(field.data.scent || 120));
        // 只替换本施术者自己的留香；别家场的留香与它的降闪避由别家负责，不再互相解除。
        const owner = String(world.source().key());
        world.effects(actor, sweetscentTrail).forEach(view => {
            if (String(view.source().key()) === owner) world.operation(view.id(), "world_combat:dispel", "{}");
        });
        const carrier = MobEffects.apply(world, actor, sweetscentEffect, ticks, rank - 1), body = world.observe(actor);
        if (!carrier || !body) return false;
        world.effect(sweetscentTrail, actor, JSON.stringify({ carrier: MobEffects.anchor(carrier), rank,
            last: [body.position().x(), body.position().y(), body.position().z()], glow: 0 }), ticks);
        WorldFeedback.emit(world, sweetscentScene, 1, body.position(), { moment: "scented", target: ref, rank, scale: 1 + rank * .2 }, 20);
        return true;
    }
    // 甜云的行为：续播画面、按节流给范围内的非友方留香。规则登记一次，全场共用。
    WorldEffects.fieldRule(sweetscentField, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!(field.data && typeof field.data.rank === "number")) return;
            // 云的实际口径就是场地半径本身，配合 fit:world 直接按世界单位铺；只随场地结束而结束。
            const centre = sweetscentCentre(field), radius = field.radius;
            WorldFeedback.onEffect(world, effect.id(), "sweetscent:cloud:" + effect.id(), sweetscentScene, 1, centre,
                { moment: "cloud", radius: radius, rank: field.data.rank });
            const actors = world.query(centre, radius, false);
            const cap = Math.max(1, Math.round(field.data.maxTargets || 3));
            let applied = 0;
            for (let i = 0; i < actors.length && applied < cap; i++) {
                const actor = actors[i];
                if (!world.valid(actor)) continue;
                const body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                if (sweetscentExpose(world, actor, field, false)) applied++;
            }
        }
    });

    define({
        id: sweetscentId,
        cooldownParameter: "recharge",
        name: "甜甜香气",
        description: "朝地面铺一片甜云，沾香的敌人暂时降低闪避并显出轮廓；离云后移动会留下短暂香点，便于沿真实路线追踪。",
        uses: ["把一片区域变成易伤区", "配合队友集火一个被香气罩住的目标", "封住门口或通道"],
        kind: "point",
        range: 7,
        maxRange: 12,
        prepare: 10,
        active: 60,
        recover: 10,
        cooldown: 80,
        style: "aroma",
        defaults: { aroma: false },
        fields: [
            flag("aroma", "馥郁")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[sweetscentId], detail: { values: config }, world, actor, attributes };
            const rich = !!(config && config.aroma);
            return {
                prepare: Math.round(p(sweetscentId, "tempo", context)),
                recover: p(sweetscentId, "recover", context),
                cooldown: Math.round(p(sweetscentId, "recharge", context) * (rich ? 1.15 : 1)),
                active: 60,
                range: p(sweetscentId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sweetscent-windup", sweetscentScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", aroma: config && config.aroma ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[sweetscentId], detail: { values: config } };
            return { radius: p(sweetscentId, "cloudRadius", context), geometry: "area", style: "aroma", label: "甜甜香气" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const aim = action.targetPosition(), origin = action.origin();
            const radius = Math.max(1.4, Math.min(3.6, p(sweetscentId, "cloudRadius", action)));
            const ticks = Math.max(100, Math.round(p(sweetscentId, "cloudTicks", action)));
            const scent = Math.max(100, Math.round(p(sweetscentId, "scentTicks", action)));
            const rank = Math.max(1, Math.min(3, Math.round(p(sweetscentId, "exposure", action))));
            const cap = Math.max(1, Math.round(p(sweetscentId, "maxTargets", action)));
            // 真实墙面挡下甜香：命中实体方块就在墙面截住，不让云在墙后直接生成。
            const wall = WorldGeometry.blockHit(world, origin, aim);
            const reached = wall === null ? aim : wall.position();
            // 落点必须落在可站立的真实地面上：空中落点向下找最近地面，找不到就不铺。
            const centre = WorldGeometry.ground(world, reached, 8);
            if (!sweetscentGround(world, centre)) {
                WorldFeedback.emit(world, sweetscentScene, 1, reached, { moment: "fizzle" }, 16);
                WorldFeedback.text(world, reached.plus(WorldCombat.point(0, 0.8, 0)), "world_combat.move.sweetscent.text.noground", [], 26);
                done(action); return;
            }
            const delta = centre.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            const scale = radius / 2.2;
            sound(action, "minecraft:entity.bee.pollinate");
            WorldFeedback.emit(world, sweetscentScene, 1, origin,
                { moment: "release", direction: [direction.x(), direction.y(), direction.z()], distance: distance, scale: scale, rank: rank }, 30);
            WorldEffects.field(world, sweetscentField, centre, radius,
                { rank: rank, scent: scent, maxTargets: cap, refresh: 40, next: {} }, ticks);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 0.8, 0)), "world_combat.move.sweetscent.text.cloud", [], 28);
            done(action);
        }
    });
}
