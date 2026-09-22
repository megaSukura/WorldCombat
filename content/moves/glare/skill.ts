/**
 * 大蛇瞪眼 / Glare — 出手方式。
 *
 * 核心念头：一记瞬发、不飞行的扇形怒目。施法者昂起身体、把腹部的花纹撑开，面前扇形里每一个和它眼睛之间
 *   没有遮挡的敌人一起被镇住。它不造成伤害（原生威力 0），靠的是宽、必中与三式里最长的麻痹；代价是
 *   够得最近、起手最久，而且**必须看得见**——躲到墙后、绕到侧背或站到扇形之外的人完全不受影响。
 *
 * 幕：
 *   起（windup，提交前）：昂首、花纹亮起的预告（`action.present`）。
 *   凝（sweep → caught / avert）：提交后瞬发。用与判定同一组顶点撑起扇形（`WorldGeometry.polygon`），
 *       逐个筛出扇形内、与施法者通视的非友方，各自挂上共享的 `world_combat:status/paralysis`
 *       （宝可梦那一层由共享默认效果同步成原生麻痹）；一个都没罩到时花纹空转消散。
 *
 * 反制：墙、掩体、侧身或拉开距离；电属性对麻痹免疫。麻痹本身让目标有 25% 概率失手，并压低移动速度。
 */
namespace PokemonSkills {
    const glareScene = "world_combat:move_glare";
    const glareCaughtText = "world_combat.move.glare.text.caught";
    const glareAvertText = "world_combat.move.glare.text.avert";

    /** 与判定共用的一组顶点：施法者为角顶，沿朝向前方张开 `angle` 度、半径 `reach` 的扇面边缘。 */
    function glareFan(origin: CombatPoint, direction: CombatPoint, reach: number, angle: number, samples: number): CombatPoint[] {
        const vertices: CombatPoint[] = [origin];
        const base = Math.atan2(direction.z(), direction.x());
        const half = angle * Math.PI / 360;
        for (let i = 0; i <= samples; i++) {
            const a = base - half + (2 * half) * (i / samples);
            vertices.push(WorldCombat.point(origin.x() + Math.cos(a) * reach, origin.y(), origin.z() + Math.sin(a) * reach));
        }
        return vertices;
    }

    function glareCoords(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    define({
        id: glareId,
        name: "Glare",
        description: "The user intimidates the target with the pattern on its belly to cause paralysis.",
        uses: ["一次镇住围上来的一群", "把最硬的近战钉在原地", "逼对手绕开或退到扇形之外"],
        kind: "enemy",
        range: 6,
        maxRange: 11,
        prepare: 11,
        active: 1,
        recover: 7,
        cooldown: 40,
        style: "gaze",
        defaults: { spread: false, ai: { maxChase: 7, preferCrowd: true, leaveStation: true } },
        fields: [
            flag("spread", "张冠")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[glareId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(glareId, "tempo", context)),
                recover: p(glareId, "recover", context),
                cooldown: Math.round(p(glareId, "recharge", context)),
                active: 1,
                range: p(glareId, "gazeReach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("glare:windup:" + action.id(), glareScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", spread: config && config.spread ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[glareId], detail: { values: config } };
            return { radius: p(glareId, "gazeReach", context), geometry: "cone", style: "gaze", color: 0xB48CE8,
                label: config && config.spread === true ? "大蛇瞪眼·张冠" : "大蛇瞪眼·昂首" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const reach = Math.max(1.5, p(glareId, "gazeReach", action));
            const angle = Math.max(30, p(glareId, "gazeAngle", action));
            const lockTicks = Math.max(40, Math.round(p(glareId, "lockTicks", action)));
            const rings = Math.max(2, Math.round(p(glareId, "patternRings", action)));
            const sweepSpeed = Math.max(0.8, p(glareId, "gazeSpeed", action));
            const intensity = Math.max(0.6, Math.min(2.4, lockTicks / 260));
            const vertices = glareFan(origin, aim(action), reach, angle, 8);
            const path = vertices.map(glareCoords);
            sound(action, "cobblemon:move.scaryface.actor");
            WorldFeedback.emit(world, glareScene, 1, origin,
                { moment: "sweep", path: path, reach: reach, angle: angle, rings: rings,
                    flux: Math.round(26 + sweepSpeed * 10), sweep: Math.max(1, Math.round(8 - sweepSpeed)),
                    intensity: intensity, scale: Math.max(0.5, Math.min(2.2, reach / 6)) }, 30);

            let caught = 0;
            WorldGeometry.select(world, WorldGeometry.polygon(vertices, { below: 2, above: 3 }), function (actor, facts) {
                if (String(actor.key()) === String(self.key()) || facts.friendly()) return;
                if (!world.clear(origin, facts.position())) return;
                if (!CombatStatus.inflict(world, actor, "paralysis", lockTicks)) return;
                caught++;
                WorldFeedback.emit(world, glareScene, 1, facts.position(),
                    { moment: "caught", target: String(actor.ref()), intensity: intensity, rings: rings }, 26);
                WorldFeedback.text(world, facts.position(), glareCaughtText, [Math.round(lockTicks / 20)], 30);
            });

            if (caught > 0) {
                world.sound("cobblemon:status.nonvolatile.paralysis.actor", origin, 16, "{}");
            } else {
                WorldFeedback.emit(world, glareScene, 1, origin, { moment: "avert" }, 22);
                WorldFeedback.text(world, origin, glareAvertText, [], 24);
                world.sound("minecraft:block.beacon.deactivate", origin, 14, "{}");
            }
            done(action);
        }
    });
}
