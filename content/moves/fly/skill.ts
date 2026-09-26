/**
 * 飞翔 / Fly — 世界内的动作。
 *
 * 核心念头：跃出近战的射程，在开阔天空里越过战场，再从目标头顶落下来。天空是这招的材料——起手那一刻
 * 头顶有多少净空，就能飞多高；开阔处飞满、一击最重，屋檐或洞穴压顶时只能低跳，威力与压地都缩水。
 *
 * 三幕（提交后由本招自己驱动）：
 *   起（提交前 windup）：蹲身预告，可免费打断，不花 PP。
 *   飞（execute 前半）：直上高空，悬停；悬停期间贴地近战够不着（真在高处），但远程打得中，
 *       且身上挂着真实的 `world_combat:fly_airborne`（共享身份 world_combat:status/fly），落地后结束。
 *       追踪俯冲时每刻把落点钉在目标实时位置；定点击落时沿用起手锁定的那一点。
 *   落（execute 后半）：沿一条直线俯冲下砸。命中活体就按实际高度结算接触伤害并把它向下压、向后推；
 *       定点击落改为在落点范围内压住所有敌人。俯冲路上被方块挡住就落在障碍上，这一击落空。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（impact／hurt → PokemonDamage）与位移（world.displace）
 * 都走同一条路；只有属性相性/本系是宝可梦层。
 */
namespace PokemonSkills {
    const FLY_SCENE = "world_combat:move_fly";
    const FLY_AIRBORNE = "world_combat:fly_airborne";
    const FLY_HEIGHT_TEXT = "world_combat.move.fly.text.height";
    /** 定点击落的落点范围倍率：范围更大、能一次压住一群，但目标走开就落空。 */
    const FLY_PIN_RADIUS = 1.9;
    /** 高度系数下限：天花板压顶时这一击也有全高的一半多。 */
    const FLY_LOW_POWER = 0.55;

    function flyAbove(point: CombatPoint, height: number): CombatPoint { return point.plus(WorldCombat.point(0, height, 0)); }

    /** 头顶到第一块非空气方块之间的净空（身体中心能升多高）；开阔时返回 limit。 */
    function flyHeadroom(world: CombatWorld, body: CombatObservation, limit: number): number {
        var pos = body.position(), top = pos.y() + body.height() * 0.5;
        var steps = Math.ceil(limit * 2) + 2;
        for (var step = 0; step <= steps; step++) {
            var block = world.block(WorldCombat.point(pos.x(), top + step * 0.5, pos.z()));
            if (block !== null && String(block.id()).indexOf("air") < 0) return Math.max(0, step * 0.5 - 0.4);
        }
        return limit;
    }

