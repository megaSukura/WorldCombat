/**
 * 神圣之火 / sacredfire 的出手方式。
 *
 * 核心念头：送出一团浴净的虹彩圣火——施法者本人留在原地，虹火沿瞄准方向逐段飞出，真实首碰实体或方块。
 * 碰到敌人是实打实的一记**远程非接触**火击（不会触发接触反伤）、高概率点燃；碰到友方只解开其冰封、不造成
 * 伤害。圣火也压过冰霜：被冻住时这一招可以照常出手，起手先解掉自身的冰封。圣火式在撞击点留下一片
 * 对友方无伤的虹彩余焰，交给独立的场地效果托管、不把施法者锁在余焰整段寿命里；天罚式只取更重的一击。
 *
 * 三幕：
 *   起（risen，提交前）：虹彩圣火从脚下升起裹住全身，只播预告。
 *   飞（flight）：提交后虹火从身前飞出，逐段 trace 真实首碰；画面路径与判定读同一份头尾点。
 *   燃（hit / thaw / flame）：首碰敌人结算 strike 物理火伤并按概率灼伤；首碰友方只解冻；圣火式在落点
 *       留下一片虹彩余焰（`WorldEffects.field`，独立托管），天罚式只收势。
 */
namespace PokemonSkills {
    const sacredfireScene = "world_combat:move_sacredfire";
    const sacredfireBurnText = "world_combat.move.sacredfire.text.burn";
    const sacredfireHitText = "world_combat.move.sacredfire.text.hit";
    const sacredfireThawText = "world_combat.move.sacredfire.text.thaw";
    const sacredfireField = "world_combat:field/sacredfire";

