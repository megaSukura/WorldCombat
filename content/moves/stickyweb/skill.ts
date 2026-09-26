/**
 * 黏黏网 / stickyweb 的出手方式。
 *
 * 核心念头：把一团黏丝抛到选定的地面，摊成一张**有实线和空隙的网**——几条交叉黏线加一圈外环。只有脚部
 *   真实踩到某条线带的目标才会脚步发沉：速度等级每名实体对每张网只降一次，并挂上 `world_combat:stickywebbed`
 *   拖慢移动；离开丝线后这段拖劲按剩余时间自然脱开。网孔可以小步穿行或跳过去，飞在半空的从上方越过。
 *
 * 三幕：
 *   起（windup，提交前）：口边拢起丝光的预告。
 *   抛（toss→spread）：提交后黏丝团沿低弧线飞出、落地摊成半径 webRadius 的网（WorldEffects.field，
 *       规则 `world_combat:hazard/stickyweb` 由本单元注册）；同一片地上再织会先收回旧网、重新计数。
 *   黏（snare→hold）：贴地、且脚部落到线带 band 距离内的非友方被黏——每名实体对这张网只降一次速度等级，
 *       并刷新 `stickywebbed` 拖慢；接在目标身上的拖丝挂在独立托管效果上，随状态或自身时长结束。
 *
 * 线按真实地表裁断：采样脚下地面，只保留与落点同层且未被实墙截断的线段，不穿楼板、不隔墙、不楼上楼下串判。
 * 反制：绕开黏线走网孔、跳过丝线、等它到期（webTicks）；飞在半空的从上方过去。
 */
namespace PokemonSkills {
    function stickywebPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 落点收到地表上方一格；落在水面、岩浆或空中就返回 null。 */
    function stickywebLanding(world: CombatWorld, raw: CombatPoint): CombatPoint | null {
        const point = WorldGeometry.ground(world, raw, 6);
        const below = world.block(WorldCombat.point(point.x(), point.y() - 1, point.z()));
        if (below === null) return null;
        const id = String(below.id());
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return null;
        if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
        return point;
    }

    /** 脚部位置（碰撞箱底面中心）。 */
    function stickywebFoot(body: CombatObservation): CombatPoint {
        return body.position().minus(WorldCombat.point(0, body.height() / 2, 0));
    }

    /** 采样某点脚下一格的地表高度；没有合法支撑（水、岩浆、基岩、屏障、空中）返回 null。 */
    function stickywebSurfaceAt(world: CombatWorld, x: number, z: number, baseY: number): number | null {
        const bx = Math.floor(x), bz = Math.floor(z), by = Math.floor(baseY);
        for (let dy = 1; dy >= -3; dy--) {
            const block = world.block(WorldCombat.point(bx, by + dy, bz));
            if (block === null) return null;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") return null;
            return by + dy + 1;
        }
        return null;
    }

