/**
 * 狙击 / snipeshot —— 注册与动作。
 *
 * 核心念头：先把准星压到**选定的那一个对手**身上，再射出一发会追踪、会穿过挡路者的远距离水弹——
 *   只有被准星标中的那只挨伤害，中途别的身影、诱饵、扎堆的前排都被穿过去，引不开这一枪。
 *   原生高暴击（critRatio 2）由共享结算读取原生模板。
 *
 * 幕：
 *   起（windup，提交前）：举枪屏息、准星成形的预告（`action.present`，可被打断、不花 PP）。
 *   锁（mark）：提交后给选定对手打上准星（`moment: "mark"`）。
 *   射（shot → strike / pierce）：水弹带追踪发射；命中锁定目标结算一次 `shot` 特殊伤害；
 *     撞到别的生物只给一个 `pierce` 表现、不结算，继续飞（`pierce` 穿透数由公式给出）。
 *   收：水弹自然结束（命中、撞墙或飞完射程）后收招。
 *
 * 配置 `deadeye`（屏息狙击）由 resolve 改时序、由公式改射程与威力：开启＝更远更重、出手更慢。
 */
namespace PokemonSkills {
    const snipeshotScene = "world_combat:move_snipeshot";
    const snipeshotHitText = "world_combat.move.snipeshot.text.hit";
    const snipeshotMissText = "world_combat.move.snipeshot.text.miss";

    define({
        id: "snipeshot",
        cooldownParameter: "recharge",
        name: "Snipe Shot",
        description: "锁定一名选定的对手，射出一发会追踪、会穿过中间其他生物的水弹：只有被锁定的那只挨到伤害，别的身影与前排都引不开它。原生高暴击；屏息狙击攻更远更重、出手更慢。",
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
            action.present("snipeshot:aim:" + action.id(), snipeshotScene, 1, action.origin(),
                JSON.stringify({ moment: "aim", deadeye: config && config.deadeye === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            return { radius: p("snipeshot", "reach", pokemon), geometry: "line", style: "snipeshot", color: 0x6FD3F2,
                label: config && config.deadeye === true ? "狙击·屏息" : "狙击" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null || target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, snipeshotScene, 1, body === null ? action.origin() : body.position(), { moment: "miss" }, 16);
                WorldFeedback.text(world, (body === null ? action.origin() : body.position()).plus(WorldCombat.point(0, 1, 0)), snipeshotMissText, [], 22);
                done(action); return;
            }
            const victimBody = world.observe(target);
            if (victimBody === null) { WorldFeedback.emit(world, snipeshotScene, 1, body.position(), { moment: "miss" }, 16); done(action); return; }
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
            let spent = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            WorldFeedback.emit(world, snipeshotScene, 1, to,
                { moment: "mark", target: lockedRef, motes: motes, scale: scale, intensity: intensity }, 26);
            sound(action, "minecraft:entity.arrow.shoot");
            WorldFeedback.keep(world, "snipeshot:shot:" + action.id(), snipeshotScene, 1, from,
                { moment: "shot", motes: motes, scale: scale, intensity: intensity, direction: [heading.x(), heading.y(), heading.z()] }, 80);

            LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: heading,
                appearance: { sprite: "cobblemon:generic/water/waterjet_head", tint: 0x6FD3F2, glow: true, scale: scale,
                    pierce: through, homing: { target: lockedRef, turn: turn, range: action.range() } },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const struck = hit.target();
                    if (struck !== null && scope.valid(struck) && String(struck.ref()) === lockedRef && !spent) {
                        spent = true;
                        const landed = impact(current, hit, "snipeshot", power, { damage: damageSpec("snipeshot", "shot") });
                        const at = scope.observe(struck);
                        WorldFeedback.emit(scope, snipeshotScene, 1, at === null ? hit.position() : at.position(),
                            { moment: landed ? "strike" : "graze", target: lockedRef, motes: motes, scale: scale, intensity: intensity }, 24);
                        if (landed && at !== null)
                            WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)), snipeshotHitText, [through], 24);
                    } else if (struck !== null && scope.valid(struck)) {
                        const at = scope.observe(struck);
                        WorldFeedback.emit(scope, snipeshotScene, 1, at === null ? hit.position() : at.position(),
                            { moment: "pierce", target: String(struck.ref()), motes: Math.max(6, Math.round(motes / 2)), scale: scale }, 18);
                    }
                }
            }, function (current: CombatAction) { finish(current); });
        }
    });
}
