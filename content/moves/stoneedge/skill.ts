/**
 * 尖石攻击 / stoneedge 的出手方式。
 *
 * 核心念头：蹲身把地气压进脚下，裂缝锁定朝一个方向裂开；石刺在缝上「一段一段」朝外顶，谁站在脊带上就被从下方刺中。
 *   起点与方向在释放那一刻锁死，之后施术者再移动也不会拖动裂缝；每一段都要在它自己的位置找到真实承载地表，
 *   断了、越过高墙或台阶太陡就停在上一段——悬崖之后不会悬空继续刺人。原生的 80 命中在这里就是位置判定。
 *
 * 两幕：
 *   起（sunder，提交前）：脚下浮起裂土，只播预告。
 *   裂（spike × segments → hit / pierce / miss）：提交后锁定起点与方向，按 `segments` 逐段找实际地表顶出石刺；
 *       每段判定落在本段脊带里的敌人（每个敌人只结算一次）：第一名吃满 spike，同脊上越靠后的按 pierce 递减；
 *       被成功顶出的段落把既有自然地表留成会合上的裂痕。全部顶完或地表断开就收势。
 *
 * 与同族分开：落石是整片罩下来的岩雨，岩钉是围一圈的石笼，岩崩是多发抛石；尖石攻击是本组唯一的
 * 「沿地面裂开的一条推进脊带」——不接触、直线、靠站位决定命中，并且它记住自己裂到哪。
 */
namespace PokemonSkills {
    /** 一段脊带的四个有序顶点（多边形填充用）；y 取该段真实地表高度。 */
    function stoneedgeBand(from: CombatPoint, to: CombatPoint, side: CombatPoint, half: number): number[][] {
        return [
            [from.x() - side.x() * half, from.y() + 0.05, from.z() - side.z() * half],
            [from.x() + side.x() * half, from.y() + 0.05, from.z() + side.z() * half],
            [to.x() + side.x() * half, to.y() + 0.05, to.z() + side.z() * half],
            [to.x() - side.x() * half, to.y() + 0.05, to.z() - side.z() * half]
        ];
    }

    /**
     * 某一列承载石刺的地表顶面高度：从 `baseY` 允许的上涨范围向下找到第一块可站立的自然方块；
     * 水、岩浆、基岩、屏障或找不到地表时返回 null。返回的是脚踩的高度（方块顶面）。
     */
    function stoneedgeSurface(world: CombatWorld, x: number, z: number, baseY: number): number | null {
        for (var y = Math.floor(baseY + 1.6); y >= Math.floor(baseY - 4); y--) {
            var block = world.block(WorldCombat.point(x, y, z));
            if (block === null) return null;
            var id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air"
                || id === "minecraft:short_grass" || id === "minecraft:tall_grass") continue;
            if (id === "minecraft:bedrock" || id === "minecraft:barrier"
                || id === "minecraft:water" || id === "minecraft:lava") return null;
            return y + 1;
        }
        return null;
    }

    /** 把一段成功裂开处的地表块收进可恢复裂痕；只替换真实自然地表，跳过空气、流体与不可破坏的块。 */
    function stoneedgeCrack(world: CombatWorld, x: number, z: number, topY: number, cells: any[], seen: { [key: string]: boolean }): void {
        var y = Math.floor(topY) - 1, key = x + "," + y + "," + z;
        if (seen[key]) return;
        var block = world.block(WorldCombat.point(x, y, z));
        if (block === null) return;
        var id = String(block.id());
        if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") return;
        if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") return;
        seen[key] = true;
        cells.push({ x: x, y: y, z: z, block: "minecraft:cobbled_deepslate" });
    }

    define({
        id: stoneedgeId,
        cooldownParameter: "recharge",
        name: "Stone Edge",
        description: "蹲身把地气压进脚下，裂缝在释放的一刻锁定朝一个方向裂开：石刺沿真实地表一段段顶出，站在脊带里的人被从下方刺中，第一名吃满威力，同一条脊上越靠后的目标越轻；被顶裂的地面会留在原地再合上。地表断开、越过高墙或台阶太陡时裂缝就停在上一段，不会悬空继续刺人。散刺式把脊铺宽罩住并排的人，尖刺式是窄而长的一条缝。",
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
                JSON.stringify({ moment: "sunder", wide: config && config.wide ? 1 : 0 }));
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
            var side = WorldCombat.point(-direction.z(), 0, direction.x());
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
            var caught: { [ref: string]: boolean } = {}, cells: any[] = [], seen: { [key: string]: boolean } = {};
            var surfaceY = origin.y();
            var step = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                var scope = current.world();
                if (hits === 0) {
                    var flat = origin.plus(direction.scale(reach * 0.7));
                    var at = WorldCombat.point(flat.x(), surfaceY, flat.z());
                    WorldFeedback.emit(scope, stoneedgeScene, 1, at,
                        { moment: "miss", direction: [direction.x(), direction.y(), direction.z()], scale: scale }, 22);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), stoneedgeMissText, [], 24);
                }
                if (cells.length && isFinite(scar) && scar >= 1)
                    scope.terrain(JSON.stringify({ cells: cells, replace: true, linger: true, bestEffort: true }), Math.round(scar));
                done(current);
            }

            function advance(current: CombatAction): void {
                var scope = current.world();
                var inner = reach * step / segments, outer = reach * (step + 1) / segments;
                // 本段沿实际地表采样：断口、越过墙面或台阶太陡就停止延伸。
                var samples = Math.max(2, Math.ceil((outer - inner) / 0.6)), ground: CombatPoint[] = [];
                var previous = surfaceY, continuous = true;
                for (var s = 0; s <= samples; s++) {
                    var along = origin.plus(direction.scale(inner + (outer - inner) * s / samples));
                    var gy = stoneedgeSurface(scope, Math.floor(along.x()), Math.floor(along.z()), previous);
                    if (gy === null || Math.abs(gy - previous) > 1.6) { continuous = false; break; }
                    previous = gy;
                    ground.push(WorldCombat.point(along.x(), gy, along.z()));
                }
                if (!continuous || ground.length < 2) { finish(current); return; }
                surfaceY = previous;
                var from = ground[0], to = ground[ground.length - 1];
                var path = stoneedgeBand(from, to, side, half);
                WorldFeedback.emit(scope, stoneedgeScene, 1, from,
                    { moment: "spike", path: path, index: step + 1, segments: segments, half: half, dust: dust,
                        scale: scale, intensity: intensity, direction: [direction.x(), direction.y(), direction.z()] }, 14);
                scope.sound("cobblemon:impact.rock", from, 14, "{}");
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
                for (var g = 0; g < ground.length; g++) {
                    var gp = ground[g];
                    stoneedgeCrack(scope, Math.floor(gp.x()), Math.floor(gp.z()), gp.y(), cells, seen);
                    if (g % 2 === 0) {
                        var lane = step % 2 === 0 ? 1 : -1;
                        stoneedgeCrack(scope, Math.floor(gp.x() + side.x() * half * lane), Math.floor(gp.z() + side.z() * half * lane), gp.y(), cells, seen);
                    }
                }
                step++;
                if (step >= segments) { finish(current); return; }
                current.after(1, advance);
            }

            sound(action, "minecraft:block.deepslate.break");
            advance(action);
        }
    });
}
