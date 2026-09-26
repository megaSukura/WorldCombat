/**
 * 贝壳刃 / razorshell 的出手方式。
 *
 * 核心念头：亮出壳缘，用**外缘那道薄刃**在身前划过去。刀刃中心沿 `reach` 半径的弧在 4 刻内扫过 `arc` 度的范围；
 * 只有身体落在外缘刃厚 `edge` 这一圈的目标才会被削到，贴着身体的内圈不自动挨刀。切中的目标各按几率被削掉
 * 一级防御；壳缘带水，被切开还会被溅湿一段时间，为别的招留一段水湿窗口。
 *
 * 两幕：
 *   起（windup，提交前）：壳缘亮起一道水光，只播预告表现。
 *   扫（carve → shave / miss）：提交后在 4 刻里逐段扫过外缘；每一刻只判定当前这段新月刃，命中的 ref 记进集合，
 *       每个目标最多切一次。判定与表现共用同一段顶点，墙会把对应刃段截短、不补穿墙命中。扫完没人则扫空（miss）。
 *
 * 与同族分开：强力鞭打填满整个扇面、撕裂爪是一道窄走廊的交叉撕抓；只有贝壳刃用**固定距离带上的薄壳缘**切人，
 * 站位（站在刃上与否）比覆盖面更重要。配置 `wide`（揽月式）扫得更宽、削得更勤，`edge` 与凿刃式相同。
 */
namespace PokemonSkills {
    const razorshellScene = "world_combat:move_razorshell";
    const razorshellSoaked = "world_combat:razorshell_soaked";
    const razorshellShaveText = "world_combat.move.razorshell.text.shave";
    const razorshellMissText = "world_combat.move.razorshell.text.miss";
    const razorshellSweepTicks = 4;

    /** 朝 heading 转过 angle 弧度的水平单位方向。 */
    function razorshellTurn(heading: CombatPoint, angle: number): CombatPoint {
        const c = Math.cos(angle), s = Math.sin(angle);
        return WorldCombat.point(heading.x() * c - heading.z() * s, 0, heading.x() * s + heading.z() * c);
    }

