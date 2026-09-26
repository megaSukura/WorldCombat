/**
 * 喷射火焰 / flamethrower 的出手方式。
 *
 * 核心念头：按住喷口、持续压住一条火线扫火——敌人在火里待多久就烧多久。火舌先从身前按 `front` 一截截
 * 长到 `reach`，然后保持喷口；整段喷窗约 20 刻，被切成 4 次接触脉冲，每 5 刻对真实火锥里的每个敌人结算
 * 总威力的 1/4，同一个目标整次最多吃四份。松手或被打断当刻收火，火线被真实方块裁短、墙后没有火伤。
 * 它是唯一可以按住不断调整方向、把一条走廊压着烧的招；火花是一粒点、大字爆炎是一幅字、神圣之火是一团飞火。
 *
 * 三幕：
 *   起（charge，提交前）：喉间与身前聚火，只播预告。
 *   喷（jet / jetwide）：提交后每个 tick 火舌向前伸长一小截并跟随持续瞄准转向；到节奏点对火锥内的敌人
 *       各结算一份。火线按真实方块裁剪，画面与判定读同一份原点、方向与长度。
 *   收（fade）：喷窗结束，余焰与烟散去；松手则当刻收喷。
 */
namespace PokemonSkills {
    const flamethrowerScene = "world_combat:move_flamethrower";
    const flamethrowerBurnText = "world_combat.move.flamethrower.text.burn";
    const flamethrowerHitText = "world_combat.move.flamethrower.text.hit";
    const flamethrowerPulses = 4;

