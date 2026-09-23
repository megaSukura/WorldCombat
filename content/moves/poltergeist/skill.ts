/**
 * 灵骚 / poltergeist —— 注册与动作。
 *
 * 念头三幕：一幕凝神（提交前 `windup`，掌心聚起幽火，目标的道具先是轻轻一颤）→ 一幕扯离（提交后那件道具
 * 被攥离目标手边，贴图沿一条偏出的弧线飞出）→ 一幕砸回（道具折返、砸在主人身上，命中结算物理伤害并顶开；
 * bind 开启时道具贴着目标不放、使其减速）。目标空手时起手即失败（`ready` 返回 no-item，不花 PP、不进冷却）。
 * 道具只是被操纵，从不被取走，命中后仍在对方手里。
 */
namespace PokemonSkills {
    const poltergeistScene = "world_combat:move_poltergeist";
    const poltergeistSlamText = "world_combat.move.poltergeist.text.slam";
    const poltergeistBindText = "world_combat.move.poltergeist.text.bind";
    const poltergeistFizzleText = "world_combat.move.poltergeist.text.fizzle";

    function poltergeistThrow(action: CombatAction, target: CombatActor, held: PoltergeistHeld, done: (current: CombatAction) => void): void {
        var world = action.world(), center = world.observe(target);
        if (center === null) { done(action); return; }
        var direction = aim(action), perp = WorldCombat.point(direction.z(), 0, -direction.x());
        var power = p("poltergeist", "whip", action), speed = p("poltergeist", "boltSpeed", action);
        var radius = p("poltergeist", "radius", action), push = p("poltergeist", "push", action);
        var verge = p("poltergeist", "verge", action), motes = p("poltergeist", "motes", action);
        var bind = bindOn(action);
        var origin = center.position().minus(direction.scale(verge * 0.4)).plus(perp.scale(verge)).plus(WorldCombat.point(0, 0.55, 0));
        var velocity = center.position().minus(origin).unit().scale(speed);
        WorldFeedback.emit(world, poltergeistScene, 1, center.position(),
            { moment: "pull", target: String(target.ref()), item: held.id, motes: Math.round(motes) }, 28);
        sound(action, "cobblemon:move.shadowball.target");
        var landed = false;
        var flight = action.projectile(origin, velocity, 0, radius, 2.6, 30,
            function (current: CombatAction, hit: CombatImpact) {
                var scope = current.world(), victim = hit.target();
                if (victim === null || scope.friendly(victim)) return;
                var before = scope.observe(victim), maximum = before ? Math.max(1, before.maxHealth()) : 1;
                var dealt = 0;
                if (impact(current, hit, "poltergeist", power)) landed = true;
                var after = scope.valid(victim) ? scope.observe(victim) : null;
                dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
                WorldFeedback.emit(scope, poltergeistScene, 1, hit.position(), { moment: "slam", target: String(victim.ref()),
                    intensity: intensity, scale: 1, motes: Math.round(motes * (0.7 + intensity * 0.2)) }, 30);
                sound(current, "cobblemon:impact.ghost");
                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 0.9, 0)), poltergeistSlamText, [], 28);
                if (scope.valid(victim)) {
                    scope.displace(victim, direction.scale(push));
                    var bindTicks = p("poltergeist", "slowTicks", current);
                    if (bind && bindTicks >= 1) {
                        scope.marker(victim, "minecraft:slowness", Math.round(bindTicks), 1);
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.15, 0)), poltergeistBindText, [], 30);
                    }
                }
            },
            function (current: CombatAction) {
                if (!landed) {
                    var scope = current.world(), self = scope.observe(current.actor());
                    if (self !== null) WorldFeedback.emit(scope, poltergeistScene, 1, self.position(),
                        { moment: "fizzle", motes: Math.round(motes) }, 22);
                }
                done(current);
            },
            JSON.stringify({ item: held.id, scale: 1, glow: true }));
        WorldFeedback.emit(world, poltergeistScene, 1, origin,
            { moment: "flight", projectile: flight, target: String(target.ref()), item: held.id, scale: 1 }, 36);
    }

    /** bind 配置读取；配置只在动作回调里可见，缠绕时长为 0 即未开启。 */
    function bindOn(action: CombatAction): boolean {
        return p("poltergeist", "slowTicks", action) > 0;
    }

    define({
        id: "poltergeist",
        name: "灵骚",
        description: "隔空攥住对手的持有物，把它扯离手边、绕出一条弧线再甩回主人身上；目标没有携带道具时这一招生效不了。念力越强够得越远。",
        uses: ["远程操纵对手的道具打它自己", "对付携带强力道具的目标", "bind 开启时缠住并减速目标"],
        kind: "enemy",
        range: 7,
        maxRange: 9,
        prepare: 7,
        active: 0,
        recover: 10,
        cooldown: 34,
        style: "ghost",
        defaults: { bind: false, ai: { maxChase: 12, leaveStation: true } },
        fields: [flag("bind", "道具缠身")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["poltergeist"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("poltergeist", "charge", context)), recover: 10, cooldown: 34, active: 0,
                range: p("poltergeist", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var target = action.target();
            if (!target) return "";
            return poltergeistHeldOf(action.sense(), target) !== null ? "" : "no-item";
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var world = action.sense(), actor = action.actor(), target = action.target();
            var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:poltergeist:" + action.id(), poltergeistScene, 1, action.origin(),
                JSON.stringify({ moment: "channel", scale: scale, bind: !!(config && config.bind) }));
            if (target) {
                var theirs = world.observe(target);
                if (theirs !== null) action.present("world_combat:poltergeist:mark:" + action.id(), poltergeistScene, 1, theirs.position(),
                    JSON.stringify({ moment: "shiver", target: String(target.ref()) }));
            }
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            var target = action.target(), world = action.world();
            if (!target || !world.valid(target)) { done(action); return; }
            var held = poltergeistHeldOf(world, target);
            if (held === null) {
                WorldFeedback.emit(world, poltergeistScene, 1, action.origin(), { moment: "fizzle" }, 22);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.1, 0)), poltergeistFizzleText, [], 26);
                done(action);
                return;
            }
            poltergeistThrow(action, target, held, done);
        },
        indicator: function () { return { radius: 7, geometry: "area", style: "ghost", label: "灵骚" }; }
    });
}
