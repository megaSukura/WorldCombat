/**
 * 高速星星 / swift 的出手方式。
 *
 * 核心念头：从身上迸出一圈星，每颗星自己拐弯追向一个对手——星星会追，所以不做随机命中检定；
 *           但墙会挡、飞太久会燃尽，追不到就落空。
 *
 * 两幕：
 *   起：星光在身周结成环（提交前 windup 预告）。
 *   放：提交后一圈星向四面迸出；选中敌人时每颗星用原生追踪锁定分到的对手，散星时星分给射程内
 *       看得见的每个敌人，聚星时全部砸向选定目标。空瞄（没有选中实体）时星沿瞄准方向散出，
 *       飞出的星不再另找目标、也不会自动追友方。撞墙则在撞点熄灭，飞完自然散去。
 *
 * 与同族分开：infernalparade 是一队鬼火朝一个目标收拢；魔法叶是一整群叶全扑同一个对手；
 *           高速星星是向四面迸开后**一颗星一个对手**。
 */
namespace PokemonSkills {
    const swiftScene = "world_combat:move_swift";

    define({
        id: "swift",
        name: "Swift",
        description: "从身周迸出一圈星形光弹，每颗星自己拐弯追向一个对手；选中敌人时散星可同时咬住多个，聚星则全部砸向选定目标，未选中敌人时沿瞄准方向散出。星不做随机命中检定，但会撞上地形或在追上之前燃尽而落空。",
        uses: ["一圈追人的星光", "同时压住多个对手", "在移动的目标身上收束"],
        kind: "aim",
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

            // aim 可能只给了一个世界点：没有选中实体时星纯按方向散出，不替友方找目标。
            const selected = action.target();
            const locked = selected !== null && world.valid(selected) && !world.friendly(selected) ? selected : null;
            // 选中实体时，聚星全砸它；散星先分给选定目标，再把其余的给射程内看得见的其他敌人。
            const roster: CombatActor[] = [];
            if (locked !== null) {
                roster.push(locked);
                if (scatter && body !== null) {
                    const nearby = world.query(body.position(), lockRange, true);
                    for (var index = 0; index < nearby.length; index++) {
                        var other = nearby[index];
                        if (String(other.ref()) === String(actor.ref()) || world.friendly(other) || !world.valid(other)) continue;
                        var otherBody = world.observe(other);
                        if (otherBody === null || !world.clear(body.position(), otherBody.position())) continue;
                        var known = false;
                        for (var slot = 0; slot < roster.length; slot++) if (String(roster[slot].ref()) === String(other.ref())) { known = true; break; }
                        if (!known) roster.push(other);
                    }
                }
            }

            sound(action, "minecraft:entity.firework_rocket.launch");
            WorldFeedback.emit(world, swiftScene, 1, origin,
                { moment: "launch", count: count, targets: roster.length, intensity: intensity, scatter: scatter, radius: radius }, 24);

            const base = swiftHeading(action);
            const cone = 70 * Math.PI / 180;
            let remaining = count;
            let settled = false;
            function completeOne(current: CombatAction): void {
                remaining--;
                if (remaining > 0 || settled) return;
                settled = true;
                done(current);
            }
            for (var shot = 0; shot < count; shot++) {
                var ref = "";
                var direction: CombatPoint;
                if (roster.length > 0) {
                    // 一圈迸出后再各自拐向分到的对手。
                    const target = roster[shot % roster.length];
                    ref = String(target.ref());
                    const angle = base + Math.PI * 2 * (shot / count);
                    direction = WorldCombat.point(Math.cos(angle), 0.12, Math.sin(angle)).unit();
                } else {
                    // 空瞄：沿瞄准方向散开，飞出的星不再另找目标。
                    const spreadAngle = base + (count === 1 ? 0 : (shot / (count - 1) - 0.5) * cone);
                    direction = WorldCombat.point(Math.cos(spreadAngle), 0.12, Math.sin(spreadAngle)).unit();
                }
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: "cobblemon:particle/generic/star", glow: true, tint: 0xFFE9A8 };
                if (ref !== "") appearance.homing = { target: ref, turn: turn, delay: 1, range: lockRange + 6 };
                const flight = LivingActions.projectile(action, {
                    speed: speed, range: lockRange + 8, radius: radius, direction: direction,
                    appearance: appearance,
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        const currentWorld = current.world();
                        const who = hit.target();
                        if (who !== null && currentWorld.valid(who) && !currentWorld.friendly(who)) {
                            const landed = impact(current, hit, "swift", power, { damage: damageSpec("swift", "star") });
                            WorldFeedback.emit(currentWorld, swiftScene, 1, hit.position(),
                                { moment: landed ? "hit" : "fade", target: String(who.ref()),
                                    intensity: intensity, notes: notes, scale: radius / 0.3 }, 22);
                            if (landed) currentWorld.sound("minecraft:entity.arrow.hit_player", hit.position(), 12, "{}");
                            return;
                        }
                        if (hit.blocked()) {
                            const blockPoint = hit.blockPosition();
                            WorldFeedback.emit(currentWorld, swiftScene, 1, blockPoint === null ? hit.position() : blockPoint,
                                { moment: "block", target: "", face: hit.blockFace(), intensity: intensity,
                                    notes: notes, scale: radius / 0.3 }, 18);
                            currentWorld.sound("minecraft:block.amethyst_block.hit", hit.position(), 8, "{}");
                            return;
                        }
                        WorldFeedback.emit(currentWorld, swiftScene, 1, hit.position(),
                            { moment: "fade", intensity: intensity }, 18);
                    }
                }, function (current: CombatAction) { completeOne(current); });
                WorldFeedback.emit(world, swiftScene, 1, origin,
                    { moment: "seek", projectile: flight, target: ref, intensity: intensity, trail: trail, scale: radius / 0.3 }, 40);
            }
        }
    });

    /** 以瞄准方向为基准角的水平朝向；空瞄时朝瞄准点，仍为空则朝面前。 */
    function swiftHeading(action: CombatAction): number {
        var delta = action.targetPosition().minus(action.origin());
        var flat = WorldCombat.point(delta.x(), 0, delta.z());
        if (flat.length() < 1e-6) flat = WorldCombat.point(0, 0, 1);
        var unit = flat.unit();
        return Math.atan2(unit.z(), unit.x());
    }
}
