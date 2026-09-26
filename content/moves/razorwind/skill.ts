/**
 * 旋风刀 / razorwind 的出手方式。
 *
 * 核心念头：站定把四周的气流一把把拧成风之刃，蓄够了一口气朝身前甩出一整把扇子——扇面铺到哪，
 *   那一块里的敌人就各挨一记风刃。它是本族唯一「蓄力 + 扇形远程」的一击：蓄力期可被打断，是它的代价。
 *
 * 三幕：
 *   蓄（windup，提交前）：站定，一圈风之刃在身周拧出、越积越多越亮；只播预告，可被打断（打断不花 PP）。
 *   发（release，提交后）：整把扇子沿瞄准方向按距离拆三段依次释放（每段是环扇，判定与表现共用这组顶点）；
 *       提交后方向固定，空扇照常一段段推进。
 *   切（cut → miss）：扇面里距离最近的至多 `blades` 个非友方各挨一记 `blade` 风刃，按所在段在对应时刻结算、每人只一次；
 *       一个都没扫到就落空。
 *   要害（crit，可选）：共享结算判定为暴击时，由本单元的监听器在命中点补一发亮白强调与浮字。
 *
 * 与同族分开：日光束是一条笔直的贯穿光柱、水波刀是细水线、精神利刃是会拐弯的月牙——旋风刀是唯一
 *   先蓄力再把正面铺成一个扇面的远程，玩家从「站定拧刃、越蓄越多、然后整片甩出」认出它。
 *
 * 配置 `spread` 由 resolve 改时序与射程，由公式改扇面／数量／威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 扇面顶点：origin 为扇心，向两侧各张 halfDeg 度、长 reach；判定与表现共用这一组顶点。 */
    function razorwindFan(origin: CombatPoint, direction: CombatPoint, reach: number, halfDeg: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const half = halfDeg * Math.PI / 180, segments = 6, vertices: CombatPoint[] = [origin];
        for (let i = 0; i <= segments; i++) {
            const angle = -half + 2 * half * (i / segments);
            const ray = heading.scale(Math.cos(angle)).plus(side.scale(Math.sin(angle)));
            vertices.push(origin.plus(ray.scale(reach)));
        }
        return vertices;
    }

    function razorwindPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 一段环扇（第 band 段）的顶点：外弧从 −half 到 +half，再沿内弧回到起点；判定与表现共用这组顶点。 */
    function razorwindBand(origin: CombatPoint, direction: CombatPoint, inner: number, outer: number, halfDeg: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const half = halfDeg * Math.PI / 180, segments = 6, vertices: CombatPoint[] = [];
        function ray(angle: number, distance: number): CombatPoint {
            return origin.plus(heading.scale(Math.cos(angle)).plus(side.scale(Math.sin(angle))).scale(distance));
        }
        for (let i = 0; i <= segments; i++) vertices.push(ray(-half + 2 * half * (i / segments), outer));
        if (inner <= 0.05) vertices.push(origin);
        else for (let i = segments; i >= 0; i--) vertices.push(ray(-half + 2 * half * (i / segments), inner));
        return vertices;
    }

    define({
        id: razorwindId,
        cooldownParameter: "recharge",
        name: "Razor Wind",
        description: "站定把四周气流拧成一把把风之刃，蓄够后朝瞄准方向甩出一整片扇面：扇面按距离由近及远分三段依次推进，扇面里最多数名敌人各挨一记风刃，且更容易击中要害；蓄风期间站定、可被打断，打断不消耗 PP。",
        uses: ["站定把气流拧成一把把风之刃", "蓄够了把正前方铺成一个扇面甩出去", "一次扫到成排的敌人，暴击率高一档"],
        kind: "aim",
        range: 8,
        maxRange: 15.5,
        prepare: 26,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "wind",
        stationary: true,
        defaults: { spread: false, ai: { maxChase: 14, minRange: 4, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(razorwindId, "reach", pokemon), geometry: "area", style: "wind", color: 0xC8E8D8,
                label: config && config.spread === true ? "散流旋风刀" : "集刃旋风刀" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[razorwindId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(razorwindId, "chargeTicks", context)),
                recover: Math.round(p(razorwindId, "aftercast", context)),
                cooldown: Math.round(p(razorwindId, "recharge", context)),
                active: 0,
                range: p(razorwindId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const count = Math.max(1, Math.round(p(razorwindId, "blades", action)));
            const motes = Math.max(10, Math.round(p(razorwindId, "motes", action)));
            action.present("world_combat:move_razorwind:charge", razorwindScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", spread: config && config.spread === true, windup: prepare,
                    blades: count, motes: motes }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const direction = aim(action);
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const reach = Math.max(2, p(razorwindId, "reach", action));
            const half = p(razorwindId, "fan", action);
            const cap = Math.max(1, Math.round(p(razorwindId, "blades", action)));
            const power = p(razorwindId, "blade", action);
            const motes = Math.max(10, Math.round(p(razorwindId, "motes", action)));
            const scale = Math.max(0.6, Math.min(2.2, cap / razorwindReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 80));
            const waves = 3, segment = reach / waves, gap = 5, bladeSpec = damageSpec(razorwindId, "blade");

            // Membership is sampled when each visible band reaches it; the cast shares one total cap.
            const struck: { [ref: string]: boolean } = Object.create(null);
            action.releaseTarget();
            sound(action, "minecraft:entity.breeze.wind_burst");

            const scenes = WorldFeedback.actionScenes(razorwindScene);
            let hits = 0;

            function release(current: CombatAction, step: number): void {
                const scope = current.world();
                if (step > 0) scenes.stop(current, "wave" + (step - 1));
                if (step >= waves) {
                    if (hits === 0) {
                        WorldFeedback.emit(scope, razorwindScene, 1, origin.plus(direction.scale(reach * 0.72)).plus(WorldCombat.point(0, 0.6, 0)),
                            { moment: "miss", scale: scale }, 18);
                        WorldFeedback.text(scope, origin.plus(direction.scale(reach * 0.5)).plus(WorldCombat.point(0, 0.9, 0)), razorwindMissText, [], 22);
                    } else {
                        WorldFeedback.text(scope, origin.plus(direction.scale(Math.min(reach, 1.8))).plus(WorldCombat.point(0, 1.0, 0)), razorwindHitText, [hits], 24);
                        sound(action, "cobblemon:impact.normal");
                    }
                    scenes.finish(current, done);
                    return;
                }
                const inner = segment * step, outer = segment * (step + 1);
                scenes.show(current, "wave" + step, origin,
                    { moment: "release", path: razorwindPath(razorwindBand(origin, direction, inner, outer, half)),
                        band: step, waves: waves, direction: [direction.x(), direction.y(), direction.z()],
                        blades: cap, motes: motes, scale: scale, intensity: intensity });
                const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
                WorldGeometry.selectEnemies(scope, WorldGeometry.polygon(razorwindBand(origin, direction, inner, outer, half), { below: 1.2, above: 2.6 }),
                    function (enemy, facts) {
                        if (struck[String(enemy.ref())] || !scope.clear(origin, facts.position())) return;
                        candidates.push({ actor: enemy, at: facts.position() });
                    });
                candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
                for (let index = 0; index < candidates.length && hits < cap; index++) {
                    const candidate = candidates[index], ref = String(candidate.actor.ref());
                    struck[ref] = true;
                    if (!hurt(current, candidate.actor, razorwindId, power, { damage: bladeSpec, slice: true })) continue;
                    hits++;
                    WorldFeedback.emit(scope, razorwindScene, 1, candidate.at,
                        { moment: "cut", target: ref, motes: motes, scale: scale, intensity: intensity }, 22);
                }
                current.after(gap, function (next: CombatAction) { release(next, step + 1); });
            }
            release(action, 0);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记亮白强调与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_razorwind/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== razorwindId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, razorwindScene, 1, at,
            { moment: "crit", target: String(target.ref()), motes: Math.max(10, Math.min(50, Math.round(ratio * 4))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), razorwindCritText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
