/**
 * 杂技 / acrobatics —— 注册与动作。
 *
 * 两幕：提交前下蹲蓄势（windup，身体压成弹簧，风丝从脚边扬起），提交后一次连续的短侧弧腾身。
 * 提交即沿瞄准偏侧的方向掠出：先向该侧鼓出、中途有限抬身，再在目标身侧可容身的弧线上切入；
 * 弧线上真实首接触才结算这一次主伤，之后只借余势收出 carry 段绕过目标。
 * 没有可容身的侧弧（侧向空域、顶棚或落脚点不成立）时，收住弧线做一次有限的贴身短撞，够不到就落空，不免费穿体。
 * 自身没有携带道具时，身体更轻：这一翻翻倍。
 * 它与同族另外三招的区别在于本招不碰对手的东西——力量来自“自己手里什么都没有”。
 */
namespace PokemonSkills {
    const acrobaticsScene = "world_combat:move_acrobatics";
    const acrobaticsBareText = "world_combat.move.acrobatics.text.bare";
    const acrobaticsStrikeText = "world_combat.move.acrobatics.text.strike";
    const acrobaticsMissText = "world_combat.move.acrobatics.text.miss";

    /** 二次贝塞尔采样（含两端，共 segments + 1 个点）；控制点 b 决定弧向哪一侧鼓出。 */
    function acrobaticsBezier(a: CombatPoint, b: CombatPoint, c: CombatPoint, segments: number): CombatPoint[] {
        var points: CombatPoint[] = [];
        for (var i = 0; i <= segments; i++) {
            var t = i / segments, u = 1 - t;
            points.push(a.scale(u * u).plus(b.scale(2 * u * t)).plus(c.scale(t * t)));
        }
        return points;
    }

    /** 目标身侧可容身的横向余量：双方半宽之外再留一点。skill 与 AI 共用同一份几何。 */
    export function acrobaticsClearance(selfWidth: number, targetWidth: number): number {
        return (selfWidth + targetWidth) * Math.SQRT1_2 + 0.15;
    }
    /** 一处真实可站落点：原生顶面支撑 + 与起跳同层高 + 完整身体箱空域。悬空端点不成立。 */
    export function acrobaticsStandable(world: CombatWorld, point: CombatPoint, width: number, height: number, floorY: number, tolerance: number): boolean {
        var at = SurfacePaths.support(world, point, 4, 4);
        if (at === null || Math.abs(at.y() - floorY) > tolerance) return false;
        return world.freeSpace(WorldCombat.point(point.x(), at.y() + 0.05, point.z()), width, height);
    }
    /** 累加有序顶点从 first 到 last（闭区间）的三维折线长。 */
    function acrobaticsLength(points: CombatPoint[], first: number, last: number): number {
        var total = 0;
        for (var i = first + 1; i <= last; i++) total += points[i].minus(points[i - 1]).length();
        return total;
    }
    /** 把有序路径裁到累计三维长不超过 budget：保留起点，从尾端截断。 */
    function acrobaticsTrim(points: CombatPoint[], budget: number): CombatPoint[] {
        var result: CombatPoint[] = [points[0]], used = 0;
        for (var i = 1; i < points.length; i++) {
            var delta = points[i].minus(points[i - 1]), segment = delta.length();
            if (used + segment > budget + 1e-6) {
                var left = budget - used;
                if (left > 1e-6) result.push(points[i - 1].plus(delta.unit().scale(left)));
                break;
            }
            used += segment; result.push(points[i]);
        }
        return result;
    }

    function acrobaticsStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var movementScenes = WorldFeedback.actionScenes(acrobaticsScene);
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("acrobatics", "reach", action), speed = p("acrobatics", "step", action);
        var radius = p("acrobatics", "collisionRadius", action), push = p("acrobatics", "push", action);
        var carry = p("acrobatics", "carry", action), motes = p("acrobatics", "motes", action);
        var body = world.observe(actor);
        var scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var bare = acrobaticsHeldOf(world, actor) === null;
        action.releaseTarget();
        sound(action, "cobblemon:move.aerialace.actor_1");
        movementScenes.show(action, "launch", action.origin(), { moment: "launch", scale: scale, motes: Math.round(motes), bare: bare ? 1 : 0, intensity: bare ? 1.6 : 1 });
        if (body === null) { movementScenes.finish(action, done); return; }

