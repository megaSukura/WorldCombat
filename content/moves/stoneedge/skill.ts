/**
 * 尖石攻击 / stoneedge 的出手方式。
 *
 * 核心念头：蹲身把地气压进脚下，裂缝锁定朝一个方向裂开；石刺在缝上「一段一段」朝外顶，谁站在脊带上就被从下方刺中。
 *   起点与方向在释放那一刻锁死，之后施术者再移动也不会拖动裂缝；每一段都要在它自己的位置找到真实承载地表，
 *   断了、越过高墙或台阶太陡就停在上一段——悬崖之后不会悬空继续刺人。原生的 80 命中在这里就是位置判定。
 *
 * 两幕：
 *   起（sunder，提交前）：脚下浮起裂土，只播预告。
 *   裂（spike × segments → hit / pierce / miss）：提交后锁定起点与方向，按 `segments` 逐段用共享 SurfacePaths
 *       沿真实地表推进（抬升/跨步/落步走廊与原生顶面采样）；每段只取实际走到的地表作判定与画面，
 *       下一段未验证的外延一律不算。判定沿本段真实地表逐个小段落带取真实实体箱，竖直上限就是本段石刺升起的高度：
 *       站在脊带里的非友方各吃一次 spike（一名只结算一次），第一名吃满、同脊上越靠后按 pierce 递减。
 *       顶出的短尖石由客户端在该段真实地表上升起再回落，裂痕按真实触地点画线留存 `scarTicks`，不替换任何方块。
 *
 * 与同族分开：落石是整片罩下来的岩雨，岩钉是围一圈的石笼，岩崩是多发抛石；尖石攻击是本组唯一的
 * 「沿地面裂开的一条推进脊带」——不接触、直线、靠站位决定命中，并且它记住自己裂到哪。
 */
namespace PokemonSkills {
    /** 把一段真实地表顶点转成客户端脊带/裂痕用的世界点数组。 */
    function stoneedgeGround(points: CombatPoint[]): number[][] {
        var out: number[][] = [];
        for (var i = 0; i < points.length; i++) out.push([points[i].x(), points[i].y(), points[i].z()]);
        return out;
    }

    /**
     * 本段脊带能到达的真实地表：复用共享 SurfacePaths 的原生顶面采样与抬升/跨步/落步走廊。
     * `up`/`down` 限定台阶陡度，超出就停下，不会隔空延续。
     */
    function stoneedgeStep(world: CombatWorld, from: CombatPoint, direction: CombatPoint, distance: number, spacing: number): SurfacePaths.Step {
        return SurfacePaths.advance(world, from, direction, distance,
            { up: 1.6, down: 1.6, spacing: spacing, samples: Math.max(2, Math.ceil(distance / spacing) + 1) });
    }

