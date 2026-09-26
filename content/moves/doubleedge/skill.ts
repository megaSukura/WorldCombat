/**
 * 舍身冲撞 / doubleedge 的出手方式。
 *
 * 核心念头：一次最朴素的全身正面猛冲——压低身体沿瞄准方向直线撞出去，撞实的一刻把惯性整个压进目标：
 * 目标被顶飞，自己不再被反震弹开，而是贴着它短促压身、再原地沉重收势，把破绽留在原地。
 * 它是这一族里最直白的一招，也是唯一“顶飞后原地贴住露破绽”的；反震中等，不追求极端自损。
 *
 * 两幕：
 *   起（windup，提交前）：压低身体、踏地蓄势，只播预告。
 *   撞（charge → press → settle）：提交后逐刻沿瞄准方向推进；trace 撞上活体即结算 tackle 接触伤害一次，
 *       按 recoil 比例反伤自己（共享结算），把目标沿冲撞方向顶飞 shove 格，随后原地压身 press 刻、不能自由转向追打，
 *       再脚底两步收势；冲到底、撞墙或推不动就只是收势（settle）——这一招撞空不自伤，那是双刃头锤的代价。
 *
 * 与同族分开：勇鸟猛攻从空中俯冲打穿一条线；波动冲裹水撞击、把人浇透；木槌用坚硬躯体垂直砸下。
 * 舍身冲撞的辨识点是撞完之后不弹回、贴住压身再原地收势的那一下。
 * 配置 brace（定桩式）由 resolve 改时序、由公式改威力/反伤/顶飞/压身，提交后才触碰世界。
 */
namespace PokemonSkills {
    const doubleedgeScene = "world_combat:move_doubleedge";
    const doubleedgeHitText = "world_combat.move.doubleedge.text.hit";
    const doubleedgeSkidText = "world_combat.move.doubleedge.text.skid";
    const doubleedgeSettleText = "world_combat.move.doubleedge.text.settle";

    define({
        freeMovement: true,
        id: "doubleedge",
        cooldownParameter: "recharge",
        name: "Double-Edge",
        description: "最朴素的全身正面猛冲：压低身体直线撞出去，撞实后把目标顶飞，自己贴住压身再原地沉重收势，并承担中等反伤。撞空只是收势，不自伤。",
        uses: ["正面撞开一个挡路的对手", "把目标顶离队友或顶下高台", "在生存无虞时换一记扎实的接触重击"],
        kind: "aim",
        range: 4.0,
        maxRange: 7.2,
        prepare: 8,
        active: 34,
        recover: 9,
        cooldown: 46,
        style: "contact",
        defaults: { brace: false, ai: { maxChase: 9, minHealth: 0.3 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("doubleedge", "collisionRadius", pokemon) * 1.7, geometry: "line", style: "contact",
                color: 0xD9CBB0, label: config && config.brace === true ? "定桩式舍身冲撞" : "舍身冲撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["doubleedge"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("doubleedge", "tempo", context)),
                recover: Math.round(p("doubleedge", "aftercast", context)),
                cooldown: Math.round(p("doubleedge", "recharge", context)),
                active: skills["doubleedge"].active,
                range: p("doubleedge", "rush", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_doubleedge:tempo", doubleedgeScene, 1, action.origin(),
                JSON.stringify({ moment: "tempo", brace: !!(config && config.brace) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(doubleedgeScene);
            const world = action.world();
            const length = p("doubleedge", "rush", action);
            const speed = p("doubleedge", "speed", action);
            const radius = p("doubleedge", "collisionRadius", action);
            const minimumMove = p("doubleedge", "minimumMove", action);
            const power = p("doubleedge", "tackle", action);
            const recoil = p("doubleedge", "recoil", action);
            const shove = p("doubleedge", "shove", action);
            const press = Math.max(1, Math.round(p("doubleedge", "press", action)));
            const dust = Math.round(p("doubleedge", "dust", action));
            // 地面冲锋用水平方向：站立的身体若带向下分量会被地板判成初始接触而原地受阻。
            const direction = WorldGeometry.flatUnit(aim(action), action.direction());
            const scale = radius / 0.55;
            const intensity = Math.max(0.6, Math.min(2.4, power / 115));
            let travelled = 0, settled = false;

            movementScenes.show(action, "charge", action.origin(), { moment: "charge", dust: dust, scale: scale, intensity: intensity });
            sound(action, "cobblemon:move.bodyslam.actor_1");
            sound(action, "minecraft:entity.player.attack.strong");

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            /** 收势：脚底两步稳住，没有第二击粒子，也不额外自伤。 */
            function settle(current: CombatAction, whiff: boolean): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, doubleedgeScene, 1, body.position(),
                        { moment: "settle", dust: dust, scale: scale, intensity: intensity * 0.7 }, 24);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                        whiff ? doubleedgeSkidText : doubleedgeSettleText, [], 24);
                }
                sound(current, "minecraft:block.gravel.break");
                finish(current);
            }

            /** 贴住保持压身：每刻停下脚步，压满 press 刻再收势。 */
            function hold(current: CombatAction, remaining: number): void {
                current.stopMovement();
                if (remaining <= 0) { settle(current, false); return; }
                current.after(1, function (next: CombatAction) { hold(next, remaining - 1); });
            }

            /** 撞实：伤害只结算一次，然后顶飞、贴压、再原地收势；自己不再被弹回。 */
            function collide(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world(), target = hit.target(), point = hit.position();
                const landed = impact(current, hit, "doubleedge", power,
                    { damage: damageSpec("doubleedge", "tackle"), contact: true, recoil: recoil });
                WorldFeedback.emit(scope, doubleedgeScene, 1, point,
                    { moment: "impact", target: target ? String(target.ref()) : "", dust: dust, scale: scale,
                        intensity: Math.max(0.6, Math.min(2.4, power / 110)) }, 30);
                sound(current, "cobblemon:move.bodyslam.target");
                if (landed && target !== null && scope.valid(target)) {
                    scope.hitDisplace(target, direction.scale(shove));
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), doubleedgeHitText, [], 28);
                }
                movementScenes.stop(current, "charge");
                hold(current, press);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), origin = current.origin();
                const step = Math.min(speed, Math.max(0, length - travelled));
                if (step <= 0.001) { movementScenes.stop(current, "charge"); settle(current, true); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) { collide(current, hit); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < minimumMove || travelled >= length) {
                    movementScenes.stop(current, "charge"); settle(current, true); return;
                }
                movementScenes.show(current, "charge", origin, { moment: "charge", dust: dust, scale: scale, intensity: intensity, ratio: Math.min(1, travelled / Math.max(0.001, length)) });
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
