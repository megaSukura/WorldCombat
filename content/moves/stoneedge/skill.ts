/**
 * 尖石攻击 / stoneedge 的出手方式。
 *
 * 核心念头：蹲身把地气压进脚下，裂缝朝目标裂开；石刺在裂缝上「一段一段」朝外顶，谁站在脊带上就被从下方刺中。
 *   脊是一段段顶出来的，所以站在远处的人有时间侧移一步——原生的 80 命中在这里就是位置判定。
 *
 * 两幕：
 *   起（sunder，提交前）：脚下浮起裂土，只播预告。
 *   裂（spike × segments → hit / pierce / miss）：提交后按 `segments` 一段段把石刺朝目标方向顶出；
 *       每段判定落在本段脊带里的敌人（每个敌人只结算一次）：第一名吃满 spike，同脊上越靠后的按 pierce 递减；
 *       被刺中的地表被顶裂，裂隙按 `scarTicks` 留在原地再合上。全部顶完才收势。
 *
 * 与同族分开：落石是整片罩下来的岩雨，岩钉是围一圈的石笼，岩崩是多发抛石；尖石攻击是本组唯一的
 * 「沿地面裂开的一条推进脊带」——不接触、直线、靠站位决定命中。
 */
namespace PokemonSkills {
    /** 一段脊带的四个有序顶点（多边形填充用）；y 取脚下高度。 */
    function stoneedgeBand(from: CombatPoint, to: CombatPoint, side: CombatPoint, half: number): number[][] {
        return [
            [from.x() - side.x() * half, from.y() + 0.05, from.z() - side.z() * half],
            [from.x() + side.x() * half, from.y() + 0.05, from.z() + side.z() * half],
            [to.x() + side.x() * half, to.y() + 0.05, to.z() + side.z() * half],
            [to.x() - side.x() * half, to.y() + 0.05, to.z() - side.z() * half]
        ];
    }

