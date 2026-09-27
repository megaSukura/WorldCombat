/**
 * 龙之波动 / dragonpulse 的出手方式。
 *
 * 核心念头：张大嘴，把一整段龙息压成一圈圈同心波面，沿瞄准线一路推出去；波前扫过排在一条线上的敌人后
 * 不停下、继续前进——它是一条**持续前推的波**，不是一次爆炸。
 *
 * 三幕：
 *   起（windup，提交前）：口前气流向内收拢、一圈将成未成的波面在嘴前成形，只播预告、可被打断。
 *   推（execute → pulse / impact）：提交后波面从嘴前脱手（`LivingActions.projectile`），沿直线推进；
 *       少量稳定竖立波面随原生坐标前推（自定义场景逐刻读 `world.projectilePosition`）。贯通式按
 *       `pierce` 继续穿过后面的人；连锁式在第一个目标处收束，再沿同一条真实 3D 方向逐段扫掠：
 *       墙截断，只有真正落下的伤害计数，首击被拒就不发链。
 *   散（fade）：波推到头自然消散；一名也没扫到就是空放。
 *
 * 选取：`kind: "aim"`——方向或世界点都能瞄，提交后可空放；命中权限仍由命中层判断。
 *
 * 与同族分开：龙息是贴地、由近及远铺满的扇形；音爆是瞬时、无飞行时间的裂痕；龙之怒是固定 40 的重击。
 * 龙之波动是唯一**持续前进、按特攻缩放、能穿过成排目标**的那一击。
 */
namespace PokemonSkills {
    const dragonpulseScene = "world_combat:move_dragonpulse";
    const dragonpulseWaveScene = "world_combat:move_dragonpulse_wave";
    const dragonpulseChainScene = "world_combat:move_dragonpulse_chain";
    const dragonpulseHitText = "world_combat.move.dragonpulse.text.hit";
    const dragonpulseChainText = "world_combat.move.dragonpulse.text.chain";
    const dragonpulseMissText = "world_combat.move.dragonpulse.text.miss";

    define({
        id: "dragonpulse",
        cooldownParameter: "recharge",
        name: "Dragon Pulse",
        description: "张大嘴，把一整段龙息压成一圈圈同心波面，沿瞄准线一路推出去：波前扫过成排的敌人后不停下，继续穿过后面的目标；连锁式则换成在第一个敌人处收束、沿同一条线逐段扫过后续目标，被墙挡住就停下。",
        uses: ["沿直线穿过排成一列的敌人", "中远距离的持续压制", "连锁式沿同一条线逐级穿过后续敌人"],
        kind: "aim",
        range: 8,
        maxRange: 15,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 34,
        style: "pulse",
        defaults: { chain: false, ai: { maxChase: 13, preferLine: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonpulse", "thickness", pokemon) * 2.4, geometry: "line", style: "pulse", color: 0x6FE0C8,
                label: config && config.chain === true ? "龙之波动·连锁" : "龙之波动" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragonpulse"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragonpulse", "tempo", context)),
                recover: Math.round(p("dragonpulse", "aftercast", context)),
                cooldown: Math.round(p("dragonpulse", "recharge", context)),
                active: 0,
                range: p("dragonpulse", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("dragonpulse:windup", dragonpulseScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", chain: config && config.chain === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const chain = !!(config && config.chain);
            const power = p("dragonpulse", "pulse", action);
            const reach = p("dragonpulse", "reach", action);
            const speed = p("dragonpulse", "flight", action);
            const thickness = p("dragonpulse", "thickness", action);
            const rings = Math.max(2, Math.round(p("dragonpulse", "rings", action)));
            const pierce = chain ? 0 : Math.max(0, Math.round(p("dragonpulse", "pierce", action)));
            const burstPower = p("dragonpulse", "burst", action);
            const burstRadius = p("dragonpulse", "burstRadius", action);
            const cap = Math.max(1, Math.round(p("dragonpulse", "maximumTargets", action)));
            const frame = WorldGeometry.basis(aim(action));
            const direction = frame.forward;
            const scale = thickness / 0.42;
            const intensity = Math.max(0.5, Math.min(2.2, power / 76));
            const mouth = origin.plus(WorldCombat.point(0, 0.55, 0));
            let hits = 0, chained = false, struck = false, settled = false, flightId = "";

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            /** 一名被波面扫到的目标：结算对应段，只有真正落下的伤害才记数与播命中。 */
            function strike(current: CombatAction, hit: CombatImpact, amount: number, segment: string, strength: number): boolean {
                const scope = current.world(), victim = hit.target();
                if (victim === null) return false;
                if (!impact(current, hit, "dragonpulse", amount, { damage: damageSpec("dragonpulse", segment), pulse: true })) return false;
                hits++;
                WorldFeedback.emit(scope, dragonpulseScene, 1, hit.position(),
                    { moment: "impact", target: String(victim.ref()), rings: rings, scale: scale, intensity: intensity * strength, hits: hits }, 24);
                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), dragonpulseHitText, [hits], 22);
                return true;
            }

            sound(action, "minecraft:entity.ender_dragon.shoot");
            WorldFeedback.emit(world, dragonpulseScene, 1, mouth,
                { moment: "release", rings: rings, scale: scale, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()] }, 20);

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/orb/energyorb", tint: 0x7FE6D0, glow: true,
                pierce: pierce,
                scale: Math.max(0.5, Math.min(1.4, scale))
            };

