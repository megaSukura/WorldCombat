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
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("acrobatics", "reach", action), speed = p("acrobatics", "step", action);
        var radius = p("acrobatics", "collisionRadius", action), push = p("acrobatics", "push", action);
        var carry = p("acrobatics", "carry", action), motes = p("acrobatics", "motes", action);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var bare = acrobaticsHeldOf(world, actor) === null;
        sound(action, "cobblemon:move.aerialace.actor_1");
        WorldFeedback.emit(world, acrobaticsScene, 1, action.origin(),
            { moment: "launch", scale: scale, motes: Math.round(motes), bare: bare ? 1 : 0, intensity: bare ? 1.6 : 1 }, 40);
        var travelled = 0;
        function slip(current: CombatAction, remaining: number, elapsed: number): void {
            if (remaining <= 0.02 || elapsed >= 8) { done(current); return; }
            var scope = current.world(), self = scope.observe(current.actor());
            if (self === null) { done(current); return; }
            var moved = scope.displace(current.actor(), direction.scale(Math.min(speed * 0.6, remaining)));
            if (moved < p("acrobatics", "minimumMove", current)) { done(current); return; }
            current.after(1, function (next: CombatAction) { slip(next, remaining - moved, elapsed + 1); });
        }
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var hit = current.trace(origin, origin.plus(delta.scale(p("acrobatics", "traceAhead", current))), radius);
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { done(current); return; }
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
                    scope.displace(target, direction.scale(push));
                    slip(current, carry, 0);
                    return;
                }
                slip(current, carry * 0.5, 0);
                return;
            }
            var moved = scope.displace(actor, delta);
            travelled += moved;
            if (hit.blocked() || moved < p("acrobatics", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, acrobaticsScene, 1, hit.position(), { moment: "miss", scale: scale, motes: Math.round(motes) }, 20);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), acrobaticsMissText, [], 22);
                done(current);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        id: "acrobatics",
        name: "杂技",
        description: "腾身翻滚着撞向目标并在命中后穿过去；自身没有携带道具时，这一翻威力翻倍。",
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
