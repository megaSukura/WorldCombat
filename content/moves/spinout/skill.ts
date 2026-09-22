/**
 * 疾速转轮 / spinout 的出手方式。
 *
 * 核心念头：**过度旋转**——压低重心、双脚摩擦地面冒出火星，整个人像陀螺一样高速旋进目标；撞实后转势
 *   收不住、腿被反噬，速度大幅下降 2 级。它是这族里唯一会移动的招式，也是最贵的自我代价。
 *
 * 三幕（提交前只播预告）：
 *   起（wind）：压腿、重心往下沉，脚边火星先转起来，只播预告。
 *   旋（charge → impact）：提交后贴地旋转冲向目标当前位置（每刻推进 `rush`，最远 `reach`）；贴上即结算
 *       一次 `spin` 接触伤害，把目标沿冲击方向撞开 `knock`，撞击点地面磨出 `scuffRadius` 的痕。
 *   滞（stagger）：转势收不住，自身速度 −`speedLoss` 级并浮字；落空只留一路空转的火星。
 *
 * 与同族分开：狂舞挥打是原地转整圈的覆盖、臂锤/冰锤是原地过顶单体重砸；疾速转轮是唯一贴地旋转冲进、
 *   命中后自身速度降 2 级的招式。
 *
 * 配置 `preload` 由公式改威力／冲距／冲速／火星／时序，由本文件决定旋转冲刺与撞击结算；提交后才触碰世界。
 */
namespace PokemonSkills {
    const spinoutScene = "world_combat:move_spinout";
    const spinoutStaggerText = "world_combat.move.spinout.text.stagger";
    const spinoutMissText = "world_combat.move.spinout.text.miss";

    define({
        id: "spinout",
        name: "Spin Out",
        description: "The user spins furiously by straining its legs, inflicting damage on the target. This also harshly lowers the user's Speed stat.",
        uses: ["贴地旋转冲进一个目标，打出高额单发", "把目标撞开、自己转向下一处", "用一次最贵的自我减速换掉关键目标"],
        kind: "enemy",
        range: 3.0,
        maxRange: 5.2,
        prepare: 10,
        active: 0,
        recover: 12,
        cooldown: 40,
        maximumTicks: 240,
        style: "spindash",
        defaults: { preload: false, ai: { maxChase: 8, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("spinout", "reach", pokemon) : 3.0, geometry: "line", style: "spindash",
                color: 0x6E7C8C, label: config && config.preload === true ? "预旋式" : "即转式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spinout"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("spinout", "tempo", context)),
                recover: Math.round(p("spinout", "aftercast", context)),
                cooldown: Math.round(p("spinout", "recharge", context)),
                active: 0,
                range: p("spinout", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("spinout:wind", spinoutScene, 1, action.origin(),
                JSON.stringify({ moment: "wind", preload: config && config.preload === true ? 1 : 0,
                    power: Math.round(p("spinout", "spin", action)), sparks: Math.round(p("spinout", "sparks", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p("spinout", "spin", action);
            const reach = p("spinout", "reach", action);
            const rush = Math.max(0.2, p("spinout", "rush", action));
            const knock = p("spinout", "knock", action);
            const sparks = Math.max(6, Math.round(p("spinout", "sparks", action)));
            const scuffRadius = Math.max(0.7, p("spinout", "scuffRadius", action));
            const speedLoss = Math.max(0, Math.round(p("spinout", "speedLoss", action)));
            const contactGap = 0.7;
            const intensity = Math.max(0.5, Math.min(2.4, power / 100));
            const scale = Math.max(0.6, Math.min(2.0, scuffRadius / 1.2));
            let travelled = 0;

            sound(action, "cobblemon:move.flamewheel.actor");

            /** 贴上目标就结算：撞实、撞开、自身失速；都没贴上就只留空转的火星。 */
            function strike(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const selfAt = self !== null ? self.position() : current.origin();
                const victim = scope.actor(targetRef);
                let landed = false;
                if (victim !== null && scope.valid(victim) && !scope.friendly(victim)
                    && at.minus(selfAt).length() <= reach + 0.9) {
                    landed = hurt(current, victim, "spinout", power, { damage: damageSpec("spinout", "spin"), contact: true });
                    if (landed && scope.valid(victim)) {
                        const away = WorldCombat.point(at.x() - selfAt.x(), 0, at.z() - selfAt.z());
                        if (away.length() >= 0.05) scope.displace(victim, away.unit().scale(knock));
                    }
                }
                WorldFeedback.emit(scope, spinoutScene, 1, at,
                    { moment: landed ? "impact" : "miss", target: targetRef, landed: landed ? 1 : 0, sparks: sparks,
                        radius: scuffRadius, scale: scale, intensity: intensity }, 24);
                if (landed) {
                    sound(current, "cobblemon:impact.steel");
                    NativeEffects.boost(scope, actor, "spe", -speedLoss);
                    const after = scope.observe(actor);
                    const above = (after === null ? at : after.position()).plus(WorldCombat.point(0, 1.3, 0));
                    WorldFeedback.emit(scope, spinoutScene, 1, above,
                        { moment: "stagger", speedLoss: speedLoss, fatigue: Math.round(12 + speedLoss * 8), intensity: intensity }, 22);
                    WorldFeedback.text(scope, above, spinoutStaggerText, [speedLoss], 30);
                } else {
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), spinoutMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.weak");
                }
                done(current);
            }

            /** 贴地旋转冲进：每刻朝目标当前位置推进 `rush`，贴上或冲到 `reach` 就结算。 */
            function chase(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { done(current); return; }
                const victim = scope.actor(targetRef);
                if (victim === null || !scope.valid(victim)) { done(current); return; }
                const vbody = scope.observe(victim);
                if (vbody === null) { done(current); return; }
                const delta = vbody.position().minus(self.position());
                const flat = WorldCombat.point(delta.x(), 0, delta.z());
                const distance = flat.length();
                if (distance <= contactGap + 0.35 || travelled >= reach) { strike(current, vbody.position()); return; }
                const heading = flat.length() < 1e-6 ? aim(current) : flat.unit();
                const room = Math.min(rush, Math.max(0, distance - contactGap), Math.max(0, reach - travelled));
                if (room <= 0.03) { strike(current, vbody.position()); return; }
                const moved = scope.displace(actor, heading.scale(room));
                travelled += moved;
                WorldFeedback.keep(scope, "spinout:spin:" + String(current.actor().ref()), spinoutScene, 1, self.position(),
                    { moment: "spin", direction: [heading.x(), 0, heading.z()], sparks: sparks, radius: scuffRadius,
                        scale: scale, intensity: intensity }, 8);
                if (moved < room * 0.5) { strike(current, vbody.position()); return; }
                current.after(1, function (next: CombatAction) { chase(next); });
            }

            WorldFeedback.emit(world, spinoutScene, 1, action.origin(),
                { moment: "wind", sparks: sparks, intensity: intensity }, 16);
            chase(action);
        }
    });
}
