/**
 * 龙爪 / dragonclaw 的出手方式。
 *
 * 核心念头：**站定、举双爪，朝身前一整片扇形同时划下两道路交叉的巨爪痕**——正面的敌人一起被抓，
 * 且被抓中的目标护甲被爪尖撕开、防御下降。它是全组唯一会削弱护甲、也是唯一一次扫一整片的正招。
 *
 * 三幕：
 *   起（rend_up，提交前）：举双爪、龙气沿臂线聚成两道线，只播预告。
 *   扫（sweep，提交后）：沿身前 `reach` 格、`spread` 度、高 `depth` 的扇形取非友方，每人结算一次 `rend` 接触伤害，
 *       并在命中处叠一记防御下降 `rendStages` 级；扇面与两道交叉爪痕由同一组顶点画出。
 *   果（strike / rend / miss）：命中爆开龙系冲击与爪痕，落空只留爪风。
 *
 * 与同族分开：劈开是窄走廊、慢、期待要害的单点重劈；连斩是越接越多刀的攒节奏；啄、角撞、木枝突刺都是单点直线；
 * 龙爪凭「宽扇形、一次扫多个、并把护甲撕开」认出来。
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

    /** 扇面判定与画面共用的顶点：origin 起，朝 heading 铺 `reach` 格、张开 `degrees` 度的一片扇形。 */
    function dragonclawFan(origin: CombatPoint, heading: CombatPoint, reach: number, degrees: number): number[][] {
        const half = Math.max(10, Math.min(180, degrees)) / 2 * Math.PI / 180;
        const base = Math.atan2(heading.z(), heading.x());
        const steps = 7, points: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let index = 0; index <= steps; index++) {
            const angle = base + (index / steps * 2 - 1) * half;
            points.push([origin.x() + Math.cos(angle) * reach, origin.y(), origin.z() + Math.sin(angle) * reach]);
        }
        return points;
    }

    /** 一道从斜下扫向斜上（或反向）的爪痕；左右两道交叉成 X。 */
    function dragonclawStroke(origin: CombatPoint, heading: CombatPoint, reach: number, sign: number): number[][] {
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const near = origin.plus(side.scale(sign * reach * 0.45)).plus(heading.scale(reach * 0.2));
        const far = origin.plus(side.scale(-sign * reach * 0.45)).plus(heading.scale(reach * 0.95));
        return [[near.x(), near.y() + 0.6, near.z()], [far.x(), far.y() + 0.6, far.z()]];
    }

    define({
        id: "dragonclaw",
        name: "Dragon Claw",
        description: "The user slashes the target with huge, sharp claws to inflict damage.",
        uses: ["朝身前一整片扇形同时划下巨爪", "一次扫多个正面目标", "把目标的护甲撕开、防御下降"],
        kind: "enemy",
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
            const power = p("dragonclaw", "rend", action);
            const stages = Math.max(1, Math.min(2, Math.round(p("dragonclaw", "rendStages", action))));
            const marks = Math.max(8, Math.round(p("dragonclaw", "marks", action)));
            const scale = Math.max(0.6, Math.min(1.9, reach / 2.5));
            const intensity = Math.max(0.6, Math.min(2.2, power / 78));
            const direction = [heading.x(), heading.y(), heading.z()];

            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const fan = dragonclawFan(origin, heading, reach, spread);

            sound(action, "cobblemon:move.dragonclaw.actor");
            WorldFeedback.emit(world, dragonclawScene, 1, origin,
                { moment: "sweep", path: fan, direction: direction, reach: reach, spread: spread,
                    marks: marks, scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 20);
            WorldFeedback.emit(world, dragonclawScene, 1, origin,
                { moment: "claw", path: dragonclawStroke(origin, heading, reach, 1),
                    scale: scale, intensity: intensity, cross: cross ? 1 : 0 }, 18);
            if (cross)
                WorldFeedback.emit(world, dragonclawScene, 1, origin,
                    { moment: "claw", path: dragonclawStroke(origin, heading, reach, -1),
                        scale: scale, intensity: intensity, cross: 1 }, 18);

            let hits = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.sector(origin, heading, reach, spread, { below: 1.2, above: depth }),
                function (victim, facts) {
                    if (hits >= 6) return;
                    if (!hurt(action, victim, "dragonclaw", power, { damage: damageSpec("dragonclaw", "rend"), contact: true, slice: true })) return;
                    hits++;
                    if (world.valid(victim)) NativeEffects.boost(world, victim, "def", -stages);
                    WorldFeedback.emit(world, dragonclawScene, 1, facts.position(),
                        { moment: "strike", target: String(victim.ref()), marks: marks, scale: scale, intensity: intensity }, 20);
                    WorldFeedback.emit(world, dragonclawScene, 1, facts.position(),
                        { moment: "rend", target: String(victim.ref()), stages: stages, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.25, 0)), dragonclawRendText, [stages], 22);
                });
            sound(action, hits > 0 ? "cobblemon:impact.dragon" : "minecraft:entity.player.attack.sweep");

            if (hits === 0) {
                WorldFeedback.emit(world, dragonclawScene, 1, origin.plus(heading.scale(reach * 0.85)),
                    { moment: "miss", marks: Math.round(marks * 0.5), scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(heading.scale(reach * 0.85)).plus(WorldCombat.point(0, 1.0, 0)), dragonclawMissText, [], 20);
            }
            done(action);
        }
    });
}