        var start = body.position(), selfWidth = body.width(), selfHeight = body.height();
        var minimumMove = p("acrobatics", "minimumMove", action);
        var target = action.target();
        var targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
        var aimPoint = action.targetPosition();
        var targetCentre = targetBody !== null ? targetBody.position() : aimPoint;
        var targetWidth = Math.max(0.25, targetBody !== null ? targetBody.width() : 0.9);
        var toTarget = WorldCombat.point(targetCentre.x() - start.x(), 0, targetCentre.z() - start.z());
        var span = toTarget.length();
        var forward = span > 0.01 ? toTarget.unit() : WorldGeometry.flatUnit(direction);
        var side = WorldCombat.point(-forward.z(), 0, forward.x());
        var er = Math.max(selfWidth / 2, Math.min(1, radius));
        var contactLat = Math.max(0.3, targetWidth / 2 + er - 0.08);
        var clearance = acrobaticsClearance(selfWidth, targetWidth);
        var swingLat = clearance + 0.3;
        var contactZone = targetWidth / 2 + selfWidth / 2 + 0.1;
        var startGround = WorldGeometry.ground(world, start, 4);
        var approachPoints = 7;

        // 腾身高度只够跨过低障：按速度给一点抬升，被顶棚截短；落脚支撑在下面统一校验。
        var rise = Math.min(1.2, Math.max(0.5, speed));
        var ceiling = world.clipBlocks(start.plus(WorldCombat.point(0, 0.4, 0)), start.plus(WorldCombat.point(0, rise + 0.7, 0)));
        var ceilingBlock = ceiling !== null && ceiling.blocked() ? ceiling.blockPosition() : null;
        if (ceilingBlock !== null) rise = Math.max(0, Math.min(rise, ceilingBlock.y() - start.y() - 0.45));

        // 局部瞄点偏侧决定首选翻身侧；瞄点居中时两侧都试。
        var aimLateral = (aimPoint.x() - targetCentre.x()) * side.x() + (aimPoint.z() - targetCentre.z()) * side.z();
        var preferred = aimLateral > 0.05 ? 1 : aimLateral < -0.05 ? -1 : 0;

        function flatPoint(lateral: number, ahead: number): CombatPoint {
            return WorldCombat.point(start.x() + side.x() * lateral + forward.x() * ahead, start.y(),
                start.z() + side.z() * lateral + forward.z() * ahead);
        }
        function aroundTarget(lateral: number, ahead: number): CombatPoint {
            return WorldCombat.point(targetCentre.x() + side.x() * lateral + forward.x() * ahead, start.y(),
                targetCentre.z() + side.z() * lateral + forward.z() * ahead);
        }
        /** 沿该侧绕开目标身体后再前进 carry 格的收势点，与既有总位移预算一致。 */
        function exitPoint(sign: number): CombatPoint { return aroundTarget(sign * clearance, clearance + carry); }

        /** 一条连续的短侧弧：鼓出 → 切入目标身侧的接触点 → 收出到 exit。水平面内铺设，抬身另行结算。 */
        function buildPath(sign: number): CombatPoint[] {
            var entry = aroundTarget(sign * contactLat, 0);
            var swing = flatPoint(sign * swingLat, span * 0.45);
            var path = acrobaticsBezier(start, swing, entry, approachPoints - 1);
            var exit = exitPoint(sign), tangent = entry.minus(swing);
            if (tangent.length() < 0.01) tangent = forward;
            var control = entry.plus(tangent.unit().scale(Math.max(0.3, carry * 0.6)));
            var tail = acrobaticsBezier(entry, control, exit, 4);
            for (var j = 1; j < tail.length; j++) path.push(tail[j]);
            return path;
        }
        /** 侧弧要真的容得下身体：跳过自身与接触区，其余采样点要求原生空域。 */
        function laneOpen(path: CombatPoint[]): boolean {
            for (var i = 1; i < path.length - 1; i++) {
                var at = path[i];
                var sx = at.x() - start.x(), sz = at.z() - start.z();
                if (Math.sqrt(sx * sx + sz * sz) < selfWidth + 0.35) continue;
                var tx = at.x() - targetCentre.x(), tz = at.z() - targetCentre.z();
                if (Math.sqrt(tx * tx + tz * tz) < contactZone) continue;
                var up = i < approachPoints ? rise * Math.sin(Math.PI * i / (approachPoints - 1)) : 0;
                var feet = at.plus(WorldCombat.point(0, up + 0.05, 0)).minus(WorldCombat.point(0, selfHeight / 2, 0));
                if (!world.freeSpace(feet, selfWidth, selfHeight)) return false;
            }
            return true;
        }
        /** 收势点脚下要有真实顶面支撑、与起跳点同层高，并容得下完整身体箱；悬空终点不成立。 */
        function supported(point: CombatPoint): boolean {
            return acrobaticsStandable(world, point, selfWidth, selfHeight, startGround.y(), 1.8);
        }
        var chosenSign = 0;
        function choosePath(): CombatPoint[] | null {
            var first = preferred !== 0 ? preferred : 1, order = [first, -first], budget = length + carry;
            for (var i = 0; i < order.length; i++) {
                var candidate = buildPath(order[i]);
                // 接触点本身也要落在 reach+carry 总位移预算内；其余余势按总量裁短。超预算侧弧不采用。
                if (acrobaticsLength(candidate, 0, approachPoints - 1) > budget + 1e-6) continue;
                var trimmed = acrobaticsTrim(candidate, budget);
                if (laneOpen(trimmed) && supported(trimmed[trimmed.length - 1])) { chosenSign = order[i]; return trimmed; }
            }
            return null;
        }

