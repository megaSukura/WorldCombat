/**
 * 泰山压顶 / bodyslam 的出手方式。
 *
 * 念头的形状：蹲身蓄力（windup，提交前只播预告）→ 朝计划落点跃起（leap）→ 以整个身体的重量砸在
 * **实际身体落地点**（crash），落点范围内的敌人一起被压中，按体重决定是否被压麻并沿背离方向顶开（impact）→ 收势扬尘。
 *
 * 空间事实：点选只决定起跳路线（`kind: "point"`，可指向空地，不要求有敌人）。逐刻用 `observe` 与 `displace`
 * 的实际结果推进，并用完整身体碰撞区分三类接触：垂直抬升被挡＝上方受阻（矮顶/头顶实体），转入真实下落；
 * 水平被挡＝侧墙，只挡住那一小步，照常升落；垂直下落被挡或原生接地＝真正落脚，才在真实脚底位置结算 crash。
 * 悬空走完下落预算仍不落地就安全收势，绝不在半空假造落地伤。因此墙边身体没过去时墙后敌人不会被压中，
 * 对手在被压中前走开也能躲开。两幕：leap → crash（可带多个 impact）。提交后才触碰世界，准备期只 present。
 */
namespace PokemonSkills {
    const bodyslamScene = "world_combat:move_bodyslam";
    const bodyslamHitText = "world_combat.move.bodyslam.text.hit";
    const bodyslamMissText = "world_combat.move.bodyslam.text.miss";

