/**
 * 高速星星 / swift 的出手方式。
 *
 * 核心念头：从身上迸出一圈星，每颗星自己拐弯追向一个对手——星星会追，所以永远打得到。
 *
 * 两幕：
 *   起：星光在身周结成环（提交前 windup 预告）。
 *   放：提交后一圈星向四面迸出；每颗星用原生追踪锁定一个对手飞过去。散星时星分给射程内的每个敌人，
 *       否则全部砸向选定目标。星星全部落地后收势。
 *
 * 与同族分开：infernalparade 是一队鬼火朝一个目标收拢；高速星星是向四面迸开后各追各的对手，一颗星一个敌人。
 */
namespace PokemonSkills {
    const swiftScene = "world_combat:move_swift";
    const swiftFadeText = "world_combat.move.swift.text.fade";

    define({
        id: "swift",
        name: "Swift",
        description: "Star-shaped rays are shot at opposing Pokémon. This attack never misses.",
        uses: ["一圈追人的星光", "同时压住多个对手", "在移动的目标身上收束"],
        kind: "enemy",
        range: 13,
        prepare: 6,
        active: 30,
        recover: 8,
        cooldown: 30,
        style: "star",
        defaults: { scatter: false, ai: { maxChase: 15, spread: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("swift", "lockRange", pokemon), geometry: "area", style: "star", color: 0xFFE9A8, label: "高速星星" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["swift"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var scatter = !!(config && config.scatter);
            return {
                prepare: p("swift", "prepare", context) + (scatter ? 2 : 0),
                recover: p("swift", "recover", context),
                cooldown: p("swift", "cooldown", context) + (scatter ? 3 : 0)
            };
        },
        windup: function (action, config, prepare) {
            var scatter = !!(config && config.scatter);
            action.present("world_combat:move_swift:windup", swiftScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, scatter: scatter }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const body = world.observe(actor);
            const count = Math.max(1, Math.round(p("swift", "stars", action)));
            const power = p("swift", "star", action);
            const speed = p("swift", "starSpeed", action);
            const turn = p("swift", "turn", action);
            const radius = p("swift", "collisionRadius", action);
            const lockRange = p("swift", "lockRange", action);
            const scatter = !!(config && config.scatter);
            const intensity = Math.max(0.5, Math.min(2, power / 26));
            const trail = Math.max(18, Math.round(power * 1.6));
            const notes = Math.max(6, Math.round(power / 4));

            // 候选目标：选定目标优先；散星时把射程内每个可见敌人也纳入。
            const roster: CombatActor[] = [];
            const selected = action.target();
            if (selected !== null && world.valid(selected)) roster.push(selected);
            if (scatter && body !== null) {
                const nearby = world.query(body.position(), lockRange, true);
                for (var index = 0; index < nearby.length; index++) {
                    var other = nearby[index];
                    if (String(other.ref()) === String(actor.ref()) || world.friendly(other) || !world.valid(other)) continue;
                    var known = false;
                    for (var slot = 0; slot < roster.length; slot++) if (String(roster[slot].ref()) === String(other.ref())) { known = true; break; }
                    if (!known) roster.push(other);
                }
            }

            sound(action, "minecraft:entity.firework_rocket.launch");
            WorldFeedback.emit(world, swiftScene, 1, origin,
                { moment: "launch", count: count, targets: roster.length, intensity: intensity, scatter: scatter, radius: radius }, 24);

            if (roster.length === 0) {
                WorldFeedback.emit(world, swiftScene, 1, action.origin(), { moment: "fade", intensity: intensity }, 20);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.2, 0)), swiftFadeText, [], 24);
                done(action);
                return;
            }

            const base = swiftHeading(action);
            let remaining = count;
            let settled = false;
            function completeOne(current: CombatAction): void {
                remaining--;
                if (remaining > 0) return;
                if (settled) return;
                settled = true;
                done(current);
            }
            for (var shot = 0; shot < count; shot++) {
                var target = roster[shot % roster.length];
                var angle = base + Math.PI * 2 * (shot / count);
                var direction = WorldCombat.point(Math.cos(angle), 0.12, Math.sin(angle)).unit();
                var ref = String(target.ref());
                var homing = { target: ref, turn: turn, delay: 1, range: lockRange + 6 };
                var flight = LivingActions.projectile(action, {
                    speed: speed, range: lockRange + 8, radius: radius, direction: direction,
                    appearance: { sprite: "cobblemon:particle/generic/star", glow: true, tint: 0xFFE9A8, homing: homing },
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        const currentWorld = current.world();
                        const who = hit.target();
                        var settledHit = who !== null && currentWorld.valid(who)
                            ? impact(current, hit, "swift", power, { damage: damageSpec("swift", "star") }) : false;
                        WorldFeedback.emit(currentWorld, swiftScene, 1, hit.position(),
                            { moment: settledHit ? "hit" : "fade", target: who === null ? "" : String(who.ref()),
                                intensity: intensity, notes: notes, scale: radius / 0.3 }, 22);
                        if (settledHit) currentWorld.sound("minecraft:entity.arrow.hit_player", hit.position(), 12, "{}");
                    }
                }, function (current: CombatAction) { completeOne(current); });
                WorldFeedback.emit(world, swiftScene, 1, origin,
                    { moment: "seek", projectile: flight, target: ref, intensity: intensity, trail: trail, scale: radius / 0.3 }, 40);
            }
        }
    });

    /** 以瞄准方向为基准角的水平朝向；没有目标时朝面前。 */
    function swiftHeading(action: CombatAction): number {
        var delta = action.targetPosition().minus(action.origin());
        var flat = WorldCombat.point(delta.x(), 0, delta.z());
        if (flat.length() < 1e-6) flat = WorldCombat.point(0, 0, 1);
        var unit = flat.unit();
        return Math.atan2(unit.z(), unit.x());
    }
}