    /** 当前这段新月刃覆盖的扇环：以 centerDir 为中线、halfAngle 为半角，径向落在 [inner, outer] 内。 */
    function razorshellCrescent(origin: CombatPoint, centerDir: CombatPoint, halfAngle: number, inner: number, outer: number): WorldGeometry.Region {
        const cos = Math.cos(halfAngle);
        return {
            contains: function (point) {
                const dy = point.y() - origin.y();
                if (dy < -1.6 || dy > 2.2) return false;
                const dx = point.x() - origin.x(), dz = point.z() - origin.z();
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance < inner || distance > outer || distance < 1e-6) return false;
                return (dx * centerDir.x() + dz * centerDir.z()) / distance >= cos - 1e-9;
            },
            centre: function () { return origin; },
            radius: function () { return outer + 2; }
        };
    }

    /** 外缘刃段的世界顶点；判定与表现读同一组角度与半径。 */
    function razorshellBladePath(origin: CombatPoint, baseAngle: number, center: number, halfAngle: number, radius: number, samples: number): number[][] {
        const points: number[][] = [];
        for (let index = 0; index <= samples; index++) {
            const a = baseAngle + center - halfAngle + 2 * halfAngle * (index / samples);
            points.push([origin.x() + Math.cos(a) * radius, origin.y() + 0.05, origin.z() + Math.sin(a) * radius]);
        }
        return points;
    }

    define({
        id: "razorshell",
        cooldownParameter: "recharge",
        name: "Razor Shell",
        description: "亮出壳缘，用外缘那道薄刃在身前扫过一道新月：只有站在外缘刃厚那一圈的目标才会被切中，贴身的内圈不会被扫到。切中的目标各按几率被削掉一级防御，壳缘带水还会把切中的溅湿一段时间。揽月式扫得更宽、削得更勤，凿刃式收成一条窄刃、单下更狠，两者壳缘厚度相同。",
        uses: ["用外缘薄刃在固定距离带切中前排", "一次削掉一排对手的防御", "把切中的目标溅湿，为水湿联动的招留窗口"],
        kind: "aim",
        range: 2.3,
        maxRange: 3.6,
        prepare: 6,
        active: 26,
        recover: 7,
        cooldown: 22,
        style: "slash",
        defaults: { wide: false, ai: { maxChase: 6, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("razorshell", "reach", pokemon) : 2.3, geometry: "line", style: "water",
                color: 0x4AA6D8, label: config && config.wide === true ? "揽月式" : "凿刃式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["razorshell"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(3, Math.round(p("razorshell", "tempo", context))),
                recover: Math.max(3, Math.round(p("razorshell", "aftercast", context))),
                cooldown: Math.max(14, Math.round(p("razorshell", "recharge", context))),
                active: skills["razorshell"].active,
                range: p("razorshell", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:razorshell:sheen", razorshellScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", wide: config && config.wide === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(razorshellScene);
            const world = action.world(), self = action.actor();
            const direction = aim(action);
            const reach = p("razorshell", "reach", action);
            const angle = p("razorshell", "arc", action);
            const edge = p("razorshell", "edge", action);
            const power = p("razorshell", "carve", action);
            const chance = p("razorshell", "shaveChance", action);
            const stages = Math.max(1, Math.round(p("razorshell", "shaveStages", action)));
            const soak = Math.max(20, Math.round(p("razorshell", "soakTicks", action)));
            const push = p("razorshell", "push", action);
            const cap = Math.max(1, Math.round(p("razorshell", "maxTargets", action)));
            const body = world.observe(self);
            const scale = Math.max(0.5, Math.min(2.2, angle / 110));
            const selfRef = String(self.ref());
            const inner = Math.max(0.3, reach - edge), outer = reach + edge * 0.5;
            const totalHalf = Math.max(6, angle) * Math.PI / 360;
            const heading = WorldGeometry.flatUnit(direction);
            const baseAngle = Math.atan2(heading.z(), heading.x());
            const hitRefs: { [ref: string]: boolean } = {};
            let hits = 0, shaved = 0, settled = false;

            sound(action, "minecraft:entity.player.attack.sweep");

            /** 当前一刻：只扫过外缘这一小段新月刃，命中的目标各结算一次。 */
            function sweepStep(current: CombatAction, index: number): void {
                const scope = current.world();
                const observed = scope.observe(self);
                const origin = observed === null ? current.origin() : observed.position();
                const t0 = -totalHalf + 2 * totalHalf * (index / razorshellSweepTicks);
                const t1 = -totalHalf + 2 * totalHalf * ((index + 1) / razorshellSweepTicks);
                const center = (t0 + t1) / 2;
                const halfAngle = Math.max((t1 - t0) / 2, edge / Math.max(0.4, reach));
                const centerDir = razorshellTurn(heading, center);
                const region = razorshellCrescent(origin, centerDir, halfAngle, inner, outer);

                WorldGeometry.select(scope, region, function (victim, facts) {
                    if (facts.friendly() || hits >= cap) return;
                    const ref = String(victim.ref());
                    if (ref === selfRef || hitRefs[ref]) return;
                    // 实墙截刃：从身体到目标被挡住就够不到，不在墙后补命中。
                    if (!scope.clear(origin, facts.position())) return;
                    const landed = hurt(current, victim, "razorshell", power,
                        { damage: damageSpec("razorshell", "carve"), contact: true, slice: true });
                    if (!landed) return;
                    hitRefs[ref] = true; hits++;
                    const away = WorldCombat.point(facts.position().x() - origin.x(), 0, facts.position().z() - origin.z());
                    const out = away.length() < 0.05 ? direction : away.unit();
                    if (scope.valid(victim)) scope.hitDisplace(victim, out.scale(push));
                    // 壳缘带水：切中的目标被溅湿（共享身份 soaked，与水流尾/波动冲/水流裂破是同一件事）。
                    if (!CombatStatus.has(scope, victim, "soaked"))
                        CombatStatus.apply(scope, victim, "soaked", razorshellSoaked, soak);
                    if (scope.random() < chance && scope.valid(victim)) {
                        if (NativeEffects.boost(scope, victim, "def", -stages) !== 0) {
                            shaved++;
                            WorldFeedback.emit(scope, razorshellScene, 1, facts.position(),
                                { moment: "shave", target: ref, stages: stages, sparks: Math.round(10 + stages * 8), scale: scale }, 26);
                        }
                    }
                });

                // 墙截住对应刃段：用原生方块射线求出这段外缘实际能及的距离，表现与判定同半径。
                let span = outer;
                const up = WorldCombat.point(0, 0.5, 0);
                const endAt = origin.plus(WorldCombat.point(Math.cos(baseAngle + center) * outer, 0, Math.sin(baseAngle + center) * outer));
                const clip = scope.clipBlocks(origin.plus(up), endAt.plus(up));
                if (clip !== null && clip.blocked() && !clip.hitEntity()) {
                    const cell = clip.blockPosition();
                    const stop = cell !== null ? cell : clip.position();
                    span = Math.max(0.2, Math.min(outer, stop.minus(origin).length()));
                    WorldFeedback.emit(scope, razorshellScene, 1, stop.plus(WorldCombat.point(0, 0.5, 0)),
                        { moment: "block", scale: scale, swing: index + 1 }, 12);
                }

                scenes.show(current, "blade", origin,
                    { moment: "carve", path: razorshellBladePath(origin, baseAngle, center, halfAngle, span, 5),
                        edge: edge, edgeSize: Math.round((0.14 + edge * 0.1) * 100) / 100,
                        motes: Math.round(power), hits: hits, shaved: shaved, swing: index + 1,
                        direction: [centerDir.x(), centerDir.y(), centerDir.z()], scale: scale });

                if (index + 1 < razorshellSweepTicks) {
                    current.after(1, function (next: CombatAction) { sweepStep(next, index + 1); });
                    return;
                }
                finalize(current, origin);
            }

            /** 扫完：削开过就浮字，没切到人则补一记落空。 */
            function finalize(current: CombatAction, origin: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits > 0) sound(current, "cobblemon:impact.water");
                if (shaved > 0) WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.1, 0)), razorshellShaveText, [shaved], 28);
                if (hits === 0) {
                    WorldFeedback.emit(scope, razorshellScene, 1, origin.plus(WorldCombat.point(0, 0.4, 0)),
                        { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 0.9, 0)), razorshellMissText, [], 20);
                }
                scenes.finish(current, done);
            }

            sweepStep(action, 0);
        }
    });
}