    define({
        id: stoneedgeId,
        cooldownParameter: "recharge",
        name: "Stone Edge",
        description: "蹲身把地气压进脚下，裂缝在释放的一刻锁定朝一个方向裂开：石刺沿真实地表一段段顶出，站在脊带里的人被从下方刺中，第一名吃满威力，同一条脊上越靠后的目标越轻；被顶裂的地面会按真实触地点留下会合上的裂痕。地表断开、越过高墙或台阶太陡时裂缝就停在上一段，不会悬空继续刺人。散刺式把脊铺宽罩住并排的人，尖刺式是窄而长的一条缝。",
        uses: ["在一条裂缝上把目标刺穿", "隔一段距离先手，把站位逼开", "在地面上留下会合上的裂痕"],
        kind: "aim",
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
            return { radius: pokemon ? p(stoneedgeId, "reach", pokemon) : 5.4, geometry: "line", style: "sunder",
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
                JSON.stringify({ moment: "sunder", wide: config && config.wide ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            var world = action.world();
            var actor = action.actor();
            var body = world.observe(actor);
            var release = body === null ? action.origin() : body.position();
            // 释放即锁定：起点投到脚下真实地表，方向只取水平分量。
            var origin = WorldGeometry.ground(world, release, 5);
            var direction = WorldGeometry.flatUnit(aim(action), WorldCombat.point(0, 0, 1));
            action.data("world_combat:move_stoneedge/lock", JSON.stringify({
                x: origin.x(), y: origin.y(), z: origin.z(), dx: direction.x(), dz: direction.z() }));
            var power = p(stoneedgeId, "spike", action);
            var reach = Math.max(2.5, action.range());
            var half = Math.max(0.3, p(stoneedgeId, "half", action));
            var segments = Math.max(3, Math.round(p(stoneedgeId, "segments", action)));
            var retain = Math.max(0.4, Math.min(0.9, p(stoneedgeId, "pierce", action)));
            var dust = Math.max(8, Math.round(p(stoneedgeId, "dust", action)));
            var scar = Math.max(40, Math.round(p(stoneedgeId, "scarTicks", action)));
            var scale = Math.max(0.6, Math.min(2.2, reach / 5.4));
            var intensity = Math.max(0.6, Math.min(2.2, power / 96));
            // 每段石刺升起的高度，由本段威力派生：它同时是画面里短尖石的高度与判定用的竖直上限。
            var rise = Math.max(0.6, Math.min(1.5, power / 90));
            var caught: { [ref: string]: boolean } = {};
            var leg = reach / segments;
            var last = origin;
            var step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                var scope = current.world();
                if (hits === 0) {
                    var flat = origin.plus(direction.scale(reach * 0.7));
                    var at = WorldCombat.point(flat.x(), origin.y(), flat.z());
                    WorldFeedback.emit(scope, stoneedgeScene, 1, at,
                        { moment: "miss", direction: [direction.x(), direction.y(), direction.z()], scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), stoneedgeMissText, [], 24);
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                var scope = current.world();
                // 只走实际支持的地表：台阶太陡、断口或高墙让 advance 提前结束。
                var walked = stoneedgeStep(scope, last, direction, leg, 0.6);
                if (walked.path.length < 2) { finish(current); return; }
                var ground = walked.path.slice();
                var from = ground[0];
                var visual = stoneedgeGround(ground);
                // 粒子尘/碎屑沿真实地表中心线铺；不铺满整片矩形。
                WorldFeedback.emit(scope, stoneedgeScene, 1, from,
                    { moment: "spike", path: visual, index: step + 1, segments: segments, half: Math.round(half * 100) / 100,
                        dust: dust, scale: scale, intensity: intensity, direction: [direction.x(), direction.y(), direction.z()] }, 14);
                // 短尖石在该段真实地表升起再回落；裂痕按真实触地点画线留存。
                WorldFeedback.emit(scope, stoneedgeSpikeScene, 1, from,
                    { moment: "spike", path: visual, half: Math.round(half * 100) / 100, rise: Math.round(rise * 100) / 100,
                        dust: dust, scale: scale, intensity: intensity, direction: [direction.x(), direction.y(), direction.z()],
                        start: scope.tick(), duration: 14 }, 16);
                WorldFeedback.emit(scope, stoneedgeCrackScene, 1, from,
                    { moment: "crack", path: visual, half: Math.round(half * 100) / 100, scale: scale,
                        start: scope.tick(), duration: scar }, scar);
                scope.sound("cobblemon:impact.rock", from, 14, "{}");
                // 判定：沿本段真实地表逐个小段落带，用真实实体箱相交；竖直上限就是石刺升起高度。
                for (var s = 0; s < ground.length - 1; s++) {
                    var a = ground[s], b = ground[s + 1];
                    var flat = WorldCombat.point(b.x() - a.x(), 0, b.z() - a.z());
                    if (flat.length() < 0.05) continue;
                    var heading = WorldGeometry.flatUnit(flat, direction);
                    WorldGeometry.selectBodies(scope, WorldGeometry.bodyLane(a, heading, flat.length(), half, { below: 0.4, above: rise }),
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
                }
                last = walked.point;
                step++;
                if (walked.ended || step >= segments) { finish(current); return; }
                current.after(1, advance);
            }

            sound(action, "minecraft:block.deepslate.break");
            advance(action);
        }
    });
}
