/**
 * 鼠数儿 / populationbomb 的出手方式。
 *
 * 核心念头：伙伴们从自己身边排好队，然后一只接一只扑向瞄准点——**这一串能拉多长是不确定的**：
 *   每只独立掷命中，扑空一只这串就断。可能是可怜的一下，也可能一连十下。它卖的是「不知道会有几只」。
 *
 * 三幕：
 *   起（windup，提交前）：施法者身边先亮起集结的尘土与细小身影，只播预告。
 *   集（gather，提交后）：按 `comrades` 在身边预留真实可放的位置排出一支短队（宽身体、贴墙时能排几只算几只），
 *     足迹路径随队列变短。
 *   扑（volley，提交后）：从队伍位置依次朝该次释放的瞄准点发出真实投递（每只一格位置，外观是小身影）；
 *     每只独立掷 `accuracy`，掷空就偏航扑空；只有真正撞上非友方活体并由 `impact` 结算出伤害才算命中，
 *     撞墙、目标横移走开或飞出射程都算这一只扑空。一只扑空，这一串立即结束，剩余伙伴自队列四散。
 *     已出发的鼠不追踪，后续出发的鼠只按当刻位置微调瞄准点。上限 `comrades`（至多十只）。
 *
 * 与同族分开：三连箭是三支箭**同时**离弦、骨头回力镖是**同一根骨头去与回**、围攻是**真实在场的同伴**各发一道直线影；
 *   鼠数儿是**自己身边排出的不确定长度队伍**，一只扑空整队散掉——这四招的「多段」结构各不相同。
 *
 * 配置 `swarm` 由公式改上限、威力、命中率与间隔，提交后才触碰世界。
 */
namespace PokemonSkills {
    const populationbombScene = "world_combat:move_populationbomb";
    const populationbombId = "populationbomb";
    const populationbombMissText = "world_combat.move.populationbomb.text.miss";
    const populationbombCapText = "world_combat.move.populationbomb.text.cap";
    /** 队列里一只伙伴的碰撞尺寸；用于 `freeSpace` 预留真实可放的位置。 */
    const populationbombComradeWidth = 0.45;
    const populationbombComradeHeight = 0.45;

