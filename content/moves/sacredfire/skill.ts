/**
 * 神圣之火 / sacredfire 的出手方式。
 *
 * 核心念头：送出一团浴净的虹彩圣火——施法者本人留在原地，虹火从口前沿瞄准方向逐段飞出，真实首碰实体或方块。
 * 碰到敌人是实打实的一记**远程非接触**火击（不会触发接触反伤）、高概率点燃；碰到友方只解开其冰封、不造成
 * 伤害。圣火也压过冰霜：被冻住时这一招可以照常出手，起手先解掉自身的冰封。圣火式与天罚式都只取这一记直接
 * 重击，区别在威力、点燃概率与冷却，不再于落点追加通用持续伤害区。
 *
 * 三幕：
 *   起（risen，提交前）：虹彩圣火从脚下升起裹住全身，只播预告。
 *   飞（flight）：提交后虹火从口前（身体中心）起逐段 trace 真实首碰，口前那一段也参与接触；画面以当刻真实
 *       前沿为头、只保留这段短尾，判定与表现读同一份头尾点。
 *   燃（hit / thaw / whiff）：首碰敌人结算 strike 物理火伤并按概率灼伤；首碰友方只解冻；撞墙只在接触点散火。
 */
namespace PokemonSkills {
    const sacredfireScene = "world_combat:move_sacredfire";
    const sacredfireBurnText = "world_combat.move.sacredfire.text.burn";
    const sacredfireHitText = "world_combat.move.sacredfire.text.hit";
    const sacredfireThawText = "world_combat.move.sacredfire.text.thaw";

    function sacredfireVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }

    /** 冻结的施法者仍能送出这团净化之火（原生 defrost）：提交检查放行本招的冰冻限制。 */
    CombatStatus.actions.define({
        id: "world_combat:move_sacredfire/defrost",
        applies: function (context: CombatStatus.ActionPolicy) {
            return !!context.action && String(context.action.content()) === "world_combat:sacredfire";
        },
        apply: function (context: CombatStatus.ActionPolicy) { delete context.blocked.frozen; }
    });

    define({
        id: "sacredfire",
        cooldownParameter: "recharge",
        name: "Sacred Fire",
        description: "把一团浴净的虹彩圣火沿瞄准方向送出去，真实首碰实体或方块：碰到敌人是一记远程非接触的物理火击、有较高概率使其陷入灼伤；碰到友方只解开其冰封、不造成伤害。被冻住时这一招可以照常出手并先解掉自身的冰封；天罚式一击更重、冷却更短，圣火式点燃更稳但威力略低、冷却更久。",
        uses: ["送出一团虹火穿透一个目标", "用高概率的灼伤压制对手", "为被冰封的自己或队友解冻", "贴身或友军挡线时只解冻、不穿伤"],
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
            const power = p("sacredfire", "strike", action);
            const pace = p("sacredfire", "pace", action);
            const travel = p("sacredfire", "travel", action);
            const radius = p("sacredfire", "radius", action);
            const burnChance = Math.max(0.01, Math.min(0.9, p("sacredfire", "burnChance", action)));
            const sparks = Math.max(12, Math.round(p("sacredfire", "sparks", action)));
            const intensity = Math.max(0.6, Math.min(2.6, power / 100));
            const scale = Math.max(0.7, Math.min(1.7, radius / 0.7));
            const direction = aim(action);
            const start = world.observe(actor);
            const origin = start !== null ? start.position() : action.origin();
            // 口部就是真实起点：head 从身体中心开始，第一段 trace 也参与接触，不再跳过身前一段。
            let head = origin;
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

            /** 画面只画当刻真实的一段：头在真实前沿，尾是这一段的起点；机制与表现共用端点。 */
            function show(current: CombatAction, frontier: CombatPoint): void {
                scenes.show(current, "flight", origin, {
                    moment: "flight", path: [sacredfireVertex(head), sacredfireVertex(frontier)],
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

            /** 碰到方块或未知接触：圣火在接触点散开，不留持续伤害区。 */
            function land(current: CombatAction, at: CombatPoint, wall: boolean): void {
                scenes.stop(current, "flight");
                const scope = current.world();
                WorldFeedback.emit(scope, sacredfireScene, 1, at, { moment: "whiff", sparks: sparks, scale: scale, intensity: intensity, wall: wall ? 1 : 0 }, 26);
                sound(current, "minecraft:entity.generic.explode");
                finish(current);
            }

            function advance(current: CombatAction): void {
                if (settled) return;
                const step = Math.min(pace, travel - travelled);
                if (step <= 0.001) {
                    show(current, head);
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
            advance(action);
        }
    });
}
