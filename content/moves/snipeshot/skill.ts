/**
 * 狙击 / snipeshot —— 注册与动作。
 *
 * 核心念头：先把准星压到**选定的那一个对手**身上，再射出一发会追踪、会穿过挡路者的远距离水弹——
 *   只有被准星标中的那只挨伤害，中途别的身影、诱饵、扎堆的前排都被穿过去，引不开这一枪。
 *   原生高暴击（critRatio 2）由共享结算读取原生模板。
 *
 * 幕：
 *   起（windup，提交前）：举枪屏息、枪口聚光；同时在选定对手身上亮起准星，覆盖整段准备期（`action.present`）。
 *   射（shot → strike / pierce / spent）：水弹带追踪发射，尾迹绑在返回的真实弹体 id 上、与弹体同行；
 *     命中锁定目标结算一次 `shot` 特殊伤害，并把这一枪**实际穿过**的挡路者数写进命中浮字；
 *     撞到别的生物只给一个 `pierce` 表现、不结算，继续飞（`pierce` 穿透数由公式给出，是有限预算）。
 *   收：水弹自然结束（命中、撞墙、穿透预算耗尽或飞完射程）后，在 `world.projectilePosition` 的**真实结束点**
 *     收束；没打中锁定者时在那里留下一记落空回执，不再用一个假终点。
 *
 * 配置 `deadeye`（屏息狙击）由 resolve 改时序、由公式改射程与威力：开启＝更远更重、出手更慢。
 * 前方挡路者超过穿透预算时，水弹会被拦住——所以前排真的能保护后排，而不是无条件贯穿。
 */
namespace PokemonSkills {
    const snipeshotScene = "world_combat:move_snipeshot";
    const snipeshotHitText = "world_combat.move.snipeshot.text.hit";
    const snipeshotMissText = "world_combat.move.snipeshot.text.miss";
    const snipeshotSpentText = "world_combat.move.snipeshot.text.spent";

