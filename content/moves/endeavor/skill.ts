/**
 * 蛮干 / endeavor 的出手方式。
 *
 * 念头的形状：压低身子站定，在两人之间拉出一根「量尺」（windup，提交前只播预告，读双方生命差）→
 * 贴地沿水平方向扑出去（dash，画面每刻沿真实身体子段铺线）→ 撞上的一刻把对手的血线拽到自己这条线上
 * （equalize：按**实际撞上的身体**的生命差直接结算）。
 * 自己更健康时量尺为零，扑上去也只擦出一记空响（flat）——这招只有在「你落后」时才有形状。
 * 越身式撞实后全身扫掠、沿原方向直直穿过对手换位，实墙或第二个身体会真实截停；代价是几乎不顶开。
 *
 * 选取：`kind: "aim"`——方向、世界点或敌人辅助瞄准都行，允许空扑；提交时不要求存在敌人。
 * 命中后显示的是原生受伤入口实际扣掉的生命，被免疫、护盾或伤害上限挡下时显示「被挡」，没有虚假平血。
 * 碰撞半径只由身体/技能半径决定；推进的只剩「几乎没动」这种真卡住才停（minimumMove）。
 *
 * 三幕：windup（brace + measure）→ dash → equalize / flat。提交后才触碰世界。
 */
namespace PokemonSkills {
    const endeavorScene = "world_combat:move_endeavor";
    const endeavorHitText = "world_combat.move.endeavor.text.hit";
    const endeavorFlatText = "world_combat.move.endeavor.text.flat";
    const endeavorBlockText = "world_combat.move.endeavor.text.blocked";
    const endeavorMissText = "world_combat.move.endeavor.text.miss";

