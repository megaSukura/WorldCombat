/**
 * 冰冻光束 / icebeam 的出手方式。
 *
 * 核心念头：把冷气压成一束笔直、停留片刻的冷光——它不飞，沿着瞄准方向整条亮起，并在实际墙面处截断；
 *   被光路穿过的每个人各挨一次冻伤并可能被冻住；光束停留期间会反复扫过这条固定光路，新走进来的人也会
 *   被补中（每人只结算一次）。
 *
 * 两幕（一击完成）：
 *   起（windup，提交前）：嘴边聚起冷雾的预告（action.present）。
 *   驻（beam → impact）：提交后先沿瞄准方向做一次方块射线，确定光束真正能到哪（墙后不亮）；在 beamTicks
 *       内按间隔反复扫过这条固定光路，按距离取最前面的 pierce 个敌人各结算一次冰属性特殊伤害并按
 *       freezeChance 掷冰冻；光束结束的一刻整条同时熄灭。
 *
 * 反制：光束只沿一条固定直线，发出后不再转向；站到线外或切到墙后安全。冰冻是概率，不是必定。
 * 配置 focus（聚焦式）：更窄更短、单体更重、冰冻概率更高，但穿透更少、起手与冷却更久。
 */
namespace PokemonSkills {
    const icebeamScene = "world_combat:move_icebeam";
    const icebeamHitText = "world_combat.move.icebeam.text.hit";
    const icebeamMissText = "world_combat.move.icebeam.text.miss";

    function icebeamCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /**
     * 从 origin 沿 heading 找到光路真正能到的位置：前方有方块就以墙面为界，否则到 maxLength 的尽头。
     * `wall` 是命中方块的格（没有方块时为空），表现据此在墙面结出霜花。
     */
    function icebeamEnd(world: CombatWorld, origin: CombatPoint, heading: CombatPoint, maxLength: number): { end: CombatPoint; wall: CombatPoint | null } {
        const far = origin.plus(heading.scale(maxLength));
        const clip = world.clipBlocks(origin, far);
        if (clip !== null && clip.blocked()) {
            const hitPoint = clip.position();
            const reach = Math.min(maxLength, hitPoint.minus(origin).length());
            const block = clip.blockPosition();
            return { end: origin.plus(heading.scale(reach)), wall: hitPoint };
        }
        return { end: clip === null ? origin : far, wall: null };
    }