    define({
        id: "snipeshot",
        cooldownParameter: "recharge",
        name: "Snipe Shot",
        description: "锁定一名选定的对手，射出一发会追踪、会穿过中间其他生物的水弹：只有被锁定的那只挨到伤害，别的身影与前排都引不开它。穿透有预算，前方挡路者太多时水弹会被拦下；原生高暴击；屏息狙击攻更远更重、出手更慢。",
        uses: ["越过前排直取选定的后排目标", "在人群中只打指定的一只，不被别的身影引偏", "用超远射程先手开火"],
        kind: "enemy",
        range: 13,
        maxRange: 20,
        prepare: 11,
        active: 1,
        recover: 8,
        cooldown: 34,
        style: "snipeshot",
        defaults: { deadeye: false, ai: { maxChase: 20, preferCrowd: true, finishLow: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["snipeshot"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("snipeshot", "tempo", context)),
                recover: Math.round(p("snipeshot", "recover", context)),
                cooldown: Math.round(p("snipeshot", "recharge", context)),
                active: skills["snipeshot"].active,
                range: p("snipeshot", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(10, Math.round(p("snipeshot", "motes", action)));
            const radius = Math.max(0.12, p("snipeshot", "radius", action));
            const power = p("snipeshot", "shot", action);
            const target = action.target();
            const lockedRef = target !== null ? String(target.ref()) : "";
            const scale = Math.max(0.7, Math.min(1.6, radius / 0.18));
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            // 屏息：枪口聚光；同时把准星压到选定对手身上，覆盖整段准备期。
            action.present("snipeshot:aim:" + action.id(), snipeshotScene, 1, action.origin(),
                JSON.stringify({ moment: "aim", windup: prepare, deadeye: config && config.deadeye === true }));
            action.present("snipeshot:mark:" + action.id(), snipeshotScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "mark", target: lockedRef, motes: motes, scale: scale, intensity: intensity,
                    windup: prepare, deadeye: config && config.deadeye === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: p("snipeshot", "reach", pokemon), geometry: "line", style: "snipeshot", color: 0x6FD3F2,
                label: config && config.deadeye === true ? "狙击·屏息" : "狙击" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            const scenes = WorldFeedback.actionScenes(snipeshotScene);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            if (body === null || target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, snipeshotScene, 1, body === null ? action.origin() : body.position(), { moment: "miss" }, 16);
                WorldFeedback.text(world, (body === null ? action.origin() : body.position()).plus(WorldCombat.point(0, 1, 0)), snipeshotMissText, [], 22);
                finish(action); return;
            }
            const victimBody = world.observe(target);
            if (victimBody === null) { WorldFeedback.emit(world, snipeshotScene, 1, body.position(), { moment: "miss" }, 16); finish(action); return; }
            const power = p("snipeshot", "shot", action);
            const speed = Math.max(0.8, p("snipeshot", "flight", action));
            const radius = Math.max(0.12, p("snipeshot", "radius", action));
            const through = Math.max(0, Math.min(6, Math.round(p("snipeshot", "through", action))));
            const motes = Math.max(10, Math.round(p("snipeshot", "motes", action)));
            const turn = Math.max(8, Math.round(p("snipeshot", "turn", action)));
            const lockedRef = String(target.ref());
            const intensity = Math.max(0.6, Math.min(2.2, power / 50));
            const scale = Math.max(0.7, Math.min(1.6, radius / 0.18));
            const from = body.position();
            const to = victimBody.position();
            const delta = to.minus(from);
            const heading = delta.length() < 0.05 ? aim(action) : delta.unit();
            let spent = false, passed = 0, flight = "";

            sound(action, "minecraft:entity.arrow.shoot");
            flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: heading,
                appearance: { sprite: "cobblemon:generic/water/waterjet_head", tint: 0x6FD3F2, glow: true, scale: scale,
                    pierce: through, homing: { target: lockedRef, turn: turn, range: action.range() } },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const struck = hit.target();
                    if (struck === null || !scope.valid(struck)) return;
                    if (String(struck.ref()) === lockedRef) {
                        if (spent) return;
                        spent = true;
                        const landed = impact(current, hit, "snipeshot", power, { damage: damageSpec("snipeshot", "shot") });
                        const at = scope.observe(struck);
                        WorldFeedback.emit(scope, snipeshotScene, 1, at === null ? hit.position() : at.position(),
                            { moment: landed ? "strike" : "graze", target: lockedRef, motes: motes, scale: scale, intensity: intensity }, 24);
                        // 命中浮字用这一枪实际穿过的挡路者数，而不是配置预算。
                        if (landed && at !== null)
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), snipeshotHitText, [passed], 24);
                    } else if (!spent) {
                        passed++;
                        const at = scope.observe(struck);
                        WorldFeedback.emit(scope, snipeshotScene, 1, at === null ? hit.position() : at.position(),
                            { moment: "pierce", target: String(struck.ref()), motes: Math.max(6, Math.round(motes / 2)), scale: scale }, 18);
                    }
                }
            }, function (current: CombatAction) {
                // 飞尽/撞墙/穿透预算耗尽：只在没打中锁定者时，按弹体真实末点收束。
                if (!spent) {
                    const end = current.world().projectilePosition(flight);
                    if (end !== null) {
                        WorldFeedback.emit(current.world(), snipeshotScene, 1, end,
                            { moment: "spent", motes: Math.max(6, Math.round(motes * 0.6)), scale: scale }, 20);
                        WorldFeedback.text(current.world(), end.plus(WorldCombat.point(0, 1.0, 0)), snipeshotSpentText, [], 22);
                    }
                }
                finish(current);
            });
            // 托管尾迹：拿返回的弹体 id 绑定真实弹体，随动作结束收束。
            scenes.show(action, "shot", from,
                { moment: "shot", projectile: flight, motes: motes, scale: scale, intensity: intensity, direction: [heading.x(), heading.y(), heading.z()] });
        }
    });
}
