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
    // 席观察只认「本次席 id」的成员池：在席罩范围内逐个查 guard 的 state.sheet，后来同 rule 的新 guard 不会算进来。
    WorldCombat.effectHandler(matBlockPlane, "watch", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        const body = world.observe(effect.target());
        if (body === null) { effect.end(); return; }
        const reach = Math.max(Number(data.radius) || matBlockReferenceRadius, Number(data.linkRange) || 0);
        const actors = world.query(body.position(), Math.max(1.6, reach), false);
        let alive = false;
        for (let i = 0; i < actors.length && !alive; i++) {
            const guards = world.effects(actors[i], "world_combat:guard");
            for (let g = 0; g < guards.length; g++) {
                let state: any;
                try { state = JSON.parse(String(guards[g].data())); } catch (error) { continue; }
                if (state.rule === matBlockRule && state.sheet === effect.id()) { alive = true; break; }
            }
        }
        if (!alive) { effect.end(); return; }
        effect.schedule("watch", "watch", 8, "{}");
    });
    function matBlockTuple(value: any): CombatPoint | null {
        if (!Array.isArray(value) || value.length !== 3) return null;
        const x = Number(value[0]), y = Number(value[1]), z = Number(value[2]);
        return isFinite(x) && isFinite(y) && isFinite(z) ? WorldCombat.point(x, y, z) : null;
    }
    /** 段从席面正面（+法线）真实穿到背面（−法线）、交点在席面半宽 x 高内；返回真实交点。 */
    function matBlockFace(state: any, from: CombatPoint, to: CombatPoint): CombatPoint | null {
        const p = state.plane, d = state.direction;
        if (!Array.isArray(p) || p.length !== 3 || !Array.isArray(d) || d.length < 3) return null;
        const nx = Number(d[0]), nz = Number(d[2]), length = Math.sqrt(nx * nx + nz * nz);
        if (!(length > 1e-6)) return null;
        const ux = nx / length, uz = nz / length, radius = Number(state.radius), height = Number(state.height);
        if (!(radius > 0) || !(height > 0)) return null;
        const px = Number(p[0]), py = Number(p[1]), pz = Number(p[2]);
        const fa = (from.x() - px) * ux + (from.z() - pz) * uz, fb = (to.x() - px) * ux + (to.z() - pz) * uz;
        if (!(fa > 0) || fb > 0) return null;
        const t = fa / (fa - fb);
        if (!(t >= 0 && t <= 1)) return null;
        const ix = from.x() + (to.x() - from.x()) * t, iy = from.y() + (to.y() - from.y()) * t, iz = from.z() + (to.z() - from.z()) * t;
        if (Math.abs((ix - px) * (-uz) + (iz - pz) * ux) > radius) return null;
        if (iy < py || iy > py + height) return null;
        return WorldCombat.point(ix, iy, iz);
    }
    /** 一处席是否被这次来袭真实穿过：投射物读截至接触的真实弹道段（同 sourceEntity、不早于席创建刻），
     * 非投射物用已知 sourcePosition 到目标身体点；没有真实来源就不假称穿过。返回真实交点或 null。 */
    function matBlockCrossing(world: CombatWorld, target: CombatActor, state: any, data: any): CombatPoint | null {
        const body = world.observe(target);
        if (body === null) return null;
        const to = body.position();
        if (data.directProjectile === true) {
            const created = Number(state.created) || 0, source = String(data.sourceEntity || "");
            const path = Array.isArray(data.projectilePath) ? data.projectilePath : [];
            for (let i = 0; i < path.length; i++) {
                const segment = path[i];
                if (!segment || typeof segment.tick !== "number" || segment.tick < created) continue;
                if (source && String(segment.ownerEntity || "") !== source) continue;
                const from = matBlockTuple(segment.from), end = matBlockTuple(segment.to);
                if (from === null || end === null) continue;
                const hit = matBlockFace(state, from, end);
                if (hit !== null) return hit;
            }
            return null;
        }
        const source = matBlockTuple(data.sourcePosition);
        return source === null ? null : matBlockFace(state, source, to);
    }
    GuardEffects.register(matBlockRule, {
        accepts: function (effect: CombatEffect, state: GuardEffects.State, incoming: GuardEffects.Incoming): boolean {
            const world = effect.world(), target = effect.target(), data: any = incoming.data || {};
            if (!incoming.source || String(incoming.source.ref()) === String(target.ref())) return false;
            if (world.friendly(incoming.source)) return false;
            // 只认真实进攻招式；residual/indirect（旧毒场、残留伤害）由 directOffense 排掉。
            if (!DamageSemantics.directOffense(data)) return false;
            const body = world.observe(target);
            if (body === null) return false;
            const custom: any = state, p = custom.plane, d = custom.direction;
            if (!Array.isArray(p) || p.length !== 3 || !Array.isArray(d) || d.length < 3) return false;
            const nx = Number(d[0]), nz = Number(d[2]), length = Math.sqrt(nx * nx + nz * nz);
            if (!(length > 1e-6)) return false;
            const ux = nx / length, uz = nz / length;
            // 目标必须仍在席面背侧深度内。
            const back = (body.position().x() - Number(p[0])) * ux + (body.position().z() - Number(p[2])) * uz;
            if (back > 0 || back < -Number(custom.depth)) return false;
            const hit = matBlockCrossing(world, target, custom, data);
            if (hit === null) return false;
            (incoming as any).point = hit;
            return true;
        },
        pulse: function (effect: CombatEffect, state: GuardEffects.State): void {
            const world = effect.world(), target = effect.target(), custom: any = state;
            if (MobEffects.read(world, target, matBlockEffect) === null) { effect.end(); return; }
            // 绑定本次载体锚：重施/换载体后旧池不是当前实例，自己结束，不会留席。
            if (custom.carrier && !MobEffects.matches(world, target, custom.carrier)) effect.end();
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
            if (Array.isArray(custom.direction)) data.direction = [Number(custom.direction[0]) || 0, 0, Number(custom.direction[2]) || 0];
            // 命中反馈落在真实交点（投射物弹道/来源与席面的交点），没有交点才退回身体中心。
            const contact: CombatPoint | undefined = (incoming as any).point;
            const at = contact || body.position();
            WorldFeedback.emit(world, matBlockScene, 1, at, data, 22);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), matBlockBlockText,
                [data.blocked, data.remaining], 24);
            world.sound("minecraft:block.grass.place", at, 12, "{}");
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
        const created = world.tick();
        const geometry = { plane: [plane.x(), plane.y(), plane.z()], direction: [direction.x(), 0, direction.z()],
            radius: radius, depth: radius * 2, height: Math.max(2.5, body.height() * 1.5), created: created };
        // 先立席载体拿到本次席 id：guard 的 state.sheet 绑定它，观察只认本席的池，重施会换新 id。
        const sheet = world.effect(matBlockPlane, caster, JSON.stringify({ radius: radius, linkRange: linkRange }), ticks);
        if (!sheet) return 0;
        let reached = 0;
        function protect(actor: CombatActor): void {
            const carrier = MobEffects.apply(world, actor, matBlockEffect, ticks, 0);
            if (carrier === null) return;
            const anchor = MobEffects.anchor(carrier);
            const guard = GuardEffects.apply(world, actor, { plane: geometry.plane, direction: geometry.direction, radius: geometry.radius,
                depth: geometry.depth, height: geometry.height, rule: matBlockRule, mode: "pool", capacity: capacity, fraction: 1,
                minimumHealth: 0, charges: 0, linkRange: linkRange, initial: capacity, slats: slats, fibers: fibers, scale: scale,
                created: created, carrier: anchor, sheet: sheet } as any, ticks);
            // 池真正建成才算覆盖：没成就收回载体，载体与池同寿。
            if (!guard) { world.removeMobEffect(actor, matBlockEffect, anchor.key); return; }
            reached++;
        }
        protect(caster);
        const actors = world.query(body.position(), radius, false);
        for (let i = 0; i < actors.length; i++) {
            const other = actors[i];
            if (String(other.key()) === String(caster.key())) continue;
            if (!world.friendly(other) || world.observe(other) === null) continue;
            protect(other);
        }
        if (reached > 0) {
            const side = WorldCombat.point(-direction.z(), 0, direction.x()).scale(radius), up = WorldCombat.point(0, geometry.height, 0);
            const corners = [plane.minus(side), plane.plus(side), plane.plus(side).plus(up), plane.minus(side).plus(up), plane.minus(side)];
            WorldFeedback.onEffect(world, sheet, "matblock:sheet:" + sheet, matBlockScene, 1, plane,
                { moment: "hold", path: corners.map(p => [p.x(), p.y(), p.z()]), slats: slats, scale: scale });
        } else {
            world.operation(sheet, "world_combat:dispel", "{}");
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
