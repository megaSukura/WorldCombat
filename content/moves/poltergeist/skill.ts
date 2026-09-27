/**
 * 灵骚 / poltergeist —— 注册与动作。
 *
 * 念头三幕：一幕凝神（提交前 `windup`，掌心聚起幽火，目标的道具先是轻轻一颤，同时记下它的完整快照）→
 * 一幕扯离（提交后复核最初那份快照仍原样，那件道具才被攥离目标手边，灵影沿一条偏出的短弧飞出）→
 * 一幕砸回（灵影侧绕后折返、撞回主人身上，命中结算物理伤害并在成功伤害后顶开）。
 * 目标空手时起手即失败（`ready` 返回 no-item，不花 PP、不进冷却）；蓄力间目标放下或换掉那件道具同样使这次操控落空、
 * 不生成弹体，避免画面让玩家以为东西已掉地。灵影只是借了装备的形象，真实装备从不被搬运，命中后仍在对方手里；
 * 它撞上旁人/墙时按原生弹体在真实接触处停下，空飞失败的回执落在弹体真实的结束点。
 */
namespace PokemonSkills {
    const poltergeistScene = "world_combat:move_poltergeist";
    const poltergeistSlamText = "world_combat.move.poltergeist.text.slam";
    const poltergeistFizzleText = "world_combat.move.poltergeist.text.fizzle";
    /** 蓄力开始时观察到的持有物快照，存在本次动作内供提交时复核。 */
    const poltergeistHeldKey = "world_combat:poltergeist/held";

    function poltergeistRememberHeld(action: CombatAction, target: CombatActor): void {
        var held = poltergeistHeldOf(action.sense(), target);
        if (held !== null) action.data(poltergeistHeldKey, JSON.stringify(held));
    }

    function poltergeistStoredHeld(action: CombatAction): PoltergeistHeld | null {
        var raw = action.data(poltergeistHeldKey);
        if (raw === null) return null;
        try { return JSON.parse(raw); } catch (error) { return null; }
    }

