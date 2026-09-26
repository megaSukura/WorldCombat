/**
 * 迁怒 / frustration 的出手方式。
 *
 * 念头的形状：把憋着的不满在身前攥成一簇暗色刺团（windup，提交前只播预告）→ 朝选定的方向/对手扑近一小段（rush）→
 * 贴上去后连续抓出几爪，每爪独立结算一次接触伤害；中间几爪只是贴身的接触反馈，不把对手推走，最后一爪才把攒下的劲
 * 一次性送出去、明确抛开目标（rake × rakes、fling）→ 收势时吐出一口余恨（spite / miss）。
 * 亲密度越低，抓击越重、次数越多、间隔越短；它和报恩读同一个数、方向相反，靠「多段快抓」与「单次重击」分开。
 *
 * 每一爪都重取一次短距并重新判定：中间爪不再推开，所以不会自己把对手顶出连抓范围；对手主动走开仍能躲掉后面的爪。
 * 总伤害与总推力不变，只是把原本分散在每爪的顶开预算集中到最后一爪。
 *
 * 选取：`kind: "aim"`——可空扑、空抓；提交方向与短转向按现范围，不要求提交时存在敌人。
 *
 * 两幕半：rush（扑近）→ rake × rakes（连抓）→ fling / spite / miss（收势）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const frustrationScene = "world_combat:move_frustration";
    const frustrationSpiteText = "world_combat.move.frustration.text.spite";
    const frustrationMissText = "world_combat.move.frustration.text.miss";

    function frustrationAim(action: CombatAction): CombatPoint {
        const wanted = action.targetPosition().minus(action.origin());
        return wanted.length() < 0.01 ? action.direction() : wanted.unit();
    }

    define({
        freeMovement: true,
        id: "frustration",
        name: "Frustration",
        description: "把憋着的不满一次全抓出来：沿瞄准方向扑近后连续抓出几爪，每爪都是一段独立伤害；中间爪只做贴身接触，最后一爪才把攒下的劲一次性把对手推开。亲密度越低，抓得越重、越多、越密；它和报恩读同一个数、方向相反，一个连抓、一个单次重击。",
        uses: ["亲密度低时的一串连抓", "贴身把不满一次撒出去", "最后一爪把贴脸的对手推开"],
        kind: "aim",
        range: 2.8,
        maxRange: 4.6,
        prepare: 6,
        active: 24,
        recover: 8,
        cooldown: 16,
        style: "contact",
        defaults: { vent: false, ai: { maxChase: 7, finish: true, grudge: 90, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("frustration", "collisionRadius", pokemon), geometry: "line", style: "contact", color: 0x6E3B57, label: "迁怒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["frustration"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const vent = !!(config && config.vent);
            return {
                prepare: p("frustration", "prepare", context) + (vent ? 3 : 0),
                recover: p("frustration", "recover", context) + (vent ? 2 : 0),
                cooldown: p("frustration", "cooldown", context) + (vent ? 6 : 0),
                range: p("frustration", "lunge", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            const vent = !!(config && config.vent);
            action.present("world_combat:move_frustration:coil", frustrationScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", vent: vent, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(frustrationScene);
            const world = action.world();
            const self = action.actor();
            const foe = action.target();
            const vent = !!(config && config.vent);
            const lunge = p("frustration", "lunge", action);
            const pressSpeed = p("frustration", "pressSpeed", action);
            const radius = p("frustration", "collisionRadius", action);
            const rakePower = p("frustration", "rake", action);
            const rakes = Math.max(1, Math.round(p("frustration", "rakes", action)));
            const pace = Math.max(1, Math.round(p("frustration", "pace", action)));
            const push = p("frustration", "push", action);
            const deficit = p("frustration", "deficit", action);
            const scale = radius / 0.4;
            const intensity = Math.max(0.4, Math.min(2, 0.4 + deficit * 1.6));
            const sparks = Math.max(6, Math.round(intensity * 12));
            const embers = Math.max(8, Math.round(intensity * 14));
            const start = world.observe(self);
            if (start === null) { movementScenes.finish(action, done); return; }
            let travelled = 0, settled = false, anyLanded = false;
            let heading = frustrationAim(action);

            movementScenes.show(action, "rush", action.origin(), { moment: "rush", scale: scale, rakes: rakes, intensity: intensity, vent: vent });
            sound(action, "minecraft:entity.player.attack.weak");

            /** 收势：有爪落空也照常结束；miss 时补一行浮字。 */
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, frustrationScene, 1, body.position(),
                        { moment: anyLanded ? "spite" : "miss", scale: scale, intensity: intensity, embers: embers }, 22);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.25, 0)),
                        anyLanded ? frustrationSpiteText : frustrationMissText, [], 22);
                }
                sound(current, anyLanded ? "minecraft:entity.player.attack.sweep" : "minecraft:entity.player.attack.nodamage");
                movementScenes.finish(current, done);
            }

            /** 连抓：每一爪都朝当前可及的目标重取方向，抓中则独立结算一次伤害；最后一爪才把累积的顶开送出去。 */
            function strike(current: CombatAction, left: number): void {
                if (settled) return;
                const scope = current.world();
                const origin = current.origin();
                if (foe !== null && scope.valid(foe)) {
                    const body = scope.observe(foe);
                    const want = body === null ? null : body.position().minus(origin);
                    if (want !== null && want.length() > 0.01) heading = want.unit();
                }
                const index = rakes - left + 1;
                const isLast = left <= 1;
                const side = index % 2 === 0 ? 1 : -1;
                const hit = current.trace(origin, origin.plus(heading.scale(p("frustration", "reachAhead", current))), radius);
                let landed = false;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && !scope.friendly(target)) {
                        landed = impact(current, hit, "frustration", rakePower,
                            { damage: damageSpec("frustration", "rake"), contact: true });
                        if (landed) {
                            anyLanded = true;
                            // 中间爪不推开，避免自己把对手顶出连抓范围；最后一爪集中送出整段顶开预算。
                            if (isLast && scope.valid(target)) {
                                const moved = scope.hitDisplace(target, heading.scale(push * rakes));
                                if (moved > 0.001)
                                    WorldFeedback.emit(scope, frustrationScene, 1, hit.position(),
                                        { moment: "fling", direction: [heading.x(), heading.y(), heading.z()],
                                            moved: Math.round(moved * 10) / 10, scale: scale, intensity: intensity }, 20);
                            }
                        }
                    }
                }
                WorldFeedback.emit(scope, frustrationScene, 1, origin.plus(heading.scale(0.65)),
                    { moment: landed ? "rake" : "swipe", index: index, side: side, sideX: side * 0.18, tilt: side * 18,
                        last: isLast ? 1 : 0, rakes: rakes, sparks: sparks, intensity: intensity, scale: scale }, 18);
                if (landed) sound(current, "cobblemon:impact.dark");
                if (isLast) { finish(current); return; }
                current.after(pace, function (next: CombatAction) { strike(next, left - 1); });
            }

            /** 扑近：朝对手走完 lunge；贴到判定距离就开抓，撞墙或走完仍够不到就收势。 */
            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const goal = current.targetPosition();
                const gap = goal.minus(origin).length();
                if (gap > 0.01) heading = goal.minus(origin).unit();
                const step = Math.min(pressSpeed, Math.max(0, lunge - travelled), Math.max(0, gap - radius));
                const swept = sweepStep(current, heading.scale(step), radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && !scope.friendly(target)) { strike(current, rakes); return; }
                }
                if (step <= 0.01) { strike(current, rakes); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("frustration", "minimumMove", current)) { finish(current); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