    /** 把裂缝沿线顶裂：找到每个采样点下方的第一个实体方块，替换成本层地表；到期原方块回来。 */
    function stoneedgeScar(world: CombatWorld, origin: CombatPoint, direction: CombatPoint, length: number, half: number, ticks: number): void {
        var cells: any[] = [], seen: { [key: string]: boolean } = {};
        var steps = Math.max(3, Math.round(length / 0.7));
        var side = WorldCombat.point(-direction.z(), 0, direction.x());
        for (var i = 0; i <= steps; i++) {
            var along = origin.plus(direction.scale(length * i / steps));
            for (var lane = -1; lane <= 1; lane++) {
                var px = along.x() + side.x() * half * lane, pz = along.z() + side.z() * half * lane;
                var x = Math.floor(px), z = Math.floor(pz), base = Math.floor(along.y());
                for (var dy = 0; dy >= -3; dy--) {
                    var y = base + dy, key = x + "," + y + "," + z, block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    var id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"
                        || id === "minecraft:short_grass" || id === "minecraft:tall_grass") continue;
                    if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                    if (!seen[key] && id !== "minecraft:cobbled_deepslate") {
                        seen[key] = true;
                        cells.push({ x: x, y: y, z: z, block: "minecraft:cobbled_deepslate" });
                    }
                    break;
                }
            }
        }
        if (cells.length && isFinite(ticks) && ticks >= 1) {
            world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true, bestEffort: true }), Math.round(ticks));
        }
    }

    define({
        id: stoneedgeId,
        cooldownParameter: "recharge",
        name: "Stone Edge",
        description: "The user stabs the target with sharpened stones.",
        uses: ["在一条裂缝上把目标刺穿", "隔一段距离先手，把站位逼开", "在地面上留下会合上的裂痕"],
        kind: "enemy",
        range: 5.4,
        maxRange: 7.0,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 42,
        style: "sunder",
        defaults: { wide: false, ai: { maxChase: 11, snipe: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(stoneedgeId, "reach", pokemon) : 5.4, geometry: "cone", style: "sunder",
                color: 0x9A8F82, label: config && config.wide === true ? "散刺式" : "尖刺式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[stoneedgeId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(stoneedgeId, "tempo", context)),
                recover: Math.round(p(stoneedgeId, "aftercast", context)),
                cooldown: Math.round(p(stoneedgeId, "recharge", context)),
                active: 0,
                range: p(stoneedgeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present(stoneedgeScene + ":sunder", stoneedgeScene, 1, action.origin(),
                JSON.stringify({ moment: "sunder", wide: config && config.wide ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world();
            var actor = action.actor();
            var body = world.observe(actor);
            var centre = body === null ? action.origin() : body.position();
            var direction = aim(action);
            var side = WorldCombat.point(-direction.z(), 0, direction.x());
            var power = p(stoneedgeId, "spike", action);
            var reach = Math.max(2.5, action.range());
            var half = Math.max(0.3, p(stoneedgeId, "half", action));
            var segments = Math.max(3, Math.round(p(stoneedgeId, "segments", action)));
            var retain = Math.max(0.4, Math.min(0.9, p(stoneedgeId, "pierce", action)));
            var dust = Math.max(8, Math.round(p(stoneedgeId, "dust", action)));
            var scar = Math.max(40, Math.round(p(stoneedgeId, "scarTicks", action)));
            var scale = Math.max(0.6, Math.min(2.2, reach / 5.4));
            var intensity = Math.max(0.6, Math.min(2.2, power / 96));
            var caught: { [ref: string]: boolean } = {};
            var step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                var scope = current.world();
                if (hits === 0) {
                    var here = scope.observe(current.actor());
                    var at = here === null ? centre : here.position().plus(direction.scale(reach * 0.7));
                    WorldFeedback.emit(scope, stoneedgeScene, 1, at,
                        { moment: "miss", direction: [direction.x(), direction.y(), direction.z()], scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), stoneedgeMissText, [], 24);
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                var scope = current.world();
                var here = scope.observe(current.actor());
                var origin = here === null ? centre : here.position();
                var inner = reach * step / segments, outer = reach * (step + 1) / segments;
                var from = origin.plus(direction.scale(inner)), to = origin.plus(direction.scale(outer));
                var path = stoneedgeBand(from, to, side, half);
                WorldFeedback.emit(scope, stoneedgeScene, 1, origin,
                    { moment: "spike", path: path, index: step + 1, segments: segments, half: half, dust: dust,
                        scale: scale, intensity: intensity, direction: [direction.x(), direction.y(), direction.z()] }, 14);
                world.sound("cobblemon:impact.rock", from, 14, "{}");
                WorldGeometry.selectEnemies(scope,
                    WorldGeometry.lane(from, direction, outer - inner + 0.6, half, { below: 1.6, above: 2.4 }),
                    function (victim, facts) {
                        if (String(victim.ref()) === String(actor.ref())) return;
                        var ref = String(victim.ref());
                        if (caught[ref]) return;
                        caught[ref] = true;
                        var powerNow = power * Math.pow(retain, hits);
                        if (!hurt(current, victim, stoneedgeId, powerNow, { damage: damageSpec(stoneedgeId, "spike") })) return;
                        hits++;
                        var at = scope.observe(victim);
                        var point = at === null ? facts.position() : at.position();
                        WorldFeedback.emit(scope, stoneedgeScene, 1, point,
                            { moment: "pierce", target: ref, power: powerNow, scale: scale,
                                intensity: Math.max(0.5, Math.min(2.2, powerNow / 96)) }, 22);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), stoneedgePierceText, [], 22);
                    });
                step++;
                if (step >= segments) {
                    stoneedgeScar(scope, origin, direction, reach, half, scar);
                    finish(current);
                    return;
                }
                current.after(1, advance);
            }

            sound(action, "minecraft:block.deepslate.break");
            advance(action);
        }
    });
}