            // 少量稳定竖立波面：逐刻读真实弹位，沿真实 3D 方向成串前推（custom scene，不发粒子、不生成实体）。
            const waveKey = "dragonpulse:wave:" + action.id();
            function trace(current: CombatAction): void {
                if (settled || chained) return;
                const scope = current.world();
                const at = scope.projectilePosition(flightId);
                if (at === null) return;
                WorldFeedback.keep(scope, waveKey, dragonpulseWaveScene, 1, at,
                    { direction: [direction.x(), direction.y(), direction.z()],
                        right: [frame.right.x(), frame.right.y(), frame.right.z()],
                        up: [frame.up.x(), frame.up.y(), frame.up.z()],
                        rings: rings, thickness: thickness, intensity: intensity, life: 6, tick: scope.tick() }, 8);
                current.after(1, trace);
            }

            /**
             * 同线连锁：从首击点沿原 3D 方向在剩余路程内先截到真实墙面，选出这条可达走廊里、按前后
             * 顺序排列的敌人，再让链前沿逐刻前扫、到达谁就结算谁（每级 ×0.72）；墙截断、达到上限或
             * 走完剩余路程即停。只有真正落下的伤害才计数，首击被拒不发链。
             */
            function chainFrom(current: CombatAction, firstVictim: CombatActor, firstPoint: CombatPoint): void {
                const scope = current.world();
                const start = firstPoint;
                const travelled = start.minus(origin).length();
                const remaining = Math.max(1.0, reach - travelled);
                const rayEnd = start.plus(direction.scale(remaining));
                // 从首击点略前一点起算墙面，忽略与接触点贴在一起的命中（贴地/贴身），只有真正的墙才截断。
                const wall = remaining > 0.6 ? WorldGeometry.blockHit(scope, start.plus(direction.scale(0.25)), rayEnd) : null;
                const limit = wall !== null && wall.position().minus(start).length() > 0.35 ? wall.position() : rayEnd;
                const corridor = limit.minus(start).length();
                const firstRef = String(firstVictim.ref());
                const corridorRegion = WorldGeometry.bodySegment(start, limit, burstRadius);
                const ordered: { actor: CombatActor; at: CombatPoint; along: number }[] = [];
                const seen: { [ref: string]: boolean } = {};
                function collect(other: CombatActor, facts: CombatObservation): void {
                    if (facts.friendly()) return;
                    const ref = String(other.ref());
                    if (ref === firstRef || seen[ref]) return;
                    const centre = facts.position();
                    const closest = WorldGeometry.closestOnSegment(centre, start, limit);
                    if (centre.minus(closest).length() > burstRadius + Math.max(0.4, facts.width() * 0.5)) return;
                    const delta = centre.minus(start);
                    const along = delta.x() * direction.x() + delta.y() * direction.y() + delta.z() * direction.z();
                    if (along < -0.01) return;
                    seen[ref] = true;
                    ordered.push({ actor: other, at: centre, along: along });
                }
                WorldGeometry.selectBodies(scope, corridorRegion, collect);
                // 再沿可达路径做球查询：真实实体箱走廊之外，略偏离中轴的成列目标也读到。
                const probes = WorldGeometry.along(start, limit, Math.max(0.6, burstRadius));
                for (let probe = 0; probe < probes.length; probe++) {
                    const nearby = scope.query(probes[probe], burstRadius + 0.75, false);
                    for (let index = 0; index < nearby.length; index++) {
                        const facts = scope.observe(nearby[index]);
                        if (facts !== null) collect(nearby[index], facts);
                    }
                }
                ordered.sort(function (a: { along: number }, b: { along: number }) { return a.along - b.along; });

                let extra = 0, index = 0, frontAlong = 0, stopped = false;
                const chainKey = "dragonpulse:chain:" + action.id();
                function publish(scope: CombatWorld): void {
                    const front = start.plus(direction.scale(frontAlong));
                    WorldFeedback.keep(scope, chainKey, dragonpulseChainScene, 1, start,
                        { start: [start.x(), start.y(), start.z()], front: [front.x(), front.y(), front.z()],
                            direction: [direction.x(), direction.y(), direction.z()],
                            right: [frame.right.x(), frame.right.y(), frame.right.z()],
                            up: [frame.up.x(), frame.up.y(), frame.up.z()],
                            width: burstRadius, rings: rings, intensity: intensity, life: 18, tick: scope.tick() }, 24);
                }
                function stopChain(current: CombatAction): void {
                    const scope = current.world();
                    WorldFeedback.keep(scope, chainKey, dragonpulseChainScene, 1, start,
                        { start: [start.x(), start.y(), start.z()], front: [start.x() + direction.x() * corridor, start.y() + direction.y() * corridor, start.z() + direction.z() * corridor],
                            direction: [direction.x(), direction.y(), direction.z()],
                            right: [frame.right.x(), frame.right.y(), frame.right.z()],
                            up: [frame.up.x(), frame.up.y(), frame.up.z()],
                            width: burstRadius, rings: rings, intensity: intensity, life: 8, tick: scope.tick() }, 12);
                    WorldFeedback.text(scope, start.plus(WorldCombat.point(0, 1.35, 0)), dragonpulseChainText, [extra + 1], 24);
                    finish(current);
                }
                function step(current: CombatAction): void {
                    if (settled || stopped) return;
                    const scope = current.world();
                    frontAlong = Math.min(corridor, frontAlong + Math.max(0.25, speed));
                    while (index < ordered.length && extra < cap
                        && Math.min(ordered[index].along, corridor) <= frontAlong + 1e-6) {
                        const decay = Math.pow(0.72, extra);
                        if (hurt(current, ordered[index].actor, "dragonpulse", burstPower * decay,
                            { damage: damageSpec("dragonpulse", "burst"), pulse: true })) {
                            extra++;
                            hits++;
                            WorldFeedback.emit(scope, dragonpulseScene, 1, ordered[index].at,
                                { moment: "impact", target: String(ordered[index].actor.ref()), rings: rings, scale: scale,
                                    intensity: intensity * Math.max(0.3, decay), hits: hits }, 22);
                        }
                        index++;
                    }
                    publish(scope);
                    if (frontAlong >= corridor - 1e-6 || extra >= cap) { stopped = true; stopChain(current); return; }
                    current.after(1, step);
                }
                publish(scope);
                current.after(1, step);
            }

            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, gravity: 0, radius: thickness, direction: direction,
                lifetime: Math.max(30, Math.round(reach / Math.max(0.2, speed) + 30)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    if (chain) {
                        if (chained) return;
                        struck = true;
                        // 首击被原生拒绝就不发成功链，也不记命中。
                        if (!strike(current, hit, power, "pulse", 1)) { finish(current); return; }
                        chained = true;
                        sound(current, "cobblemon:impact.dragon");
                        chainFrom(current, victim, hit.position());
                        return;
                    }
                    if (hits > pierce) return;
                    if (!strike(current, hit, power, "pulse", 1 - Math.min(0.35, hits * 0.06))) return;
                    sound(current, "cobblemon:impact.dragon");
                }
            }, function (current: CombatAction) {
                // 连锁式命中后由逐段前扫的链自己收尾，弹体一撞就结束不能打断它；没命中才在这里散场。
                if (chain && struck) return;
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, dragonpulseScene, 1, body.position().plus(WorldCombat.point(0, 0.55, 0)), { moment: "fade", scale: scale }, 18);
                    if (hits === 0) WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.2, 0)), dragonpulseMissText, [], 20);
                }
                finish(current);
            });
            flightId = flight;
            trace(action);
        }
    });
}