    define({
        freeMovement: true,
        id: "fly", name: "飞翔",
        description: "跃出近战射程飞上开阔天空，悬停一下再落下来：命中造成接触伤害并把它向下压、向后推。可以瞄准敌人（按配置决定是否追踪），也可以选一个空点定点落下，范围更大、能一次压住一群。头顶净空决定实际能飞多高——开阔处飞满、一击最重，屋檐或洞穴压顶时只能低跳，威力与预告一起缩水；空点落击打到空地不会凭空炸开。悬停期间贴地近战够不着，但远程打得中。",
        uses: ["跳过近战火力从上方落击", "越过矮墙、沟壑与人群", "在有掩体前抢一个高处落点"],
        kind: "aim", range: 10, maxRange: 14, prepare: 8, active: 60, recover: 12, cooldown: 60,
        style: "aerial", stationary: true, maximumTicks: 220,
        defaults: { track: true },
        fields: [field(pathOf("track"), "追踪俯冲", "boolean", { help: "开启（追踪俯冲）：悬停期间落点跟在目标实时位置上，判定窄、单点，适合咬住会走位的目标；关闭（定点击落）：起手锁死落点、范围放大近两倍，能一次压住一群，但目标走开就落空，收招与冷却更长。" })],
        indicator: function (config) {
            return { radius: 1.2, geometry: "line", style: "aerial", color: 0xF2E2B0,
                label: flyTrack(config) ? "追踪俯冲" : "定点击落" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["fly"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            var track = flyTrack(config);
            return {
                prepare: p("fly", "prepare", context),
                recover: p("fly", "recover", context) + (track ? 0 : 4),
                cooldown: p("fly", "cooldown", context) + (track ? 0 : 8),
                active: skills["fly"].active, range: skills["fly"].range
            };
        },
        windup: function (action) {
            var sense = action.sense(), body = sense.observe(action.actor());
            // 预告就用起手那一刻头顶净空能取得的高度，屋顶压顶时低飞预告当场收缩，不承诺飞不到的高度。
            var climb = p("fly", "altitude", action);
            if (body !== null) climb = Math.max(0, Math.min(climb, flyHeadroom(sense, body, climb)));
            action.present("fly-crouch", FLY_SCENE, 1, body ? body.position() : action.origin(),
                JSON.stringify({ moment: "crouch", climb: climb, source: String(action.actor().ref()) }));
            return p("fly", "prepare", action);
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(FLY_SCENE);
            var world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { movementScenes.finish(action, done); return; }
            var target = action.target();
            var targetBody = target === null ? null : world.observe(target);
            // 选了实体就按配置决定是否追踪；选了空点走固定落区支路，落点不再漂移。
            var track = targetBody !== null && flyTrack(config);
            var pin = !track;
            var maxAltitude = p("fly", "altitude", action);
            var climbSpeed = Math.max(0.15, p("fly", "climbSpeed", action));
            var hoverTicks = Math.max(4, Math.round(p("fly", "hoverTicks", action)));
            var diveSpeed = Math.max(0.2, p("fly", "diveSpeed", action));
            var radius = p("fly", "impactRadius", action);
            var press = p("fly", "press", action);
            var push = p("fly", "push", action);
            var glide = p("fly", "glideSpeed", action);
            var ground = body.position();
            var altitude = Math.max(0, Math.min(maxAltitude, flyHeadroom(world, body, maxAltitude)));
            var apexY = ground.y() + altitude;
            var scale = radius / 0.9;
            var locked = targetBody !== null ? targetBody.position() : action.targetPosition();
            var ascendTicks = Math.max(1, Math.ceil(altitude / climbSpeed));
            var finished = false;

            function aimAt(live: CombatWorld): CombatPoint {
                if (track && target !== null) {
                    var live2 = live.observe(target);
                    if (live2 !== null && live2.health() > 0) return live2.position();
                }
                return locked;
            }
            /** 真正取得的高度（可能因中途被挡低于计划高度）。 */
            function climbReached(): number { return Math.max(0, apexY - ground.y()); }
            /** 高度对应的高度系数：0.55 + 0.45 × 实际 / 计划。 */
            function heightFactorAt(reached: number): number {
                return FLY_LOW_POWER + (1 - FLY_LOW_POWER) * Math.min(1, reached / Math.max(0.5, maxAltitude));
            }
            function finish(current: CombatAction): void {
                if (finished) return;
                finished = true;
                MobEffects.consume(current.world(), actor, FLY_AIRBORNE);
                movementScenes.finish(current, done);
            }
            function land(current: CombatAction, at: CombatPoint, primary: CombatImpact | null, blocked: boolean): void {
                var live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                // 伤害按真正取得的高度算：中途被挡只飞到更低处时，这一击也随之变轻。
                var reached = climbReached();
                var factor = heightFactorAt(reached);
                var power = p("fly", "power", current) * factor;
                var from = self.position(), heading = at.minus(from);
                var direction = heading.length() < 0.01 ? current.direction() : heading.unit();
                var hits = 0;
                if (pin) {
                    var reach = radius * FLY_PIN_RADIUS, maxTargets = Math.round(p("fly", "maxTargets", current));
                    var actors = live.query(at, reach, false);
                    for (var i = 0; i < actors.length && hits < maxTargets; i++) {
                        var other = actors[i];
                        if (String(other.ref()) === String(actor.ref()) || live.friendly(other)) continue;
                        var observed = live.observe(other);
                        if (observed === null) continue;
                        var distance = observed.position().minus(at).length();
                        if (distance > reach || !live.clear(at, observed.position())) continue;
                        if (!hurt(current, other, "fly", power * Math.max(0.55, 1 - distance / reach * 0.45))) continue;
                        if (live.valid(other)) live.hitDisplace(other, WorldCombat.point(direction.x() * push, -press * 0.5, direction.z() * push));
                        hits += 1;
                    }
                    WorldFeedback.emit(live, FLY_SCENE, 1, at, { moment: hits > 0 ? "slam" : "whiff", scale: reach / 0.9,
                        intensity: 1 + Math.min(1.5, hits * 0.4), climb: reached, height: Math.round(factor * 100) / 100 }, 44);
                }
                else {
                    if (primary !== null && primary.target() !== null && impact(current, primary, "fly", power, { contact: true })) {
                        if (live.valid(primary.target()!)) live.displace(primary.target()!, WorldCombat.point(direction.x() * push, -press, direction.z() * push));
                        hits = 1;
                    }
                    WorldFeedback.emit(live, FLY_SCENE, 1, at, { moment: blocked ? "blocked" : hits > 0 ? "impact" : "whiff",
                        scale: scale, intensity: 1 + Math.min(1.5, hits * 0.4), climb: reached, height: Math.round(factor * 100) / 100 }, 34);
                }
                WorldFeedback.text(live, flyAbove(at, 1.3), FLY_HEIGHT_TEXT, [Math.round(reached * 10) / 10], 26);
                sound(current, hits > 0 ? "cobblemon:move.aerialace.target" : "minecraft:block.sand.break");
                finish(current);
            }
            function dive(current: CombatAction): void {
                var live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                var at = aimAt(live), from = self.position(), toward = at.minus(from), remaining = toward.length();
                if (remaining <= 0.3) { land(current, at, null, false); return; }
                var direction = toward.unit(), step = Math.min(diveSpeed, remaining), delta = direction.scale(step);
                var swept = sweepStep(current, delta, Math.max(0.4, radius * 0.6)), hit = swept.hit;
                var victim = hit.target();
                if (hit.hitEntity() && victim !== null && !current.sense().friendly(victim)) { land(current, hit.position(), hit, false); return; }
                if (hit.blocked()) { land(current, current.origin(), null, true); return; }
                var moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? live.displace(actor, swept.remaining) : 0);
                if (moved < Math.min(0.05, step * 0.4)) { land(current, current.origin(), null, true); return; }
                current.after(1, function (next) { dive(next); });
            }
            function hover(current: CombatAction, elapsed: number): void {
                movementScenes.stop(current, "rise");
                var live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                var position = self.position();
                if (elapsed >= hoverTicks) {
                    // 俯冲场景从真实身体出发：速度线沿实际下落方向，随身体走完整段下落。
                    movementScenes.show(current, "dive", position,
                        { moment: "dive", scale: scale, climb: climbReached(), height: Math.round(heightFactorAt(climbReached()) * 100) / 100 });
                    dive(current);
                    return;
                }
                // 顶住重力、把自己稳在悬停高度；再朝目标上方水平掠过战场。
                live.displace(actor, WorldCombat.point(0, Math.max(-0.5, Math.min(0.5, apexY - position.y())), 0));
                var at = aimAt(live), flat = WorldCombat.point(at.x() - position.x(), 0, at.z() - position.z());
                if (flat.length() > 0.25) live.displace(actor, flat.unit().scale(Math.min(glide, flat.length())));
                WorldFeedback.keep(live, "fly:mark", FLY_SCENE, 1, at, { moment: "mark", scale: scale, climb: climbReached(), track: track ? 1 : 0 }, 8);
                current.after(1, function (next) { hover(next, elapsed + 1); });
            }
            function ascend(current: CombatAction, step: number): void {
                var live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                if (step >= ascendTicks || self.position().y() >= apexY - 0.05) { hover(current, 0); return; }
                var rise = Math.min(climbSpeed, apexY - self.position().y());
                var moved = live.displace(actor, WorldCombat.point(0, rise, 0));
                if (moved < rise * 0.5) { apexY = self.position().y() + moved; hover(current, 0); return; }
                current.after(1, function (next) { ascend(next, step + 1); });
            }

            sound(action, "cobblemon:move.aerialace.actor_1");
            // The rise column uses fit "none" and reads data.climb directly, so no data.scale here.
            movementScenes.show(action, "rise", ground, { moment: "rise", climb: altitude });
            MobEffects.apply(world, actor, FLY_AIRBORNE, ascendTicks + hoverTicks + 40, 0);
            ascend(action, 0);
        }
    });
}