    function endeavorVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    define({
        freeMovement: true,
        id: "endeavor",
        name: "Endeavor",
        description: "扑身拉平：把对手当前生命拽下来到你这条血线上，伤害正好是「对手生命 − 自己生命」。自己越残、对手越健康，这一下越重；自己更健康时它一分伤害也没有。越身式扑得更远、撞后穿过对手换位，代价是几乎不顶开。",
        uses: ["把高血的对手拉低到自己这条血线", "残血时反打一记大的", "越身换位躲开正面"],
        kind: "aim",
        range: 2.5,
        maxRange: 4.6,
        prepare: 8,
        active: 24,
        recover: 10,
        cooldown: 38,
        style: "contact",
        defaults: { vault: false, ai: { maxChase: 7, minGap: 0.12, finish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("endeavor", "collisionRadius", pokemon), geometry: "line", style: "contact", color: 0xB5342B, label: "蛮干" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["endeavor"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const vault = !!(config && config.vault);
            return {
                prepare: p("endeavor", "brace", context),
                recover: p("endeavor", "recover", context) + (vault ? 2 : 0),
                cooldown: p("endeavor", "cooldown", context) + (vault ? 6 : 0),
                range: p("endeavor", "lunge", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_endeavor:brace", endeavorScene, 1, action.origin(), JSON.stringify({ moment: "brace" }));
            const target = action.target();
            if (target !== null) {
                action.present("world_combat:move_endeavor:measure", endeavorScene, 1, action.origin(), JSON.stringify({
                    moment: "measure", target: String(target.ref()),
                    path: [String(action.actor().ref()), String(target.ref())]
                }));
            }
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(endeavorScene);
            const world = action.world(), self = action.actor();
            const vault = !!(config && config.vault);
            const length = p("endeavor", "lunge", action);
            const speed = p("endeavor", "lungeSpeed", action);
            const radius = p("endeavor", "collisionRadius", action);
            const shove = p("endeavor", "shove", action);
            const minimumMove = p("endeavor", "minimumMove", action);
            // 地面扑身投影到水平移动平面：站立的身体带向下分量会被地板判成初始接触。
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const directionData = endeavorVector(direction);
            const scale = radius / 0.45;
            const start = world.observe(self);
            if (start === null) { movementScenes.finish(action, done); return; }
            let travelled = 0, settled = false, struckRef = "";

            sound(action, "minecraft:entity.player.attack.weak");

            /** 沿真实身体轨迹铺一道扑身线；每刻只发当刻实际移动的那一小段，判定与画面共用端点。 */
            function showDash(current: CombatAction, from: CombatPoint, to: CombatPoint): void {
                movementScenes.show(current, "dash", from, { moment: "dash", direction: directionData, scale: scale,
                    path: to.minus(from).length() > 0.001 ? [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]] : [] });
            }

            /** 收势：落点播 settle，miss 时补一行浮字。命中/空响的浮字已在各自幕里写出。 */
            function settle(current: CombatAction, missed: boolean, at: CombatPoint): void {
                if (settled) return;
                settled = true;
                WorldFeedback.emit(current.world(), endeavorScene, 1, at, { moment: "settle", scale: scale }, 22);
                if (missed) {
                    const body = current.world().observe(current.actor());
                    if (body !== null) WorldFeedback.text(current.world(), body.position().plus(WorldCombat.point(0, 1.2, 0)), endeavorMissText, [], 22);
                }
                sound(current, missed ? "minecraft:entity.player.attack.sweep" : "minecraft:entity.iron_golem.attack");
                movementScenes.finish(current, done);
            }

            /** 撞实后的越身滑行：全身扫掠、逐刻计总距离；已撞中的身体被排除，实墙或第二个身体会真实截停。 */
            function slide(current: CombatAction, remaining: number, left: number): void {
                if (settled) return;
                const scope = current.world();
                if (remaining <= 0.02 || left <= 0) { settle(current, false, current.origin()); return; }
                const before = current.origin();
                const hit = current.moveSweep(direction.scale(Math.min(remaining, speed * 0.7)), radius,
                    struckRef === "" ? undefined : JSON.stringify([struckRef]));
                const after = current.origin(), moved = after.minus(before).length();
                travelled += moved;
                showDash(current, before, after);
                if (hit.blocked() || hit.hitEntity() || moved < minimumMove) { settle(current, false, after); return; }
                current.after(1, function (next: CombatAction) { slide(next, remaining - moved, left - 1); });
            }

            function strike(current: CombatAction, target: CombatActor, at: CombatPoint): void {
                const scope = current.world();
                const selfBody = scope.observe(self), targetBody = scope.observe(target);
                // 拉平伤害读的是实际撞上的这个身体，而不是当初选中的目标：拦截者按它自己的生命差结算。
                const damage = selfBody === null || targetBody === null ? 0
                    : Math.max(0, Math.round((targetBody.health() - selfBody.health()) * 10) / 10);
                const actual = endeavorRawHit(current, target, damage, true);
                if (actual > 0) {
                    const body = scope.observe(target);
                    const maximum = body === null ? 0 : body.maxHealth();
                    const intensity = maximum <= 0 ? 0.6 : Math.min(2.6, 0.4 + actual / maximum * 3.2);
                    WorldFeedback.emit(scope, endeavorScene, 1, at,
                        { moment: "equalize", target: String(target.ref()),
                            count: Math.round(14 + intensity * 26), scale: scale }, 28);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), endeavorHitText, [Math.round(actual)], 26);
                    sound(current, "cobblemon:impact.fighting");
                    if (vault) { struckRef = String(target.ref()); slide(current, length * 0.6, 8); return; }
                    // 目标推力走原生受击位移，保留抗击退与事件。
                    if (scope.valid(target)) scope.hitDisplace(target, direction.scale(shove));
                    settle(current, false, at);
                    return;
                }
                // 伤害为零：要么是彼此血量已持平（flat），要么是属性免疫/护盾/伤害上限把这一记挡下（blocked）。
                const blocked = damage > 0.01;
                WorldFeedback.emit(scope, endeavorScene, 1, at,
                    { moment: blocked ? "blocked" : "flat", target: String(target.ref()), scale: scale }, 22);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), blocked ? endeavorBlockText : endeavorFlatText, [], 22);
                settle(current, false, at);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const before = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { settle(current, true, before); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                showDash(current, before, current.origin());
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && !scope.friendly(target)) { strike(current, target, hit.position()); return; }
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) {
                    settle(current, true, before);
                    return;
                }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