    /** 落点下方第一块实心方块的顶面位置；给余焰一个贴地的锚点。 */
    function sacredfireGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), base = Math.floor(point.y());
        for (let dy = 0; dy <= 5; dy++) {
            const y = base - dy;
            const block = world.block(WorldCombat.point(x, y, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return WorldCombat.point(x + 0.5, y + 1.05, z + 0.5);
        }
        return point;
    }

    function sacredfireVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 冻结的施法者仍能送出这团净化之火（原生 defrost）：提交检查放行本招的冰冻限制。 */
    CombatStatus.actions.define({
        id: "world_combat:move_sacredfire/defrost",
        applies: function (context: CombatStatus.ActionPolicy) {
            return !!context.action && String(context.action.content()) === "world_combat:sacredfire";
        },
        apply: function (context: CombatStatus.ActionPolicy) { delete context.blocked.frozen; }
    });

    /** 圣火式留下的虹彩余焰：圈内敌人按间隔反复挨烫；友方踏入不会被烧，只会在冻结时被化开。 */
    WorldEffects.fieldRule(sacredfireField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void { sacredfireEmber(world, actor, field); },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void { sacredfireEmber(world, actor, field); }
    });

    function sacredfireEmber(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const ref = String(actor.ref()), data = field.data, next = data.next || (data.next = {});
        const interval = Math.max(1, Number(data.interval) || 10);
        if (world.tick() < (next[ref] || 0)) return;
        next[ref] = world.tick() + interval;
        const body = world.observe(actor);
        if (body === null) return;
        const scale = Number(data.scale) || 1;
        if (world.friendly(actor)) {
            if (CombatStatus.has(world, actor, "frozen") && CombatStatus.cure(world, actor, "frozen"))
                WorldFeedback.emit(world, sacredfireScene, 1, body.position(), { moment: "thaw", target: ref, scale: scale }, 24);
            return;
        }
        const power = Number(data.power) || 0;
        if (!hurt(world, actor, "sacredfire", power, { damage: damageSpec("sacredfire", "flame") })) return;
        WorldFeedback.emit(world, sacredfireScene, 1, body.position(),
            { moment: "flamehit", target: ref, sparks: Math.round(6 + power), scale: scale, intensity: Math.max(0.5, Math.min(1.6, power / 15)) }, 18);
    }

    define({
        id: "sacredfire",
        cooldownParameter: "recharge",
        name: "Sacred Fire",
        description: "把一团浴净的虹彩圣火沿瞄准方向送出去，真实首碰实体或方块：碰到敌人是一记远程非接触的物理火击、有较高概率使其陷入灼伤；碰到友方只解开其冰封、不造成伤害。被冻住时这一招可以照常出手并先解掉自身的冰封；圣火式在撞击点留下一片对友方无伤的虹彩余焰，天罚式只取更重的一击。",
        uses: ["送出一团虹火穿透一个目标", "用高概率的灼伤压制对手", "为被冰封的自己或队友解冻", "在落点留下一片只烫敌人的彩火"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 10,
        active: 0,
        recover: 9,
        cooldown: 44,
        style: "radiant",
        stationary: true,
        defaults: { smite: false, ai: { maxChase: 12, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("sacredfire", "travel", pokemon), geometry: "line", style: "radiant",
                color: 0xFFE0A0, label: config && config.smite === true ? "天罚式神圣之火" : "圣火式神圣之火" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sacredfire"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("sacredfire", "tempo", context)),
                recover: Math.round(p("sacredfire", "aftercast", context)),
                cooldown: Math.round(p("sacredfire", "recharge", context)),
                active: 0,
                range: p("sacredfire", "travel", context) + 1.0
            };
        },
        windup: function (action, config, prepare) {
            action.present("sacredfire:risen", sacredfireScene, 1, action.origin(),
                JSON.stringify({ moment: "risen", smite: config && config.smite === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(sacredfireScene);
            const world = action.world();
            const actor = action.actor();
            const actorRef = String(actor.ref());
            const smite = !!(config && config.smite);
            const power = p("sacredfire", "strike", action);
            const pace = p("sacredfire", "pace", action);
            const travel = p("sacredfire", "travel", action);
            const radius = p("sacredfire", "radius", action);
            const burnChance = Math.max(0.01, Math.min(0.9, p("sacredfire", "burnChance", action)));
            const flamePower = p("sacredfire", "flame", action);
            const flameRadius = p("sacredfire", "flameRadius", action);
            const flameTicks = Math.max(30, Math.round(p("sacredfire", "flameTicks", action)));
            const flamePulse = Math.max(4, Math.round(p("sacredfire", "flamePulse", action)));
            const sparks = Math.max(12, Math.round(p("sacredfire", "sparks", action)));
            const intensity = Math.max(0.6, Math.min(2.6, power / 100));
            const scale = Math.max(0.7, Math.min(1.7, radius / 0.7));
            const direction = aim(action);
            const start = world.observe(actor);
            const origin = start !== null ? start.position() : action.origin();
            let head = origin.plus(direction.scale(Math.max(0.8, radius + 0.3)));
            let travelled = 0, settled = false, total = 0;

            // 原生 defrost：被冻住时先化开自己身上的冰，这一团圣火才送得出去。
            if (CombatStatus.has(world, actor, "frozen") && CombatStatus.cure(world, actor, "frozen")) {
                WorldFeedback.emit(world, sacredfireScene, 1, origin, { moment: "thaw", target: actorRef, scale: scale }, 24);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), sacredfireThawText, [], 24);
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(actor);
                WorldFeedback.emit(scope, sacredfireScene, 1, body !== null ? body.position() : current.origin(),
                    { moment: "fade", sparks: sparks, intensity: intensity }, 24);
                if (total > 0) WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.3, 0)), sacredfireHitText, [total], 26);
                scenes.finish(current, done);
            }

            /** 圣火式撞击点留下一片独立托管的虹彩余焰；画面跟着场地效果本身结束而清理。 */
            function leaveEmber(scope: CombatWorld, at: CombatPoint): void {
                if (smite) return;
                const ground = sacredfireGround(scope, at);
                const id = WorldEffects.field(scope, sacredfireField, ground, flameRadius,
                    { power: flamePower, interval: flamePulse, scale: scale, next: {} }, flameTicks);
                if (id > 0)
                    WorldFeedback.onEffect(scope, id, "sacredfire:ember", sacredfireScene, 1, ground,
                        { moment: "flame", radius: flameRadius, flow: Math.round(30 + flameRadius * 14), sparks: sparks, scale: scale });
            }

            function show(current: CombatAction, frontier: CombatPoint): void {
                scenes.show(current, "flight", origin, {
                    moment: "flight", path: [sacredfireVertex(origin), sacredfireVertex(frontier)],
                    point: sacredfireVertex(frontier), sparks: sparks, scale: scale, intensity: intensity,
                    direction: [direction.x(), direction.y(), direction.z()]
                });
            }

            function strike(current: CombatAction, hit: CombatImpact, victim: CombatActor): void {
                scenes.stop(current, "flight");
                const scope = current.world();
                const body = scope.observe(victim);
                const at = body !== null ? body.position() : hit.position();
                const landed = impact(current, hit, "sacredfire", power,
                    { damage: damageSpec("sacredfire", "strike"), status: "burn", chance: burnChance });
                WorldFeedback.emit(scope, sacredfireScene, 1, at, { moment: "hit", target: String(victim.ref()), sparks: sparks, scale: scale, intensity: intensity }, 30);
                sound(current, "cobblemon:impact.fire");
                if (landed) total++;
                if (landed && scope.valid(victim) && CombatStatus.has(scope, victim, "burn"))
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), sacredfireBurnText, [], 28);
                leaveEmber(scope, at);
                finish(current);
            }

            /** 友方接住这团净火：只解冻、不穿过去偷伤身后的敌人。 */
            function thaw(current: CombatAction, ally: CombatActor, at: CombatPoint): void {
                scenes.stop(current, "flight");
                const scope = current.world();
                if (CombatStatus.has(scope, ally, "frozen") && CombatStatus.cure(scope, ally, "frozen")) {
                    WorldFeedback.emit(scope, sacredfireScene, 1, at, { moment: "thaw", target: String(ally.ref()), sparks: sparks, scale: scale }, 24);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), sacredfireThawText, [], 24);
                }
                finish(current);
            }

            /** 碰到方块或未知接触：圣火在接触点散开，圣火式仍在那里留一片余焰。 */
            function land(current: CombatAction, at: CombatPoint, wall: boolean): void {
                scenes.stop(current, "flight");
                const scope = current.world();
                WorldFeedback.emit(scope, sacredfireScene, 1, at, { moment: "whiff", sparks: sparks, scale: scale, intensity: intensity, wall: wall ? 1 : 0 }, 26);
                sound(current, "minecraft:entity.generic.explode");
                leaveEmber(scope, at);
                finish(current);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const step = Math.min(pace, travel - travelled);
                if (step <= 0.001) {
                    scenes.stop(current, "flight");
                    const scope = current.world();
                    WorldFeedback.emit(scope, sacredfireScene, 1, head, { moment: "whiff", sparks: sparks, scale: scale, intensity: intensity, wall: 0 }, 26);
                    finish(current);
                    return;
                }
                current.stopMovement();
                const next = head.plus(direction.scale(step));
                const hit = current.trace(head, next, radius, true);
                const contact = hit.hitEntity() || hit.blocked();
                const frontier = contact ? hit.position() : next;
                show(current, frontier);
                if (hit.hitEntity()) {
                    const entity = hit.target();
                    if (entity === null) { land(current, hit.position(), true); return; }
                    if (String(entity.ref()) === actorRef) { head = next; travelled += step; }
                    else if (current.world().friendly(entity)) { thaw(current, entity, hit.position()); return; }
                    else { strike(current, hit, entity); return; }
                } else if (hit.blocked()) { land(current, hit.position(), true); return; }
                else { head = next; travelled += step; }
                if (travelled >= travel - 0.01) {
                    scenes.stop(current, "flight");
                    const scope = current.world();
                    WorldFeedback.emit(scope, sacredfireScene, 1, head, { moment: "whiff", sparks: sparks, scale: scale, intensity: intensity, wall: 0 }, 26);
                    finish(current);
                    return;
                }
                current.after(1, function (nextAction: CombatAction) { advance(nextAction); });
            }

            sound(action, "minecraft:item.firecharge.use");
            scenes.show(action, "flight", origin, {
                moment: "flight", path: [sacredfireVertex(origin), sacredfireVertex(head)],
                point: sacredfireVertex(head), sparks: sparks, scale: scale, intensity: intensity,
                direction: [direction.x(), direction.y(), direction.z()]
            });
            advance(action);
        }
    });
}