    /** 落到该落、自摔不该反过来伤施法者：清掉原生累积的下落距离。 */
    function bodyslamResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    define({
        freeMovement: true,
        id: "bodyslam",
        name: "Body Slam",
        description: "猛地跳起，用整个身体的重量砸向计划落点：范围内所有敌人受伤并被顶开，越重越可能把它们压麻；点选空地也能起跳，半途撞墙或被天花板挡下时就地落下，只有身体真正砸到的位置才算数。震地式摊大范围但单点更轻，压顶式相反。",
        uses: ["从上方压住一个目标", "把落点周围挤在一起的敌人一起震开", "用体重压出更高的麻痹机会"],
        kind: "point",
        range: 4,
        maxRange: 7,
        prepare: 8,
        active: 44,
        recover: 10,
        cooldown: 34,
        style: "drop",
        defaults: { splash: false, ai: { maxChase: 8, preferCrowd: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["bodyslam"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var splash = !!(config && config.splash);
            return {
                prepare: p("bodyslam", "prepare", context) + (splash ? 2 : 0),
                recover: p("bodyslam", "recover", context) + (splash ? 3 : 0),
                cooldown: p("bodyslam", "cooldown", context) + (splash ? 6 : 0),
                range: p("bodyslam", "leap", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            var splash = !!(config && config.splash);
            action.present("world_combat:move_bodyslam:windup", bodyslamScene, 1, action.origin(), JSON.stringify({ moment: "windup", splash: splash }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const planned = action.targetPosition();
            const origin = action.origin();
            const power = p("bodyslam", "crush", action);
            const radius = p("bodyslam", "landRadius", action);
            const chance = p("bodyslam", "slamChance", action);
            const push = p("bodyslam", "push", action);
            const hop = p("bodyslam", "hop", action);
            const air = Math.max(6, Math.round(p("bodyslam", "airTicks", action)));
            const leap = p("bodyslam", "leap", action);
            const minMove = Math.max(0.02, p("bodyslam", "minimumMove", action));
            const scale = radius / 2.0;
            const delta = planned.minus(origin);
            const flat = WorldCombat.point(delta.x(), 0, delta.z());
            const heading = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const approach = Math.max(0, Math.min(leap, flat.length() - 0.5));
            const rise = Math.max(2, Math.floor(air / 2));
            const fall = Math.max(2, air - rise);
            const horizontal = flat.length() < 1e-6 ? 0 : approach / air;
            const up = hop / rise;
            const down = hop / fall;
            // 真实下落最多再走这些刻；悬空超时只收势，不假造落地。
            const descendBudget = fall + Math.max(8, Math.ceil(6 / Math.max(0.05, down)));
            const apexY = origin.y() + hop;
            let finished = false;

            WorldFeedback.emit(world, bodyslamScene, 1, origin, { moment: "leap", scale: scale, hop: hop }, 24);
            sound(action, "minecraft:entity.ravager.step");

            function end(current: CombatAction): void { if (finished) return; finished = true; done(current); }

            /** 贴地标记：始终画在当前真实会落下的脚下，贯穿整段动作。 */
            function shadow(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                const ground = WorldGeometry.ground(scope, at, 6);
                WorldFeedback.keep(scope, "world_combat:move_bodyslam:shadow", bodyslamScene, 1, ground,
                    { moment: "mark", scale: scale }, 6);
            }

            function crash(current: CombatAction): void {
                if (finished) return;
                const scope = current.world();
                const self = scope.observe(actor);
                // 只有身体真正落到的地方才结算：以真实脚底为圈心。
                const landing = self === null ? current.origin() : self.position();
                const ground = WorldGeometry.ground(scope, landing, 4);
                const region = WorldGeometry.ring(ground, 0, radius, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (target, facts) {
                    // 不穿墙楼板：真实落点到目标身体要真的通视。
                    if (!scope.clear(ground, facts.position())) return;
                    const landed = hurt(current, target, "bodyslam", power,
                        { damage: damageSpec("bodyslam", "crush"), contact: true, status: "paralysis", chance: chance });
                    if (!landed) return;
                    hits++;
                    if (scope.valid(target)) {
                        const away = facts.position().minus(ground);
                        const flatAway = WorldCombat.point(away.x(), 0, away.z());
                        if (flatAway.length() >= 0.05) scope.hitDisplace(target, flatAway.unit().scale(push));
                    }
                    WorldFeedback.emit(scope, bodyslamScene, 1, facts.position(),
                        { moment: "impact", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.4, power / 80)) }, 28);
                });
                WorldFeedback.emit(scope, bodyslamScene, 1, ground,
                    { moment: "crash", scale: scale, bursts: 18 + hits * 8, intensity: Math.max(0.6, Math.min(2.2, power / 80)), hits: hits }, 32);
                sound(current, "minecraft:item.mace.smash_ground_heavy");
                WorldFeedback.text(scope, ground.plus(WorldCombat.point(0, 1.4, 0)), hits > 0 ? bodyslamHitText : bodyslamMissText, hits > 0 ? [hits] : [], 28);
                end(current);
            }

            function descend(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { end(current); return; }
                const here = self.position();
                shadow(current, here);
                // 原生接地，或向下位移被实心面挡住，才是真正落脚；悬空超时只收势。
                if (self.grounded()) { crash(current); return; }
                if (elapsed >= descendBudget) { end(current); return; }
                const toPlan = WorldCombat.point(planned.x() - here.x(), 0, planned.z() - here.z());
                if (toPlan.length() > 0.3 && horizontal > 0)
                    scope.displace(actor, toPlan.unit().scale(Math.min(horizontal, toPlan.length())));
                bodyslamResetFall(scope, actor);
                if (scope.displace(actor, WorldCombat.point(0, -down, 0)) < down - minMove) { crash(current); return; }
                current.after(1, function (next: CombatAction) { descend(next, elapsed + 1); });
            }

            function ascend(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { end(current); return; }
                shadow(current, self.position());
                if (elapsed >= rise) { descend(current, 0); return; }
                const here = self.position();
                const toPlan = WorldCombat.point(planned.x() - here.x(), 0, planned.z() - here.z());
                if (toPlan.length() > 0.3 && horizontal > 0)
                    scope.displace(actor, toPlan.unit().scale(Math.min(horizontal, toPlan.length())));
                // 完整身体抬不动就是上方受阻（矮顶或头顶实体）：转入真实下落，不把侧墙当落地。
                const stepUp = Math.min(up, Math.max(0, apexY - here.y()));
                if (stepUp > 0.02) {
                    bodyslamResetFall(scope, actor);
                    if (scope.displace(actor, WorldCombat.point(0, stepUp, 0)) < stepUp - 0.02) { descend(current, 0); return; }
                }
                current.after(1, function (next: CombatAction) { ascend(next, elapsed + 1); });
            }
            ascend(action, 0);
        }
    });
}