    define({
        id: "icebeam",
        cooldownParameter: "wait",
        name: "Ice Beam",
        description: "沿瞄准方向亮起一条笔直冷光，并在实际墙面处截断：光路穿过的每个敌人各挨一次冰属性伤害并可能被冻住；光束停留片刻，期间走进光路的新敌人也会被补中（每人只结算一次）。发出后不再转向，站到线外或墙后安全。聚焦式收窄换更重的一束，扩散式更宽更远。",
        uses: ["隔空贯穿排成一条线的敌人", "对远处的高威胁目标先手点名", "用一条固定光路补中随后走进来的敌人"],
        kind: "aim",
        range: 13,
        maxRange: 18,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 44,
        style: "frost",
        defaults: { focus: false, ai: { maxChase: 16, preferLines: true } },
        fields: [flag("focus", "聚焦式")],
        indicator: function (config, pokemon) {
            return { radius: p("icebeam", "beamLength", pokemon), geometry: "line", style: "frost", color: 0x9FD8F0,
                label: config && config.focus === true ? "冰冻光束·聚焦" : "冰冻光束·扩散" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["icebeam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("icebeam", "tempo", context)),
                recover: Math.round(p("icebeam", "aftermath", context)),
                cooldown: Math.round(p("icebeam", "wait", context)),
                active: skills["icebeam"].active,
                range: p("icebeam", "beamLength", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("icebeam:windup", icebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const at = action.targetPosition();
            const flat = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
            const heading = WorldGeometry.flatUnit(flat, action.direction());
            const maxLength = Math.max(4, p("icebeam", "beamLength", action));
            const halfWidth = Math.max(0.2, p("icebeam", "beamWidth", action));
            const power = p("icebeam", "beam", action);
            const maxTargets = Math.max(1, Math.round(p("icebeam", "pierce", action)));
            const freezeChance = Math.max(0, Math.min(1, p("icebeam", "freezeChance", action)));
            const beamTicks = Math.max(4, Math.round(p("icebeam", "linger", action)));
            let cut = icebeamEnd(world, origin, heading, maxLength);
            let end = cut.end, length = end.minus(origin).length(), scale = length / 13.0;
            const intensity = Math.max(0.6, Math.min(2.4, power / 85));
            const interval = Math.max(2, Math.round(beamTicks / 4));
            let path = [icebeamCoords(origin), icebeamCoords(end)], lastWall = "";
            const direction = [heading.x(), heading.y(), heading.z()];
            const hit: { [ref: string]: boolean } = {};
            const scenes = WorldFeedback.actionScenes(icebeamScene, 1);
            let hits = 0, elapsed = 0, settled = false;

            function caught(current: CombatAction, victim: CombatActor, spot: CombatPoint): void {
                if (!hurt(current, victim, "icebeam", power,
                    { damage: damageSpec("icebeam", "beam"), status: "frozen", chance: freezeChance })) return;
                hits++;
                WorldFeedback.emit(current.world(), icebeamScene, 1, spot,
                    { moment: "impact", target: String(victim.ref()), intensity: intensity, scale: scale }, 22);
                sound(current, "cobblemon:move.icebeam.target_1");
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, function (next) {
                    WorldFeedback.text(next.world(), origin.plus(WorldCombat.point(0, 1.3, 0)),
                        hits > 0 ? icebeamHitText : icebeamMissText, hits > 0 ? [hits] : [], 26);
                    sound(next, "cobblemon:impact.ice");
                    done(next);
                });
            }

            function pass(current: CombatAction): void {
                const scope = current.world();
                cut = icebeamEnd(scope, origin, heading, maxLength);
                end = cut.end; length = end.minus(origin).length(); scale = length / 13.0;
                path = [icebeamCoords(origin), icebeamCoords(end)];
                scenes.show(current, "beam", origin,
                    { moment: "beam", direction: direction, path: path, width: halfWidth, beamTicks: beamTicks,
                        pierce: maxTargets, intensity: intensity, scale: scale,
                        rate: Math.round(90 + power * .7), shardRate: Math.round(20 + power * .2) });
                const wallKey = cut.wall === null ? "" : icebeamCoords(cut.wall).join(",");
                if (cut.wall !== null && wallKey !== lastWall) WorldFeedback.emit(scope, icebeamScene, 1, cut.wall,
                    { moment: "wall", direction: [-direction[0], -direction[1], -direction[2]],
                        impactCount: Math.round(14 + power * .3), intensity: intensity, scale: scale }, 22);
                lastWall = wallKey;
                if (hits < maxTargets && length > .001) {
                    const region = WorldGeometry.lane(origin, heading, length, halfWidth, { below: 2, above: 3 });
                    const candidates: { actor: CombatActor; at: CombatPoint }[] = [];
                    WorldGeometry.selectEnemies(current.world(), region, function (enemy, facts) {
                        if (hit[String(enemy.ref())] || !scope.clear(origin, facts.position())) return;
                        candidates.push({ actor: enemy, at: facts.position() });
                    });
                    candidates.sort(function (a, b) { return a.at.minus(origin).length() - b.at.minus(origin).length(); });
                    for (let i = 0; i < candidates.length && hits < maxTargets; i++) {
                        hit[String(candidates[i].actor.ref())] = true;
                        caught(current, candidates[i].actor, candidates[i].at);
                    }
                }
                elapsed += interval;
                if (elapsed < beamTicks) current.after(interval, pass);
                else finish(current);
            }

            sound(action, "cobblemon:move.icebeam.actor");
            pass(action);
        }
    });
}
