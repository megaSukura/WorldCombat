/**
 * 杂技 / acrobatics —— 注册与动作。
 *
 * 念头两幕：一幕下蹲蓄势（提交前 `windup`，身体压成弹簧，风丝从脚边扬起），一幕腾身翻滚（提交后沿瞄准方向
 * 逐刻推进，撞上活体结算接触伤害并顺势从对方身侧穿过去）。自身没有携带道具时，身体更轻：这一翻翻倍。
 * 它与同族另外三招的区别在于本招不碰对手的东西——力量来自“自己手里什么都没有”。
 */
namespace PokemonSkills {
    const acrobaticsScene = "world_combat:move_acrobatics";
    const acrobaticsBareText = "world_combat.move.acrobatics.text.bare";
    const acrobaticsStrikeText = "world_combat.move.acrobatics.text.strike";
    const acrobaticsMissText = "world_combat.move.acrobatics.text.miss";

    function acrobaticsStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        const movementScenes = WorldFeedback.actionScenes(acrobaticsScene);
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("acrobatics", "reach", action), speed = p("acrobatics", "step", action);
        var radius = p("acrobatics", "collisionRadius", action), push = p("acrobatics", "push", action);
        var carry = p("acrobatics", "carry", action), motes = p("acrobatics", "motes", action);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var bare = acrobaticsHeldOf(world, actor) === null;
        action.releaseTarget();
        sound(action, "cobblemon:move.aerialace.actor_1");
        movementScenes.show(action, "launch", action.origin(), { moment: "launch", scale: scale, motes: Math.round(motes), bare: bare ? 1 : 0, intensity: bare ? 1.6 : 1 });
        var travelled = 0;
        function slip(current: CombatAction, targetPoint: CombatPoint, targetWidth: number, extra: number): void {
            var scope = current.world(), self = scope.observe(current.actor());
            if (self === null) { movementScenes.finish(current, done); return; }
            var forward = WorldCombat.point(direction.x(), 0, direction.z());
            if (forward.length() < 0.01) forward = WorldCombat.point(1, 0, 0);
            else forward = forward.unit();
            var side = WorldCombat.point(-forward.z(), 0, forward.x()), start = self.position();
            var centre = WorldCombat.point(targetPoint.x(), start.y(), targetPoint.z());
            var offset = start.minus(centre), lateral = offset.x() * side.x() + offset.z() * side.z();
            // A circle enclosing both horizontal hitboxes also clears their corners for a diagonal approach.
            var clearance = (self.width() + targetWidth) * Math.SQRT1_2 + 0.15;
            var preferred = lateral < 0 ? -1 : 1, path: CombatPoint[] | null = null;
            for (var attempt = 0; attempt < 2 && path === null; attempt++) {
                var sign = attempt === 0 ? preferred : -preferred;
                var flank = start.plus(side.scale(sign * clearance - lateral));
                var exit = centre.plus(forward.scale(clearance + extra)).plus(side.scale(sign * clearance));
                var candidate = [flank, exit], from = start, clear = true;
                for (var segment = 0; segment < candidate.length && clear; segment++) {
                    var delta = candidate[segment].minus(from), samples = Math.max(1, Math.ceil(delta.length() / 0.3));
                    for (var sample = 1; sample <= samples; sample++) {
                        var feet = from.plus(delta.scale(sample / samples)).minus(WorldCombat.point(0, self.height() / 2, 0));
                        if (!scope.freeSpace(feet, self.width(), self.height())) { clear = false; break; }
                    }
                    from = candidate[segment];
                }
                if (clear) path = candidate;
            }
            if (path === null) { movementScenes.finish(current, done); return; }
            followSlip(current, path, 0, 0);
        }
        function followSlip(current: CombatAction, path: CombatPoint[], index: number, elapsed: number): void {
            var scope = current.world(), self = scope.observe(current.actor());
            if (self === null || elapsed >= 48) { movementScenes.finish(current, done); return; }
            var delta = path[index].minus(self.position()), distance = delta.length();
            if (distance <= 0.05) {
                if (++index >= path.length) { movementScenes.finish(current, done); return; }
                delta = path[index].minus(self.position()); distance = delta.length();
            }
            var moved = scope.displace(current.actor(), delta.unit().scale(Math.min(speed * 0.6, distance)));
            var after = scope.observe(current.actor());
            if (moved < p("acrobatics", "minimumMove", current) || after === null
                || distance - path[index].minus(after.position()).length() < 0.01) { movementScenes.finish(current, done); return; }
            current.after(1, function (next: CombatAction) { followSlip(next, path, index, elapsed + 1); });
        }
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var swept = sweepStep(current, delta, radius), hit = swept.hit;
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { movementScenes.finish(current, done); return; }
                var point = hit.position();
                var before = scope.observe(target), maximum = before ? Math.max(1, before.maxHealth()) : 1;
                var power = p("acrobatics", "roll", current);
                var landed = impact(current, hit, "acrobatics", power, { damage: damageSpec("acrobatics", "roll"), contact: true });
                var after = scope.valid(target) ? scope.observe(target) : null;
                var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
                WorldFeedback.emit(scope, acrobaticsScene, 1, point, { moment: "impact", target: String(target.ref()),
                    intensity: intensity, scale: scale, motes: Math.round(motes * (0.7 + intensity * 0.2)), bare: bare ? 1 : 0 }, 30);
                sound(current, "cobblemon:impact.flying");
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), bare ? acrobaticsBareText : acrobaticsStrikeText, [], 28);
                if (landed && scope.valid(target)) {
                    scope.hitDisplace(target, direction.scale(push));
                }
                var obstacle = scope.valid(target) ? scope.observe(target) : before;
                slip(current, obstacle ? obstacle.position() : point, obstacle ? obstacle.width() : 0, landed ? carry : carry * 0.5);
                return;
            }
            var moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(actor, swept.remaining) : 0);
            travelled += moved;
            if (hit.blocked() || moved < p("acrobatics", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, acrobaticsScene, 1, hit.position(), { moment: "miss", scale: scale, motes: Math.round(motes) }, 20);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), acrobaticsMissText, [], 22);
                movementScenes.finish(current, done);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: "acrobatics",
        name: "杂技",
        description: "腾身翻滚着撞向目标；命中后身侧有空位时，从一侧绕过目标。自身没有携带道具时，这一翻威力翻倍。",
        uses: ["空手时的一次轻盈突进", "从对方身侧翻过去换位", "带着沉重道具时当作普通飞行撞击"],
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