    /** 在施术者脚边预留真实可放的位置排出一支队伍；放不下的位置直接少叫一只。 */
    function populationbombQueue(world: CombatWorld, feet: CombatPoint, count: number, ring: number): CombatPoint[] {
        const result: CombatPoint[] = [];
        const golden = 2.399963229728653;
        for (let i = 0; i < count; i++) {
            const angle = i * golden + world.random() * 0.6;
            const radius = ring * (0.72 + 0.28 * (i / Math.max(1, count - 1)));
            const candidate = feet.plus(WorldCombat.point(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
            const spot = LivingActions.freeSpot(world, candidate, populationbombComradeWidth, populationbombComradeHeight, 0.9);
            if (spot !== null) result.push(spot);
        }
        return result;
    }

    /** 把水平方向绕 Y 轴旋转一个角度，用来让掷空的伙伴明显偏航。 */
    function populationbombVeer(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "populationbomb",
        cooldownParameter: "recharge",
        name: "鼠数儿",
        description: "伙伴们从自己身边排好队，然后一只接一只扑向瞄准的实体或空地：每只独立结算一小段伤害、独立掷命中，只有真正撞上目标才造成伤害，扑空一只这一串就断了。能命中 1～10 次，长度不确定；目标横移、隔墙或飞空都会被真实截断。",
        uses: ["叫来一队伙伴连续扑击", "对残血目标用不确定长度的连段收尾", "在对手来不及还手前堆出一串小伤害"],
        kind: "aim",
        range: 7,
        maxRange: 12,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 30,
        maximumTicks: 420,
        style: "swarm",
        defaults: { swarm: true, ai: { maxChase: 9, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("populationbomb", "reach", pokemon), geometry: "area", style: "swarm",
                color: 0xC9B78A, label: config && config.swarm === true ? "鼠海" : "精锐合击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["populationbomb"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("populationbomb", "tempo", context)),
                recover: Math.round(p("populationbomb", "recover", context)),
                cooldown: Math.round(p("populationbomb", "recharge", context)),
                active: skills["populationbomb"].active,
                range: p("populationbomb", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("populationbomb:muster", populationbombScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", swarm: config && config.swarm === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const target = action.target();
            const targetRef = target !== null && world.valid(target) ? String(target.ref()) : null;
            const locked = action.targetPosition();
            const max = Math.max(1, Math.min(10, Math.round(p("populationbomb", "comrades", action))));
            const pounce = p("populationbomb", "swarm", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p("populationbomb", "accuracy", action)));
            const gap = Math.max(2, Math.round(p("populationbomb", "gap", action)));
            const speed = Math.max(0.4, p("populationbomb", "flight", action));
            const radius = p("populationbomb", "radius", action);
            const ring = Math.max(1.5, p("populationbomb", "ring", action));
            const lurk = Math.max(0, p("populationbomb", "lurk", action));
            const motes = Math.max(6, Math.round(p("populationbomb", "motes", action)));
            const muster = Math.max(2, Math.round(p("populationbomb", "muster", action)));
            const swarmMode = !!(config && config.swarm === true);
            const scale = Math.max(0.6, Math.min(2.0, ring / 3.5));
            const intensity = Math.max(0.6, Math.min(2.4, pounce / 13));
            const feet = body.position().minus(WorldCombat.point(0, body.height() * 0.5, 0));
            const queue = populationbombQueue(world, feet, max, ring);
            const cap = Math.min(max, queue.length);
            const scenes = WorldFeedback.actionScenes(populationbombScene);
            const sprite = "cobblemon:particle/generic/ground_bugs";
            let slot = 0, hits = 0, settled = false;

            function settle(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }
            function queuePath(start: number): any[] {
                const path: any[] = [];
                for (let i = start; i < queue.length; i++)
                    path.push([queue[i].x(), queue[i].y() + populationbombComradeHeight * 0.6, queue[i].z()]);
                return path;
            }
            function showQueue(current: CombatAction, start: number): void {
                const scope = current.world(), here = scope.observe(actor);
                scenes.show(current, "muster", here !== null ? here.position() : locked,
                    { moment: "gather", count: Math.max(0, queue.length - start), total: cap, scale: scale,
                        swarm: swarmMode ? 1 : 0, intensity: intensity, motes: motes, path: queuePath(start) });
            }
            /** 整串结束：剩余伙伴自队列四散，并给出真实命中数或断在哪一只。 */
            function scatter(current: CombatAction, lastSlot: number, landed: boolean, at: CombatPoint): void {
                const scope = current.world(), here = scope.observe(actor);
                const remaining = Math.max(0, cap - lastSlot - (landed ? 1 : 0));
                if (here !== null)
                    WorldFeedback.emit(scope, populationbombScene, 1, here.position().plus(WorldCombat.point(0, 0.1, 0)),
                        { moment: "scatter", count: remaining, total: cap, motes: motes, scale: scale, intensity: intensity }, 24);
                if (landed) {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), populationbombCapText, [hits], 28);
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), populationbombMissText, [lastSlot + 1], 26);
                }
            }

            /** 放出一只伙伴：从它自己的队伍位置朝当刻瞄准点扑出；掷空就偏航。 */
            function launch(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const index = slot;
                const from = queue[Math.min(index, queue.length - 1)];
                // 实体目标每次出发前复核位置（已出发者不追踪）；点选空地始终按锁定落点。
                let aimPoint = locked;
                if (targetRef !== null) {
                    const watched = scope.actor(targetRef);
                    const watchedBody = watched !== null && scope.valid(watched) ? scope.observe(watched) : null;
                    if (watchedBody === null) { scatter(current, index, false, locked); settle(current); return; }
                    aimPoint = watchedBody.position();
                }
                aimPoint = aimPoint.plus(WorldCombat.point((scope.random() - 0.5) * 0.5, (scope.random() - 0.5) * 0.25, (scope.random() - 0.5) * 0.5));
                let heading = aimPoint.minus(from);
                if (heading.length() < 0.05) heading = WorldCombat.point(0, 0, 1);
                const distance = heading.length();
                let direction = heading.unit();
                const intendedMiss = scope.random() >= accuracy;
                if (intendedMiss) direction = populationbombVeer(direction, (0.6 + scope.random()) * (0.6 + scope.random()) * (scope.random() < 0.5 ? -1 : 1));
                const arrival = Math.max(3, Math.round(distance / Math.max(0.25, speed)));
                const appeared = { sprite: sprite, scale: Math.max(0.5, Math.min(1.4, radius * 2.6)), glow: true };
                const key = "rush:" + index;
                let struck = false, noted = false, closed = false;
                const flight = current.projectile(from, direction.scale(speed), 0, radius, distance + 2, arrival + 24,
                    function (inner: CombatAction, hit: CombatImpact): void {
                        if (closed) return;
                        const hitWorld = inner.world(), victim = hit.target();
                        let landed = false;
                        // 真实身体碰撞才结算；掷空的那只即使碰到也不给伤害，避免把偏航演成命中。
                        if (!intendedMiss && victim !== null && hitWorld.valid(victim) && !hitWorld.friendly(victim))
                            landed = impact(inner, hit, populationbombId, pounce,
                                { damage: damageSpec(populationbombId, "swarm"), contact: true, slice: true }, "populationbomb:" + index);
                        noted = true;
                        if (landed) {
                            struck = true; hits++;
                            WorldFeedback.emit(hitWorld, populationbombScene, 1, hit.position(),
                                { moment: "hit", target: String(victim!.ref()), count: index + 1, total: cap,
                                    motes: motes, scale: scale, intensity: intensity }, 22);
                            sound(inner, "cobblemon:impact.normal");
                        } else {
                            WorldFeedback.emit(hitWorld, populationbombScene, 1, hit.position(),
                                { moment: "whiff", target: targetRef === null ? "" : targetRef, count: index + 1,
                                    total: cap, scale: scale, intensity: intensity }, 22);
                        }
                    },
                    function (inner: CombatAction): void {
                        if (closed) return;
                        closed = true;
                        scenes.stop(inner, key);
                        if (!struck && !noted)
                            WorldFeedback.emit(inner.world(), populationbombScene, 1, aimPoint,
                                { moment: "whiff", target: targetRef === null ? "" : targetRef, count: index + 1,
                                    total: cap, scale: scale, intensity: intensity }, 22);
                        if (struck && index + 1 < cap) {
                            slot = index + 1;
                            showQueue(inner, slot);
                            inner.after(gap, launch);
                        } else {
                            scatter(inner, index, struck, aimPoint);
                            settle(inner);
                        }
                    }, JSON.stringify(appeared));
                sound(current, "minecraft:entity.rabbit.attack");
                scenes.show(current, key, from, { moment: "rush", projectile: flight, target: targetRef === null ? "" : targetRef,
                    count: index + 1, total: cap, direction: [direction.x(), direction.y(), direction.z()],
                    scale: scale, intensity: intensity, motes: motes });
            }

            if (cap <= 0) { settle(action); return; }
            showQueue(action, 0);
            sound(action, "minecraft:entity.rabbit.ambient");
            action.after(muster, launch);
        }
    });
}