    /** 沿一条候选线采样真实地表并裁剪：只留下与落点同层、且未被实墙截断的连续段。 */
    function stickywebClip(world: CombatWorld, x1: number, z1: number, x2: number, z2: number, baseY: number): number[][] {
        const length = Math.sqrt((x2 - x1) * (x2 - x1) + (z2 - z1) * (z2 - z1));
        if (length < 0.2) return [];
        const steps = Math.max(1, Math.ceil(length / 0.35)), out: number[][] = [];
        let start: number[] | null = null, last: number[] | null = null, wasOk = false;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
            const surface = stickywebSurfaceAt(world, x, z, baseY);
            const ok = surface !== null && Math.abs(surface - baseY) <= 0.75;
            if (ok) {
                if (!wasOk) start = [x, baseY, z];
                last = [x, baseY, z];
            } else if (wasOk && start && last) {
                if (Math.sqrt((last[0] - start[0]) * (last[0] - start[0]) + (last[2] - start[2]) * (last[2] - start[2])) >= 0.5)
                    out.push([start[0], start[1], start[2], last[0], last[1], last[2]]);
                start = null; last = null;
            }
            wasOk = ok;
        }
        if (wasOk && start && last) {
            if (Math.sqrt((last[0] - start[0]) * (last[0] - start[0]) + (last[2] - start[2]) * (last[2] - start[2])) >= 0.5)
                out.push([start[0], start[1], start[2], last[0], last[1], last[2]]);
        }
        return out;
    }

    /** 一张网的判定几何：threads 条交叉直径 + 一圈外环，全部按真实地表裁断后落成有限线段。 */
    function stickywebSegments(world: CombatWorld, point: CombatPoint, radius: number, threads: number): number[][] {
        const out: number[][] = [];
        for (let k = 0; k < threads; k++) {
            const angle = Math.PI * k / threads, dx = Math.cos(angle), dz = Math.sin(angle);
            const clipped = stickywebClip(world, point.x() - dx * radius, point.z() - dz * radius,
                point.x() + dx * radius, point.z() + dz * radius, point.y());
            for (let i = 0; i < clipped.length; i++) out.push(clipped[i]);
        }
        const sides = Math.max(8, Math.round(radius * 3)), ring: number[][] = [];
        for (let i = 0; i <= sides; i++) {
            const angle = (Math.PI * 2 * i) / sides;
            ring.push([point.x() + Math.cos(angle) * radius, point.z() + Math.sin(angle) * radius]);
        }
        for (let i = 1; i < ring.length; i++) {
            const clipped = stickywebClip(world, ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1], point.y());
            for (let j = 0; j < clipped.length; j++) out.push(clipped[j]);
        }
        return out;
    }

    /** 脚部到一条线段在水平面上的最短距离。 */
    function stickywebDistance(x: number, z: number, segment: number[]): number {
        const x1 = segment[0], z1 = segment[2], x2 = segment[3], z2 = segment[5];
        const dx = x2 - x1, dz = z2 - z1, length2 = dx * dx + dz * dz;
        let t = length2 > 1e-9 ? ((x - x1) * dx + (z - z1) * dz) / length2 : 0;
        t = Math.max(0, Math.min(1, t));
        const cx = x1 + dx * t, cz = z1 + dz * t;
        return Math.sqrt((x - cx) * (x - cx) + (z - cz) * (z - cz));
    }

    /** 脚部是否真的踩在某条线带上（同层由调用方保证）。 */
    function stickywebOnThread(field: WorldEffects.Field, foot: CombatPoint): boolean {
        const segments = field.data.segments as number[][], band = Math.max(0.05, Number(field.data.band) || 0.34);
        if (!segments) return false;
        for (let i = 0; i < segments.length; i++) if (stickywebDistance(foot.x(), foot.z(), segments[i]) <= band) return true;
        return false;
    }

    /** 同一片地上自己已织的网先收回：黏黏网不叠层，重织就是刷新时长与数值。 */
    function stickywebRefresh(world: CombatWorld, point: CombatPoint, radius: number): void {
        const own = String(world.source().ref()), found = WorldEffects.areas(world, stickywebRule);
        for (let i = 0; i < found.length; i++) {
            const entry = found[i];
            if (entry.source !== own) continue;
            const centre = WorldCombat.point(entry.position[0], entry.position[1], entry.position[2]);
            if (centre.minus(point).length() > radius + entry.radius) continue;
            world.operation(entry.id, "world_combat:dispel", "{}");
        }
    }

    /** 挂一条随状态存续的拖丝：已有同源拖丝就续期，否则新建；随目标自己持有，状态消失时由清理钩子收回。 */
    function stickywebCarry(world: CombatWorld, actor: CombatActor, ticks: number, stages: number, strands: number): void {
        const views = world.effects(actor, stickywebStrands), own = String(world.source().ref());
        for (let i = 0; i < views.length; i++) {
            if (String(views[i].source().ref()) !== own) continue;
            if (world.operation(views[i].id(), "world_combat:keepalive", JSON.stringify({ ticks: ticks }))) return;
        }
        world.effect(stickywebStrands, actor, JSON.stringify({ stages: stages, strands: strands }), Math.max(20, Math.round(ticks)));
    }

    /** 踩到线带：每名实体对本张网只降一次速度等级，并刷新拖慢；首次踩中才放一次踩中表现。 */
    function stickywebVisit(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, entering: boolean): void {
        if (world.friendly(actor)) return;
        const body = world.observe(actor);
        if (body === null || !body.grounded()) return;
        const foot = stickywebFoot(body);
        if (Math.abs(foot.y() - field.position[1]) > 0.8) return;
        const ref = String(actor.ref()), touch = field.data.touch || (field.data.touch = {});
        if (!stickywebOnThread(field, foot)) { touch[ref] = false; return; }
        const first = !touch[ref];
        touch[ref] = true;
        const stages = Math.max(1, Math.round(Number(field.data.stages) || 1));
        const ticks = Math.max(40, Math.round(Number(field.data.strand) || 100));
        const strands = Math.max(6, Math.round(Number(field.data.strands) || 12));
        const dropped = field.data.dropped || (field.data.dropped = {});
        if (!dropped[ref]) {
            dropped[ref] = true;
            NativeEffects.boost(world, actor, "spe", -stages);
        }
        if (MobEffects.apply(world, actor, stickywebEffect, ticks, 0) === null) return;
        stickywebCarry(world, actor, ticks, stages, strands);
        if (first) {
            WorldFeedback.emit(world, stickywebScene, 1, foot,
                { moment: "snare", target: ref, stages: stages, strands: strands,
                    band: Math.max(0.05, Number(field.data.band) || 0.34), scale: field.radius / 2.6 }, 24);
            world.sound("minecraft:block.cobweb.place", foot, 14, "{}");
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), stickywebSnareText, [stages], 26);
        }
    }

    // 拖丝托管效果：只借一次，随黏身状态存续；每帧按目标位置绑定表现，状态消失时由 mob_effect_removed 收回。
    WorldCombat.effect(stickywebStrands, 1, 400, "actor", function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(stickywebStrands, "start", function (effect: CombatEffect): void {
        const world = effect.world(), body = world.observe(effect.target());
        if (body === null) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        WorldFeedback.onEffect(world, effect.id(), "stickyweb:strand:" + String(effect.target().ref()), stickywebScene, 1, body.position(),
            { moment: "strand", target: String(effect.target().ref()), stages: state.stages || 1, strands: state.strands || 12, hold: effect.remaining() });
    });
    WorldCombat.effectHandler(stickywebStrands, "operation:world_combat:keepalive", function (effect: CombatEffect): void {
        const request = JSON.parse(effect.input() || "{}"), ticks = Math.max(1, Math.round(Number(request.ticks) || 1));
        if (ticks > effect.remaining()) effect.remaining(ticks);
    });
    WorldCombat.effectHandler(stickywebStrands, "operation:world_combat:dispel", function (effect: CombatEffect): void { effect.end(); });
    // 黏身状态被清掉（牛奶、/effect clear、自然到期）后，拖丝不再需要。
    WorldCombat.on("world_combat:move_stickyweb/clear", "world_combat:mob_effect_removed", "", function (event: CombatWorldEvent): void {
        if (String(JSON.parse(String(event.data())).id) !== stickywebEffect) return;
        const world = event.world(), actor = event.actor();
        if (MobEffects.read(world, actor, stickywebEffect) !== null) return;
        world.effects(actor, stickywebStrands).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    // 黏网：只有脚部踩到线带才黏；每名实体对这张网只降一次速度；线按真实地表裁断，随 field 效果存续。
    WorldEffects.fieldRule(stickywebRule, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            stickywebVisit(world, actor, field, true);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            stickywebVisit(world, actor, field, false);
        }
    }, { tags: [WorldEffects.categories.hazard], transferable: true });

    define({
        id: stickywebId,
        cooldownParameter: "recharge",
        name: "黏黏网",
        description: "把一团黏丝抛到选定的地面，摊成几张交叉黏线加一圈外环：只有脚部真实踩到丝线的贴地敌人才会被黏住，速度等级对每名目标只降一次，并在一段时间里被网缠住、脚步发沉；离开丝线后拖劲按剩余时间自然脱开。网孔可以小步穿行或跳过，飞在半空的从上方过去；线按真实地表裁断，不穿墙、不跨层。",
        uses: ["提前把一片地面变成减速区", "缠住冲锋或逃跑的敌人", "压低高速目标的机动"],
        kind: "point",
        range: 8,
        maxRange: 12,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 100,
        style: "stickyweb",
        defaults: { anchored: false },
        fields: [flag("anchored", "深锚")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stickywebId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(stickywebId, "tempo", context)),
                recover: Math.round(p(stickywebId, "recover", context)),
                cooldown: Math.round(p(stickywebId, "recharge", context)),
                active: 0,
                range: p(stickywebId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("stickyweb:windup:" + action.id(), stickywebScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", anchored: config && config.anchored ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[stickywebId], detail: { values: config } };
            return { radius: p(stickywebId, "webRadius", context), geometry: "area", style: "stickyweb", color: 0xE8DC9A,
                label: config && config.anchored === true ? "黏黏网·深锚" : "黏黏网·广铺" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.6, p(stickywebId, "throwSpeed", action));
            const radius = Math.max(1.6, p(stickywebId, "webRadius", action));
            const ticks = Math.max(100, Math.round(p(stickywebId, "webTicks", action)));
            const strand = Math.max(40, Math.round(p(stickywebId, "strandTicks", action)));
            const stages = Math.max(1, Math.round(p(stickywebId, "dropStages", action)));
            const threads = Math.max(3, Math.round(p(stickywebId, "threads", action)));
            const band = Math.max(0.1, p(stickywebId, "band", action));
            const strands = Math.max(8, Math.round(p(stickywebId, "strands", action)));
            const scale = radius / 2.6;
            let spread = false;

            function lay(current: CombatAction, raw: CombatPoint): void {
                if (spread) return;
                spread = true;
                const scope = current.world();
                const point = stickywebLanding(scope, raw);
                if (point === null) {
                    WorldFeedback.emit(scope, stickywebScene, 1, raw, { moment: "fizzle", strands: strands, scale: scale }, 18);
                    sound(current, "minecraft:block.cobweb.place");
                    done(current); return;
                }
                const segments = stickywebSegments(scope, point, radius, threads);
                if (segments.length === 0) {
                    WorldFeedback.emit(scope, stickywebScene, 1, point, { moment: "fizzle", strands: strands, scale: scale }, 18);
                    sound(current, "minecraft:block.cobweb.place");
                    done(current); return;
                }
                stickywebRefresh(scope, point, radius);
                const field = WorldEffects.field(scope, stickywebRule, point, radius,
                    { stages: stages, strand: strand, band: band, threads: threads, strands: strands,
                        segments: segments, dropped: {}, touch: {} }, ticks);
                WorldFeedback.emit(scope, stickywebScene, 1, point,
                    { moment: "spread", radius: radius, threads: threads, band: band, strands: strands, scale: scale }, 32);
                WorldFeedback.onEffect(scope, field, "stickyweb:web:" + field, stickywebWebScene, 1, point,
                    { segments: segments, radius: radius, threads: threads, band: band, scale: scale });
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), stickywebLayText, [], 30);
                sound(current, "minecraft:block.cobweb.place");
                done(current);
            }

            sound(action, "cobblemon:move.stringshot.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.26, gravity: 0.03, lifetime: 100,
                appearance: { sprite: "cobblemon:generic/cotton", scale: 0.75, tint: 0xF2EAC0 },
                impact: function (current, hit) { lay(current, hit.position()); }
            }, function (current) { lay(current, current.targetPosition()); });
            WorldFeedback.emit(world, stickywebScene, 1, action.origin(),
                { moment: "throw", projectile: flight, strands: strands, scale: scale }, 26);
        }
    });
}