    function flamethrowerVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 持续自由瞄准：优先读按住键时客户端逐刻送来的控制点，AI 或未声明输入时回退到动作方向。 */
    function flamethrowerAim(action: CombatAction): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const aimed = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]);
                const delta = aimed.minus(action.origin());
                if (delta.length() > 0.05) return delta.unit();
            }
        } catch (error) { }
        return action.direction();
    }

    /** 把一条火线裁到第一块实墙；未知方块接触保持原长。 */
    function flamethrowerClip(world: CombatWorld, from: CombatPoint, to: CombatPoint): CombatPoint {
        const hit = world.clipBlocks(from, to);
        return hit === null ? from : hit.blocked() ? hit.position() : to;
    }

    /**
     * 与判定同源的火焰带顶点：窄式是沿横向排开的一束平行火线，宽式是从喷口张开的扇面；
     * 每条火线的远端都用真实方块裁剪，因此墙体把画面和判定一起截断。
     */
    function flamethrowerBand(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, length: number,
        wide: boolean, halfWidth: number, degrees: number): { path: number[][]; regions: WorldGeometry.BodyRegion[] } {
        const flat = WorldGeometry.flatUnit(direction);
        const side = WorldCombat.point(-flat.z(), 0, flat.x());
        const samples = wide ? 7 : 5;
        const vertices: number[][] = [], regions: WorldGeometry.BodyRegion[] = [];
        const normal = WorldCombat.point(direction.y()*side.z(), direction.z()*side.x()-direction.x()*side.z(), -direction.y()*side.x()).unit();
        let previousStart: CombatPoint | null = null, previousEnd: CombatPoint | null = null;
        if (!wide) {
            vertices.push(flamethrowerVertex(origin.minus(side.scale(halfWidth))));
            for (let i = 0; i <= samples; i++) {
                const t = -halfWidth + 2 * halfWidth * i / samples;
                const start = origin.plus(side.scale(t));
                const end = flamethrowerClip(world, start, start.plus(direction.scale(length)));
                vertices.push(flamethrowerVertex(end));
                if (previousStart && previousEnd && (end.minus(start).length() > .001 || previousEnd.minus(previousStart).length() > .001))
                    regions.push(WorldGeometry.bodyPrism([previousStart, previousEnd, end, start], normal, Math.max(.2, Math.min(.5, halfWidth))));
                previousStart = start; previousEnd = end;
            }
            vertices.push(flamethrowerVertex(origin.plus(side.scale(halfWidth))));
        } else {
            const base = Math.atan2(flat.z(), flat.x()), half = degrees * Math.PI / 360;
            vertices.push(flamethrowerVertex(origin));
            for (let i = 0; i <= samples; i++) {
                const angle = base - half + 2 * half * i / samples;
                const ray = WorldCombat.point(Math.cos(angle), 0, Math.sin(angle));
                vertices.push(flamethrowerVertex(flamethrowerClip(world, origin, origin.plus(ray.scale(length)))));
            }
        }
        return { path: vertices, regions: regions };
    }

    define({
        id: "flamethrower",
        cooldownParameter: "recharge",
        name: "Flamethrower",
        description: "按住喷口，从身前持续喷出一道火舌：火舌逐刻向前伸长，沿一条走廊（或一个扇面）压着扫过去。整段喷窗约 20 刻、分 4 次接触脉冲，敌人站在火里每 5 刻吃一份伤害，待满才吃满；被火舌燎到可能被点燃。松手即收，墙会挡住火线。",
        uses: ["按住喷口持续压住一条走廊", "一次燎过挤在一条走廊里的对手", "用扇面一次罩住身前一片并持续灼烧"],
        kind: "aim",
        range: 10,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "flame",
        stationary: true,
        defaults: { wide: false, ai: { maxChase: 13, preferClusters: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("flamethrower", "reach", pokemon), geometry: "line", style: "flame",
                color: 0xFF7A2E, label: config && config.wide === true ? "扇面喷射火焰" : "集束喷射火焰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["flamethrower"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("flamethrower", "tempo", context)),
                recover: Math.round(p("flamethrower", "aftercast", context)),
                cooldown: Math.round(p("flamethrower", "recharge", context)),
                active: 0,
                range: p("flamethrower", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("flamethrower:charge", flamethrowerScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", wide: config && config.wide === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(flamethrowerScene);
            const world = action.world();
            const actor = action.actor();
            const actorRef = String(actor.ref());
            const wide = !!(config && config.wide);
            const power = p("flamethrower", "jet", action);
            const front = p("flamethrower", "front", action);
            const reach = p("flamethrower", "reach", action);
            const halfWidth = p("flamethrower", "halfWidth", action);
            const angle = p("flamethrower", "angle", action);
            const burnChance = Math.max(0, Math.min(1, p("flamethrower", "burnChance", action)));
            const density = Math.max(20, Math.round(p("flamethrower", "density", action)));
            const cap = Math.max(1, Math.round(p("flamethrower", "maxTargets", action)));
            const window = Math.max(flamethrowerPulses, Math.round(p("flamethrower", "spray", action)));
            const interval = Math.max(1, Math.round(window / flamethrowerPulses));
            const share = power / flamethrowerPulses;
            const perBurn = burnChance >= 1 ? 1 : 1 - Math.pow(1 - burnChance, 1 / flamethrowerPulses);
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const armour = Math.max(0.2, Math.min(0.5, wide ? 0.4 : halfWidth));
            const counts: { [ref: string]: number } = {};
            let distinct = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                const at = body !== null ? body.position() : current.origin();
                WorldFeedback.emit(scope, flamethrowerScene, 1, at, { moment: "fade", intensity: intensity, density: density }, 26);
                if (distinct > 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), flamethrowerHitText, [distinct], 24);
                sound(current, "minecraft:block.fire.extinguish");
                scenes.finish(current, done);
            }

            /** 一次接触脉冲：只有真实火锥内、墙没挡住的目标才吃一份，每个目标整次最多 flamethrowerPulses 份。 */
            function pulse(current: CombatAction, origin: CombatPoint, direction: CombatPoint, length: number, band: { path: number[][]; regions: WorldGeometry.BodyRegion[] }): void {
                const scope = current.world();
                const visit = function (enemy: CombatActor, facts: CombatObservation): void {
                    if (scope.friendly(enemy)) return;
                    const ref = String(enemy.ref());
                    if (ref === actorRef) return;
                    const known = Object.prototype.hasOwnProperty.call(counts, ref), count = known ? counts[ref] : 0;
                    if (count >= flamethrowerPulses) return;
                    if (!known && distinct >= cap) return;
                    const contact = scope.closestPoint(enemy, origin);
                    if (contact === null) return;
                    const sight = scope.clipBlocks(origin, contact);
                    if (sight === null || sight.blocked()) return;
                    if (!known) { counts[ref] = 0; distinct++; }
                    const already = CombatStatus.has(scope, enemy, "burn");
                    if (!hurt(current, enemy, "flamethrower", share,
                        { damage: damageSpec("flamethrower", "jet"), status: "burn", chance: perBurn })) return;
                    counts[ref] = count + 1;
                    landedThisPulse++;
                    WorldFeedback.emit(scope, flamethrowerScene, 1, facts.position(),
                        { moment: "hit", target: ref, count: Math.max(8, Math.round(8 + power * 0.2)), intensity: intensity }, 22);
                    if (!already && CombatStatus.has(scope, enemy, "burn"))
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), flamethrowerBurnText, [], 26);
                };
                let landedThisPulse = 0;
                if (wide) WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, length, angle, { below: 1.5, above: 2.5 }), visit);
                else {
                    const extent = WorldCombat.point(length + halfWidth, length + halfWidth, length + halfWidth);
                    const region: WorldGeometry.BodyRegion = { boundsMin: () => origin.minus(extent), boundsMax: () => origin.plus(extent),
                        intersects: (min, max) => band.regions.some(piece => piece.intersects(min, max)) };
                    WorldGeometry.selectBodies(scope, region, visit);
                }
                if (landedThisPulse > 0) sound(current, "cobblemon:impact.fire");
            }

            function advance(current: CombatAction, elapsed: number): void {
                if (settled) return;
                const scope = current.world();
                const body = scope.observe(actor);
                if (body === null) { finish(current); return; }
                const origin = body.position();
                const raw = flamethrowerAim(current), direction = wide ? WorldGeometry.flatUnit(raw) : raw;
                const length = Math.min(reach, front * elapsed);
                current.stopMovement();
                current.face(origin.plus(direction), 18, 18);
                const band = elapsed > 0 ? flamethrowerBand(scope, origin, direction, length, wide, halfWidth, angle) : { path: [], regions: [] };
                if (elapsed > 0) {
                    const head = flamethrowerClip(scope, origin, origin.plus(direction.scale(length)));
                    scenes.show(current, "jet", origin, {
                        moment: wide ? "jetwide" : "jet", length: length,
                        path: band.path,
                        point: flamethrowerVertex(head), head: flamethrowerVertex(head),
                        direction: [direction.x(), direction.y(), direction.z()],
                        density: density, intensity: intensity
                    });
                }
                if (elapsed > 0 && elapsed % interval === 0) pulse(current, origin, direction, length, band);
                if (elapsed >= interval * flamethrowerPulses) { finish(current); return; }
                current.after(1, function (next: CombatAction) { advance(next, elapsed + 1); });
            }

            sound(action, "cobblemon:move.flamethrower.actor");
            const body = world.observe(actor);
            WorldFeedback.emit(world, flamethrowerScene, 1, body !== null ? body.position() : action.origin(),
                { moment: "charge", wide: wide, intensity: intensity }, 16);
            advance(action, 0);
        }
    });

    // 按住技能键持续喷火并逐刻调整方向；松手（world_combat:input-stop）由动作生命周期当刻收喷。
    WorldCombat.preview("world_combat:flamethrower", JSON.stringify({ input: { version: 1, steps: ["point"], sustained: true } }));
}