        var path: CombatPoint[] | null = choosePath();
        var carrying = false, settled = false, travelled = 0;

        function finish(current: CombatAction, whiff: boolean, at?: CombatPoint): void {
            if (settled) return;
            settled = true;
            var scope = current.world(), me = scope.observe(actor);
            var here = at !== undefined ? at : me !== null ? me.position() : current.origin();
            if (whiff) {
                WorldFeedback.emit(scope, acrobaticsScene, 1, here, { moment: "miss", scale: scale, motes: Math.round(motes) }, 20);
                WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.1, 0)), acrobaticsMissText, [], 22);
            }
            movementScenes.finish(current, done);
        }
        /** 一次主伤：真实接触回执、伤害占比驱动的表现；被原生拒绝时不发成功提示与位移。 */
        function resolveHit(current: CombatAction, victim: CombatActor, point: CombatPoint, hit: CombatImpact): void {
            var scope = current.world();
            var before = scope.observe(victim), maximum = before ? Math.max(1, before.maxHealth()) : 1;
            var landed = impact(current, hit, "acrobatics", p("acrobatics", "roll", current), { damage: damageSpec("acrobatics", "roll"), contact: true });
            if (!landed) {
                // 命中原生拒绝：只留中性的碰撞/收势，不发成功冲击、音效、浮字与顶开。
                WorldFeedback.emit(scope, acrobaticsScene, 1, point, { moment: "miss", scale: scale, motes: Math.round(motes) }, 20);
                return;
            }
            var after = scope.valid(victim) ? scope.observe(victim) : null;
            var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
            var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
            WorldFeedback.emit(scope, acrobaticsScene, 1, point, { moment: "impact", target: String(victim.ref()),
                intensity: intensity, scale: scale, motes: Math.round(motes * (0.7 + intensity * 0.2)), bare: bare ? 1 : 0 }, 30);
            sound(current, "cobblemon:impact.flying");
            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), bare ? acrobaticsBareText : acrobaticsStrikeText, [], 28);
            if (scope.valid(victim)) scope.hitDisplace(victim, direction.scale(push));
        }
        /** 真实接触停在目标表面后，余势从当前位置向外绕出，不再回穿目标；按剩余总预算裁短。 */
        function carryFrom(from: CombatPoint, sign: number, budget: number): CombatPoint[] {
            var control = WorldCombat.point(from.x() + side.x() * sign * Math.max(0.4, clearance * 0.5) + forward.x() * carry * 0.4, from.y(),
                from.z() + side.z() * sign * Math.max(0.4, clearance * 0.5) + forward.z() * carry * 0.4);
            return acrobaticsTrim(acrobaticsBezier(from, control, exitPoint(sign), 4), budget);
        }
        /** 没有安全侧弧：一次有限的贴身短撞；够不到或撞墙就落空。 */
        function closeStrike(current: CombatAction): void {
            var short = Math.min(length, Math.max(0.8, contactLat + 0.5)), moved = 0;
            function advance(c: CombatAction): void {
                var live = c.world(), here = live.observe(actor);
                if (here === null) { finish(c, false); return; }
                var swept = sweepStep(c, forward.scale(Math.max(0, Math.min(speed, short - moved))), radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    var victim = hit.target();
                    if (victim !== null && !live.friendly(victim)) resolveHit(c, victim, hit.position(), hit);
                    finish(c, victim === null || live.friendly(victim));
                    return;
                }
                moved += swept.moved;
                if (hit.blocked() || swept.moved < minimumMove || moved >= short) { finish(c, true, hit.position()); return; }
                c.after(1, advance);
            }
            advance(current);
        }

        function follow(current: CombatAction, index: number, elapsed: number): void {
            var scope = current.world(), self = scope.observe(actor);
            if (self === null) { finish(current, false); return; }
            if (path === null) { closeStrike(current); return; }
            if (index >= path.length || elapsed > 60) { finish(current, !carrying); return; }
            // 侧弧全程铺在水平面：逐刻只走水平，抬身另用一次竖直位移，避免与重力互相抵消。
            var now = self.position(), to = path[index];
            var delta = WorldCombat.point(to.x() - now.x(), 0, to.z() - now.z()), gap = delta.length();
            if (gap <= 0.05) { follow(current, index + 1, elapsed); return; }
            if (!carrying && rise > 0 && chosenSign !== 0) {
                var climb = index < approachPoints ? start.y() + rise * Math.sin(Math.PI * index / (approachPoints - 1)) : start.y();
                var dy = climb - now.y();
                if (Math.abs(dy) > 0.04) scope.displace(actor, WorldCombat.point(0, Math.max(-0.4, Math.min(0.4, dy)), 0));
            }
            var stepDelta = delta.unit().scale(Math.min(speed, gap));
            if (!carrying) {
                var swept = sweepStep(current, stepDelta, radius), hit = swept.hit;
                travelled += swept.moved;
                if (hit.hitEntity()) {
                    var victim = hit.target();
                    if (victim === null || scope.friendly(victim)) { finish(current, true, hit.position()); return; }
                    carrying = true;
                    resolveHit(current, victim, hit.position(), hit);
                    var after = scope.observe(actor), remaining = Math.max(0, length + carry - travelled);
                    path = carryFrom(after !== null ? after.position() : self.position(), chosenSign !== 0 ? chosenSign : 1, Math.min(carry, remaining));
                    index = 0;
                } else if (hit.blocked()) { finish(current, true, hit.position()); return; }
                else if (swept.moved < minimumMove) { finish(current, true, hit.position()); return; }
                else if (swept.remaining.length() > 0.001) travelled += scope.displace(actor, swept.remaining);
            } else {
                var carried = scope.displace(actor, stepDelta);
                travelled += carried;
                if (carried < minimumMove) { finish(current, false); return; }
            }
            current.after(1, function (next: CombatAction) { follow(next, index, elapsed + 1); });
        }
        follow(action, 0, 0);
    }

    define({
        freeMovement: true,
        id: "acrobatics",
        name: "杂技",
        description: "先向瞄准偏侧腾身，沿一条短侧弧切入目标身侧；弧线上真实接触时结算这一击，随后借余势从身侧掠过。自身没有携带道具时，这一翻威力翻倍。没有可容身的侧路时只做一次贴身短撞。",
        uses: ["空手时的一次轻盈侧身突进", "从对方身侧腾身切入并换位", "带着沉重道具时当作普通飞行撞击"],
        kind: "enemy",
        range: 3,
        maxRange: 6,
        prepare: 3,
        active: 0,
        recover: 5,
        cooldown: 18,
        style: "dash",
        defaults: { sweep: false, ai: { maxChase: 12, leaveStation: false, emptyOnly: false } },
        fields: [flag("sweep", "长掠")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["acrobatics"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var sweep = !!(config && config.sweep);
            return { prepare: Math.round(p("acrobatics", "charge", context)), recover: 5 + (sweep ? 3 : 0), cooldown: 18, active: 0,
                range: p("acrobatics", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var bare = acrobaticsHeldOf(action.sense(), action.actor()) === null;
            action.present("world_combat:acrobatics:" + action.id(), acrobaticsScene, 1, action.origin(), JSON.stringify({
                moment: "crouch", scale: scale, bare: bare ? 1 : 0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            acrobaticsStrike(action, done);
        },
        indicator: function () { return { radius: 3, geometry: "line", style: "dash", label: "杂技" }; }
    });
}
