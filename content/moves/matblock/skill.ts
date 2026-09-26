/** A fixed mat sheet catches attacks crossing its front face; covered allies share its geometry. */
namespace PokemonSkills {
    const matBlockScene = "world_combat:move_matblock";
    const matBlockEffect = "world_combat:mat_block";
    const matBlockRule = "world_combat:move_matblock";
    const matBlockRaiseText = "world_combat.move.matblock.text.raise";
    const matBlockBlockText = "world_combat.move.matblock.text.block";
    const matBlockFallText = "world_combat.move.matblock.text.fall";
    /** 表现里的参考半径：`data.scale = 实际遮蔽半径 / 这个数`。 */
    const matBlockReferenceRadius = 3.4;

    const matBlockPlane = "world_combat:matblock_plane";
    WorldCombat.effect(matBlockPlane, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(matBlockPlane, "start", effect => effect.schedule("watch", "watch", 8, "{}"));
    WorldCombat.effectHandler(matBlockPlane, "watch", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        if (!data.members.some(function (ref: string) { const actor = world.actor(ref); return actor && world.valid(actor) && GuardEffects.has(world, actor, matBlockRule); })) { effect.end(); return; }
        effect.schedule("watch", "watch", 8, "{}");
    });
    function matBlockCrosses(world: CombatWorld, target: CombatActor, data: any, source: any): boolean {
        if (!Array.isArray(source) || source.length !== 3) return false;
        const body = world.observe(target); if (!body) return false;
        const p = data.plane, d = data.direction, to = body.position();
        const front = (source[0] - p[0]) * d[0] + (source[2] - p[2]) * d[2];
        const back = (to.x() - p[0]) * d[0] + (to.z() - p[2]) * d[2];
        if (front <= 0 || back > 0 || back < -data.depth) return false;
        const t = front / (front - back), x = source[0] + (to.x() - source[0]) * t - p[0];
        const z = source[2] + (to.z() - source[2]) * t - p[2], y = source[1] + (to.y() - source[1]) * t;
        return Math.abs(x * -d[2] + z * d[0]) <= data.radius && y >= p[1] && y <= p[1] + data.height;
    }
    GuardEffects.register(matBlockRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world();
            if (!incoming.source || String(incoming.source.ref()) === String(effect.target().ref())) return false;
            if (world.friendly(incoming.source)) return false;
            return (DamageSemantics.read(incoming.data).attack || String(incoming.data.kind) === "move")
                && matBlockCrosses(world, effect.target(), state, incoming.data.sourcePosition);
        },
        pulse: function (effect, state) {
            if (MobEffects.read(effect.world(), effect.target(), matBlockEffect) === null) effect.end();
        },
        guarded: function (effect: CombatEffect, state: GuardEffects.State, amount: number, incoming: GuardEffects.Incoming): void {
            const world = effect.world(), target = effect.target(), body = world.observe(target);
            if (body === null) return;
            const custom: any = state;
            const flexed = state.capacity <= 0 ? 1 : 0;
            const data: any = { moment: "block", target: String(target.ref()), blocked: Math.round(amount * 10) / 10,
                remaining: Math.round(Math.max(0, state.capacity) * 10) / 10, slats: custom.slats, fibers: custom.fibers,
                scale: custom.scale, flexed: flexed,
                intensity: Math.max(0.6, Math.min(2, amount / Math.max(1, body.maxHealth() * 0.12))) };
            const attacker = incoming.source ? world.observe(incoming.source) : null;
            if (attacker !== null) {
                const away = body.position().minus(attacker.position());
                if (away.length() > 0.01) { const direction = away.unit(); data.direction = [direction.x(), direction.y(), direction.z()]; }
            }
            WorldFeedback.emit(world, matBlockScene, 1, body.position(), data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), matBlockBlockText,
                [data.blocked, data.remaining], 24);
            world.sound("minecraft:block.grass.place", body.position(), 12, "{}");
            if (state.capacity <= 0) MobEffects.consume(world, target, matBlockEffect);
        }
    });

    /** 池的余量换算成画面强度：满席 1、见底趋近 0.15。 */
    function matBlockIntensity(capacity: number, initial: number): number {
        return Math.max(0.15, Math.min(1, initial > 0 ? capacity / initial : 0));
    }
    function matBlockScale(radius: number): number {
        return Math.max(0.5, Math.min(2.2, (radius || matBlockReferenceRadius) / matBlockReferenceRadius));
    }

    /** 给施法者与半径内友方各挂一份席盾（身份 + 只吃招式伤害的按量吸收池）；返回这次席子罩住的人数。 */
    function matBlockCover(world: CombatWorld, caster: CombatActor, radius: number, ticks: number,
        capacity: number, slats: number, fibers: number, linkRange: number, scale: number, direction: CombatPoint): number {
        const body = world.observe(caster);
        if (body === null) return 0;
        const plane = body.position().plus(direction.scale(body.width() / 2 + .3)).plus(WorldCombat.point(0, -body.height() / 2, 0));
        const data: any = { plane: [plane.x(), plane.y(), plane.z()], direction: [direction.x(), 0, direction.z()],
            radius: radius, depth: radius * 2, height: Math.max(2.5, body.height() * 1.5) };
        const members: string[] = [];
        function protect(actor: CombatActor): boolean {
            if (MobEffects.apply(world, actor, matBlockEffect, ticks, 0) === null) return false;
            GuardEffects.apply(world, actor, { plane: data.plane, direction: data.direction, radius: data.radius, depth: data.depth, height: data.height, rule: matBlockRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: linkRange, initial: capacity, slats: slats, fibers: fibers, scale: scale } as any, ticks);
            members.push(String(actor.ref()));
            return true;
        }
        let reached = protect(caster) ? 1 : 0;
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other) || world.observe(other) === null) continue;
            if (protect(other)) reached++;
        }
        if (members.length) {
            const sheet = world.effect(matBlockPlane, caster, JSON.stringify({ members: members }), ticks);
            const side = WorldCombat.point(-direction.z(), 0, direction.x()).scale(radius), up = WorldCombat.point(0, data.height, 0);
            const corners = [plane.minus(side), plane.plus(side), plane.plus(side).plus(up), plane.minus(side).plus(up), plane.minus(side)];
            WorldFeedback.onEffect(world, sheet, "matblock:sheet:" + sheet, matBlockScene, 1, plane,
                { moment: "hold", path: corners.map(p => [p.x(), p.y(), p.z()]), slats: slats });
        }
        return reached;
    }

    define({
        id: "matblock",
        cooldownParameter: "wait",
        name: "掀榻榻米",
        description: "面朝前方立起固定席墙，保护自己与后方队友。只有从正面实际穿过席面的攻击被承受，侧后方来击照常落下。",
        uses: ["替全队硬吃一轮成片的伤害招式", "在对手的重击落下前抢一拍掀席", "把一次爆发整片挡在席面外"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 150,
        style: "screen",
        stationary: true,
        defaults: { fold: 1, ai: { trigger: 9, cover: false } },
        fields: [
            field(pathOf("fold"), "掀席方式", "choice", {
                options: [
                    { value: 1, label: "竖席" },
                    { value: 0, label: "横席" }
                ],
                help: "竖席：吃伤总量 ×1.3、时长 ×1.15、半径 ×0.85，代价是起手 +2 刻、冷却 ×1.15，厚实耐砸；横席：半径 ×1.25，吃伤 ×0.8、时长 ×0.85，换来起手 −1 刻、冷却 ×0.85，摊得开、起得快。"
            })
        ],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("matblock", "radius", pokemon) : 3.4, geometry: "area", style: "screen", color: 0xD9C08A,
                label: config && Number(config.fold) === 1 ? "掀榻榻米 · 竖席" : "掀榻榻米 · 横席" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["matblock"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p("matblock", "tempo", context))),
                recover: Math.round(p("matblock", "aftercast", context)),
                cooldown: Math.round(p("matblock", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_matblock:fold", matBlockScene, 1, action.origin(),
                JSON.stringify({ moment: "fold", fold: config && Number(config.fold) === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const capacity = Math.max(30, Math.round(p("matblock", "capacity", action)));
            const window = Math.max(45, Math.round(p("matblock", "window", action)));
            const radius = Math.max(1.6, p("matblock", "radius", action));
            const slats = Math.max(6, Math.round(p("matblock", "slats", action)));
            const fibers = Math.max(12, Math.round(p("matblock", "fibers", action)));
            const linkRange = Math.min(32, radius * 1.6 + 1);
            const scale = matBlockScale(radius);
            const reached = matBlockCover(world, actor, radius, window, capacity, slats, fibers, linkRange, scale, WorldGeometry.flatUnit(action.direction()));
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, matBlockScene, 1, feet,
                { moment: "raise", target: String(actor.ref()), slats: slats, fibers: fibers, radius: radius, scale: scale,
                    intensity: Math.max(0.8, Math.min(2, slats / 12 + 0.4)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), matBlockRaiseText,
                [Math.round(capacity), reached, Math.round(window / 20)], 34);
            world.sound("minecraft:block.grass.place", body.position(), 16, "{}");
            world.sound("minecraft:block.wood.place", body.position(), 12, "{}");
            done(action);
        }
    });

    // 席落：身份到期或被清除时，播一次收束留痕（读操作，任何作用域都能发）。
    WorldCombat.on("world_combat:move_matblock/fall", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== matBlockEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, matBlockScene, 1, body.position(), { moment: "fall", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), matBlockFallText, [], 22);
    });
}