    function poltergeistThrow(action: CombatAction, target: CombatActor, held: PoltergeistHeld, done: (current: CombatAction) => void): void {
        var world = action.world(), center = world.observe(target);
        if (center === null) { done(action); return; }
        var direction = aim(action), flat = WorldCombat.point(direction.x(), 0, direction.z());
        var forward = flat.length() < 0.01 ? WorldCombat.point(1, 0, 0) : flat.unit();
        var perp = WorldCombat.point(-forward.z(), 0, forward.x());
        var power = p("poltergeist", "whip", action), speed = p("poltergeist", "boltSpeed", action);
        var radius = p("poltergeist", "radius", action), push = p("poltergeist", "push", action);
        var verge = p("poltergeist", "verge", action), motes = p("poltergeist", "motes", action);
        // 灵影从持物手边扯出：起点贴着目标身体外侧，先向侧外荡开，再由 homing 拉回、短侧绕后撞回主人。
        var outside = Math.max(verge * 0.55, center.width() * 0.5 + radius + 0.35);
        var origin = center.position().plus(perp.scale(outside)).plus(WorldCombat.point(0, 0.45, 0));
        // 起步朝「指向目标」绕 Y 偏 80°：先侧荡两刻，homing 再每刻拉回，形成一段可见的短侧弧而不是直线。
        var toTarget = center.position().minus(origin).unit(), spin = 80 * Math.PI / 180;
        var launch = WorldCombat.point(toTarget.x() * Math.cos(spin) + toTarget.z() * Math.sin(spin), toTarget.y(),
            -toTarget.x() * Math.sin(spin) + toTarget.z() * Math.cos(spin)).unit().scale(speed);
        var range = Math.max(20, verge * 6 + 8);
        WorldFeedback.emit(world, poltergeistScene, 1, center.position(),
            { moment: "pull", target: String(target.ref()), item: held.id, motes: Math.round(motes) }, 28);
        sound(action, "cobblemon:move.shadowball.target");
        var landed = false, flightId = "";
        function poltergeistHit(current: CombatAction, hit: CombatImpact): void {
            var scope = current.world(), victim = hit.target();
            if (victim === null || scope.friendly(victim)) return;
            var before = scope.observe(victim), maximum = before ? Math.max(1, before.maxHealth()) : 1;
            var hitLanded = impact(current, hit, "poltergeist", power);
            if (hitLanded) landed = true;
            var after = scope.valid(victim) ? scope.observe(victim) : null;
            var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
            var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
            WorldFeedback.emit(scope, poltergeistScene, 1, hit.position(), { moment: "slam", target: String(victim.ref()),
                intensity: intensity, scale: 1, motes: Math.round(motes * (0.7 + intensity * 0.2)) }, 30);
            sound(current, "cobblemon:impact.ghost");
            // 只在伤害真正落上后才顶开并报「道具砸回」；免疫/原生拒绝时只留接触的幽火，不谎报成功。
            if (hitLanded && scope.valid(victim)) {
                WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 0.9, 0)), poltergeistSlamText, [], 28);
                scope.hitDisplace(victim, direction.scale(push));
            }
        }
        function poltergeistComplete(current: CombatAction): void {
            if (!landed) {
                var scope = current.world(), point = scope.projectilePosition(flightId);
                if (point === null) {
                    var self = scope.observe(current.actor());
                    point = self !== null ? self.position() : null;
                }
                if (point !== null) WorldFeedback.emit(scope, poltergeistScene, 1, point,
                    { moment: "fizzle", motes: Math.round(motes) }, 22);
            }
            done(current);
        }
        flightId = action.projectile(origin, launch, 0, radius, range, 50,
            poltergeistHit, poltergeistComplete,
            JSON.stringify({ item: held.id, scale: 1, glow: true,
                homing: { target: String(target.ref()), turn: 90, delay: 2, range: Math.max(8, verge * 4) } }));
        WorldFeedback.emit(world, poltergeistScene, 1, origin,
            { moment: "flight", projectile: flightId, target: String(target.ref()), item: held.id, scale: 1 }, 50);
    }

    define({
        id: "poltergeist",
        name: "灵骚",
        description: "隔空攥住对手的持有物，把它扯离手边、绕出一条弧线再撞回主人身上；目标没有携带道具时这一招生效不了。念力越强够得越远。",
        uses: ["远程操纵对手的道具打它自己", "对付携带强力道具的目标"],
        kind: "enemy",
        range: 7,
        maxRange: 9,
        prepare: 7,
        active: 0,
        recover: 10,
        cooldown: 34,
        style: "ghost",
        defaults: { ai: { maxChase: 12, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["poltergeist"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("poltergeist", "charge", context)), recover: 10, cooldown: 34, active: 0,
                range: p("poltergeist", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var target = action.target(), world = action.sense();
            if (!target || !world.valid(target)) return "no-target";
            var held = poltergeistHeldOf(world, target);
            if (held === null) return "no-item";
            var prior = poltergeistStoredHeld(action);
            if (prior !== null && !poltergeistSameHeld(prior, held)) return "held-changed";
            action.data(poltergeistHeldKey, JSON.stringify(held));
            return "";
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var world = action.sense(), actor = action.actor(), target = action.target();
            var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:poltergeist:" + action.id(), poltergeistScene, 1, action.origin(),
                JSON.stringify({ moment: "channel", scale: scale }));
            if (target) {
                poltergeistRememberHeld(action, target);
                var theirs = world.observe(target);
                if (theirs !== null) action.present("world_combat:poltergeist:mark:" + action.id(), poltergeistScene, 1, theirs.position(),
                    JSON.stringify({ moment: "shiver", target: String(target.ref()) }));
            }
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            var target = action.target(), world = action.world();
            if (!target || !world.valid(target)) { done(action); return; }
            var held = poltergeistHeldOf(world, target), prior = poltergeistStoredHeld(action);
            if (held === null || (prior !== null && !poltergeistSameHeld(prior, held))) {
                poltergeistStallSet(world, action.actor(), target, 400);
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
