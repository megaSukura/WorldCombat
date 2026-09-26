/**
 * 龙爪 / dragonclaw 的出手方式。
 *
 * 核心念头：**站定、举双爪，朝身前一整片宽面同时划下两道路交叉的巨爪带**——两道爪带同刻判定，
 * 被任一爪带扫到的敌人结算一次原主伤；只有落在**两道爪带交叉中心**、被双爪共同覆盖的目标护甲才被撕开、防御下降。
 * 边缘只被单爪蹭到的目标只受伤、不掉防。它是全组唯一会削弱护甲、也是唯一一次扫一整片的正招。
 *
 * 三幕：
 *   起（rend_up，提交前）：举双爪、龙气沿臂线聚成两道线，只播预告。
 *   扫（sweep，提交后）：从身前交叉中心向两侧各铺一条 `reach` 长、`claw` 半宽、夹角由 `spread` 决定的爪带；
 *       两道爪带同刻取非友方，每人只结算一次 `rend` 接触伤害；中心（两带共同覆盖）再叠 `rendStages` 级防御下降。
 *       判定与画面读同一组爪带顶点；墙后的目标经共享 `world.clear` 排除。
 *   果（strike / rend / claw / miss）：命中处爆开龙系冲击；中心命中补明确的双交叉 `rend`，边缘命中只一条 `claw`。
 *
 * 选取：`kind: "aim"`——可点任意阵营实体或一个世界点，朝方向也能空放；命中权限仍由命中层判断。
 *
 * 与同族分开：劈开是窄走廊、慢、期待要害的单点重劈；连斩是越接越多刀的攒节奏；啄、角撞、木枝突刺都是单点直线；
 * 龙爪凭「两条交叉爪带、中心撕甲、边缘只伤」认出来。
 *
 * 配置 `cross` 由公式改威力、张角与撕甲级别，由 resolve 改时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const dragonclawScene = "world_combat:move_dragonclaw";
    const dragonclawRendText = "world_combat.move.dragonclaw.text.rend";
    const dragonclawMissText = "world_combat.move.dragonclaw.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function dragonclawHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 把水平方向在 X/Z 平面内旋转 `degrees` 度。 */
    function dragonclawRotate(heading: CombatPoint, degrees: number): CombatPoint {
        const angle = degrees * Math.PI / 180, cosine = Math.cos(angle), sine = Math.sin(angle);
        return WorldCombat.point(heading.x() * cosine - heading.z() * sine, 0, heading.x() * sine + heading.z() * cosine);
    }

    /** 一条穿过身前交叉中心 C、偏离正向 `theta` 度的爪带：C 两侧各铺 `halfLength` 格。 */
    function dragonclawStroke(origin: CombatPoint, heading: CombatPoint, reach: number, theta: number, sign: number): CombatPoint[] {
        const centre = origin.plus(heading.scale(reach * 0.55));
        const direction = dragonclawRotate(heading, sign * theta), halfLength = reach * 0.55;
        return [centre.minus(direction.scale(halfLength)), centre.plus(direction.scale(halfLength))];
    }

    /** 爪带判定与画面共用的四个顶点：沿 near→far 的横向半宽 `half` 铺出的窄带矩形。 */
    function dragonclawBandPath(near: CombatPoint, far: CombatPoint, half: number): number[][] {
        const delta = far.minus(near), flat = WorldCombat.point(delta.x(), 0, delta.z());
        const direction = flat.length() < 1e-6 ? WorldCombat.point(1, 0, 0) : flat.unit();
        const side = WorldCombat.point(-direction.z(), 0, direction.x()).scale(half);
        const corners = [near.plus(side), near.minus(side), far.minus(side), far.plus(side)];
        return corners.map(corner => [corner.x(), corner.y(), corner.z()]);
    }

    /** 爪带区域：与描线同一条 near→far 窄带，垂直范围相对施法者身体中心。 */
    function dragonclawBand(near: CombatPoint, far: CombatPoint, half: number, below: number, above: number): WorldGeometry.Region {
        const delta = far.minus(near), flat = WorldCombat.point(delta.x(), 0, delta.z());
        const direction = flat.length() < 1e-6 ? WorldCombat.point(1, 0, 0) : flat.unit();
        return WorldGeometry.lane(near, direction, flat.length(), half, { below: below, above: above });
    }

    /** 目标身上两道短交叉线，组成明确的「双爪」X。 */
    function dragonclawCross(at: CombatPoint, heading: CombatPoint, half: number): CombatPoint[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x()), up = WorldCombat.point(0, 1, 0);
        return [
            [at.plus(side.scale(-half)).plus(up.scale(half * 0.8)), at.plus(side.scale(half)).minus(up.scale(half * 0.8))],
            [at.plus(side.scale(-half)).minus(up.scale(half * 0.8)), at.plus(side.scale(half)).plus(up.scale(half * 0.8))]
        ];
    }

    function dragonclawSegment(from: CombatPoint, to: CombatPoint): number[][] {
        return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
    }

    /** 与 `WorldGeometry.select` 相同的三点采样，用来判断一个身体是否落进某条爪带。 */
    function dragonclawCovers(region: WorldGeometry.Region, facts: CombatObservation): boolean {
        const centre = facts.position(), halfHeight = facts.height() / 2;
        return region.contains(centre) || region.contains(WorldCombat.point(centre.x(), centre.y() - halfHeight, centre.z()))
            || region.contains(WorldCombat.point(centre.x(), centre.y() + halfHeight, centre.z()));
    }

    define({
        id: "dragonclaw",
        cooldownParameter: "recharge",
        name: "Dragon Claw",
        description: "站定、举双爪，朝身前一整片宽面同时划下两道交叉的巨爪带：两道爪带同刻判定，被任一爪带扫到的敌人各结算一次接触伤害；只有落在两带交叉中心、被双爪共同覆盖的目标护甲才被撕开、防御下降，边缘只被单爪蹭到的目标只受伤。它是全组唯一会削弱护甲的一记。",
        uses: ["朝身前同时划下两道交叉的巨爪带", "一次扫到多个正面目标", "对准交叉中心，把厚甲目标的护甲撕开、防御下降"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.4,
        prepare: 9,
        active: 16,
        recover: 8,
        cooldown: 30,
        style: "slash",
        defaults: { cross: false, ai: { maxChase: 6, crowd: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonclaw", "reach", pokemon), geometry: "cone", style: "dragon", color: 0x7A5CFF,
                label: config && config.cross === true ? "龙爪·交叉式" : "龙爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["dragonclaw"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("dragonclaw", "tempo", context)),
                recover: Math.round(p("dragonclaw", "aftercast", context)),
                cooldown: Math.round(p("dragonclaw", "recharge", context)),
                active: skills["dragonclaw"].active,
                range: p("dragonclaw", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_dragonclaw:raise", dragonclawScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", windup: prepare, cross: config && config.cross === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const cross = config && config.cross === true;
            const heading = dragonclawHeading(aim(action));
            const reach = Math.max(2.0, p("dragonclaw", "reach", action));
            const spread = Math.max(60, Math.min(180, p("dragonclaw", "spread", action)));
            const depth = Math.max(1.2, p("dragonclaw", "depth", action));
            const claw = Math.max(0.3, p("dragonclaw", "claw", action));
            const power = p("dragonclaw", "rend", action);
            const stages = Math.max(1, Math.min(2, Math.round(p("dragonclaw", "rendStages", action))));
            const marks = Math.max(8, Math.round(p("dragonclaw", "marks", action)));
            const scale = Math.max(0.6, Math.min(1.9, reach / 2.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 78));
            const direction = [heading.x(), heading.y(), heading.z()];
            const theta = Math.max(20, Math.min(60, spread / 2 * 0.85));

            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const strokeA = dragonclawStroke(origin, heading, reach, theta, 1);
            const strokeB = dragonclawStroke(origin, heading, reach, theta, -1);
            const bandA = dragonclawBand(strokeA[0], strokeA[1], claw, 1.2, depth);
            const bandB = dragonclawBand(strokeB[0], strokeB[1], claw, 1.2, depth);

            sound(action, "cobblemon:move.dragonclaw.actor");
            WorldFeedback.emit(world, dragonclawScene, 1, origin,
                { moment: "sweep", path: dragonclawBandPath(strokeA[0], strokeA[1], claw),
                    direction: direction, reach: reach, spread: spread, marks: marks, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 20);
            WorldFeedback.emit(world, dragonclawScene, 1, origin,
                { moment: "sweep", path: dragonclawBandPath(strokeB[0], strokeB[1], claw),
                    direction: direction, reach: reach, spread: spread, marks: marks, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 20);

            const field = WorldGeometry.sector(origin, heading, reach, spread, { below: 1.2, above: depth });
            const actors = world.query(field.centre(), field.radius(), false);
            let hits = 0;
            for (let index = 0; index < actors.length && hits < 6; index++) {
                const candidate = actors[index];
                const facts = world.observe(candidate);
                if (facts === null || facts.friendly()) continue;
                const coveredA = dragonclawCovers(bandA, facts), coveredB = dragonclawCovers(bandB, facts);
                if (!coveredA && !coveredB) continue;
                const at = facts.position();
                // 墙拦爪带：被方块挡住的正面目标不隔墙被抓。
                if (!world.clear(origin, at)) continue;
                if (!hurt(action, candidate, "dragonclaw", power, { damage: damageSpec("dragonclaw", "rend"), contact: true, slice: true })) continue;
                hits++;
                const centred = coveredA && coveredB;
                if (centred && world.valid(candidate)) NativeEffects.boost(world, candidate, "def", -stages);
                const now = world.observe(candidate);
                const point = now === null ? at : now.position();
                WorldFeedback.emit(world, dragonclawScene, 1, point,
                    { moment: "strike", target: String(candidate.ref()), marks: marks, scale: scale, intensity: intensity }, 20);
                if (centred) {
                    const crossLines = dragonclawCross(point, heading, Math.max(0.45, Math.min(1.0, reach * 0.35)));
                    for (let line = 0; line < crossLines.length; line++)
                        WorldFeedback.emit(world, dragonclawScene, 1, point,
                            { moment: "rend", target: String(candidate.ref()), path: dragonclawSegment(crossLines[line][0], crossLines[line][1]),
                                stages: stages, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.25, 0)), dragonclawRendText, [stages], 22);
                } else {
                    const edge = coveredA ? strokeA : strokeB;
                    WorldFeedback.emit(world, dragonclawScene, 1, point,
                        { moment: "claw", target: String(candidate.ref()), path: dragonclawSegment(edge[0], edge[1]),
                            scale: scale, intensity: intensity }, 18);
                }
            }
            sound(action, hits > 0 ? "cobblemon:impact.dragon" : "minecraft:entity.player.attack.sweep");

            if (hits === 0) {
                WorldFeedback.emit(world, dragonclawScene, 1, origin.plus(heading.scale(reach * 0.75)),
                    { moment: "miss", marks: Math.round(marks * 0.5), scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(heading.scale(reach * 0.75)).plus(WorldCombat.point(0, 1.0, 0)), dragonclawMissText, [], 20);
            }
            done(action);
        }
    });
}
