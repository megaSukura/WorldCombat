/**
 * 重磅冲撞 / heavyslam 的出手方式。
 *
 * 核心念头：把自己整副钢甲身躯当成武器砸下去。出手不靠力气，靠**分量比**——自己比对手越重，这一下越狠。
 *
 * 输入：`kind: "aim"`——可以点地面落点、也可点实体；提交时不要求存在敌人。落点会吸附到所选位置下方最近的合法地表。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：沉肩压腿，钢甲上掠过一层冷光。
 *   跃（ascend → descend）：沿落点方向腾空翻身，同时在地面标出**计划落点**；穹顶挡路会提前结束上升、缩短跳弧，
 *       真实下降落到哪、就在哪结算，不会在没走到的远端爆发。
 *   砸（crash）：以身体砸在**实际落地处**，该处一圈范围内所有敌人各按**自己的体重**结算 `crush` 伤害并被冲开。
 *       只有原生接地或身体真实接触才结算；悬空超时只安全收势，不假造地面伤。重量由身体着地的顿挫与碎屑表现，
 *       不替换地表、砸完不留东西。上升撞顶转真实下落，横向只受侧墙限制，不把侧墙当落地。
 *
 * 与 heatcrash 分开：重磅冲撞是高跃落圈的重量群击，高温重压是低扑贴地的短滑碾痕；玩家凭身体运动一眼分清。
 * 伤害按每个目标各自的体重比分别求值。提交后才触碰世界。
 */
namespace PokemonSkills {
    const heavyslamScene = "world_combat:move_heavyslam";
    const heavyslamHitText = "world_combat.move.heavyslam.text.hit";
    const heavyslamMissText = "world_combat.move.heavyslam.text.miss";

    /** 用某个具体目标的事实求本招的一项数值；双方体重只有在这里才互相读得到。 */
    function heavyslamValue(action: CombatAction, world: CombatWorld, target: CombatActor, values: any, key: string): number {
        const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["heavyslam"],
            detail: { values: values }, world: world, actor: action.actor(), target: { world: world, actor: target } };
        return p("heavyslam", key, context);
    }

    /** 落地/自摔不该反过来伤到施法者：每刻清掉原生累积的下落距离。 */
    function heavyslamResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    define({
        freeMovement: true,
        id: "heavyslam",
        name: "Heavy Slam",
        description: "把自己整副身躯从上方砸下去：自己比对手越重，这一下越狠。落点地面会先标出计划位置，真正砸在哪取决于身体实际落点——撞上矮顶会提前收弧。落地一圈冲击把周围敌人一起震开、按各自的体重结算伤害。沉坠式更集中更重，冲跳式跃得更远、顶得更开。",
        uses: ["用分量压垮比自己轻的目标", "落地震开挤在一起的一群敌人", "从高处砸向一个落点"],
        kind: "aim",
        range: 4,
        maxRange: 6.5,
        prepare: 9,
        active: 40,
        recover: 12,
        cooldown: 46,
        style: "drop",
        defaults: { anchor: false, ai: { maxChase: 8, crowd: true, minRatio: 0 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("heavyslam", "landRadius", pokemon), geometry: "area", style: "drop", color: 0xB8B8C0, label: "重磅冲撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["heavyslam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(1, Math.round(p("heavyslam", "prepare", context))),
                recover: Math.round(p("heavyslam", "recover", context)),
                cooldown: Math.round(p("heavyslam", "cooldown", context)),
                range: p("heavyslam", "leap", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_heavyslam:windup", heavyslamScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", anchor: !!(config && config.anchor) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            action.releaseTarget();
            const world = action.world();
            const raw = action.targetPosition();
            const plan = WorldGeometry.ground(world, raw, 6);
            const origin = action.origin();
            const radius = p("heavyslam", "landRadius", action);
            const hop = p("heavyslam", "hop", action);
            const air = Math.max(8, Math.round(p("heavyslam", "airTicks", action)));
            const scale = radius / 2.0;
            const flatDelta = WorldCombat.point(plan.x() - origin.x(), 0, plan.z() - origin.z());
            const distance = flatDelta.length();
            const heading = distance < 1e-6 ? aim(action) : flatDelta.unit();
            const rise = Math.max(2, Math.floor(air / 2));
            const fall = Math.max(2, air - rise);
            const climbStep = Math.max(0.15, hop / rise);
            const ascendStep = Math.max(0.04, Math.min(0.5, distance / Math.max(1, rise) * 0.5));
            const descendFall = Math.max(0.12, hop / fall);
            const descendStep = Math.max(0.25, Math.min(1.0, distance / Math.max(1, fall)));
            // 真实下落最多再走这些刻；走完仍悬空就安全收势，绝不在半空假造地面伤。
            const descendBudget = fall + Math.max(8, Math.ceil(6 / Math.max(0.05, descendFall)));
            const apexY = origin.y() + hop;
            const directionData = [heading.x(), heading.y(), heading.z()];
            let finished = false;

            WorldFeedback.emit(world, heavyslamScene, 1, origin, { moment: "leap", scale: scale, hop: hop, direction: directionData }, 26);
            // 计划落点：地面先亮一圈，告诉对手会砸哪；真正砸哪由身体落点决定。
            WorldFeedback.emit(world, heavyslamScene, 1, plan,
                { moment: "mark", scale: scale, radius: radius, air: air, plan: [plan.x(), plan.y(), plan.z()] }, Math.max(14, air + 10));
            sound(action, "minecraft:entity.iron_golem.attack");

            function end(current: CombatAction): void { if (finished) return; finished = true; done(current); }

            function crash(current: CombatAction, at: CombatPoint): void {
                if (finished) return;
                const scope = current.world();
                const ground = WorldGeometry.ground(scope, at, 4);
                const region = WorldGeometry.ring(ground, 0, radius, { below: 2.5, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(scope, region, function (target, facts) {
                    // 冲击不穿墙楼板：真实落点到目标身体要真的通视。
                    if (!scope.clear(ground, facts.position())) return;
                    const power = heavyslamValue(current, scope, target, config, "crush");
                    const didHit = hurt(current, target, "heavyslam", power,
                        { damage: damageSpec("heavyslam", "crush"), contact: true });
                    if (!didHit) return;
                    hits++;
                    if (scope.valid(target)) {
                        const away = facts.position().minus(ground);
                        const flat = WorldCombat.point(away.x(), 0, away.z());
                        const push = flat.length() < 0.05 ? heading : flat.unit();
                        // 每个受体按自己的体重比算推力，走原生抗击退/事件与真实碰撞。
                        if (scope.hitDisplace(target, push.scale(heavyslamValue(current, scope, target, config, "shove"))) > 0.05)
                            WorldFeedback.emit(scope, heavyslamScene, 1, facts.position(),
                                { moment: "shove", target: String(target.ref()) }, 20);
                    }
                    WorldFeedback.emit(scope, heavyslamScene, 1, facts.position(),
                        { moment: "impact", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.4, power / 90)) }, 28);
                });
                WorldFeedback.emit(scope, heavyslamScene, 1, ground,
                    { moment: "crash", scale: scale, bursts: 22 + hits * 10, intensity: hits > 0 ? 1.6 : 0.9, hits: hits }, 34);
                sound(current, "minecraft:item.mace.smash_ground_heavy");
                sound(current, "minecraft:block.anvil.land");
                WorldFeedback.text(scope, ground.plus(WorldCombat.point(0, 1.4, 0)),
                    hits > 0 ? heavyslamHitText : heavyslamMissText, hits > 0 ? [hits] : [], 28);
                end(current);
            }

            function descend(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { end(current); return; }
                const here = body.position();
                // 真实接地就冲击：砸在实际落点，而不是计划点。
                if (body.grounded()) { crash(current, here); return; }
                if (elapsed >= descendBudget) { end(current); return; }
                // 朝落点收拢；侧墙只挡横向，不当作落地。
                const toPlan = WorldCombat.point(plan.x() - here.x(), 0, plan.z() - here.z());
                if (toPlan.length() > 0.3) scope.displace(current.actor(), toPlan.unit().scale(Math.min(descendStep, toPlan.length())));
                // 向下位移被真实脚底/身体挡住才是接触，其余下落继续。
                heavyslamResetFall(scope, current.actor());
                const applied = scope.displace(current.actor(), WorldCombat.point(0, -descendFall, 0));
                if (applied < descendFall - 0.02) { crash(current, here); return; }
                current.after(1, function (next: CombatAction) { descend(next, elapsed + 1); });
            }

            function ascend(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { end(current); return; }
                if (elapsed >= rise) { descend(current, 0); return; }
                const here = body.position();
                // 水平朝计划落点收拢；侧墙只挡横向。
                const toPlan = WorldCombat.point(plan.x() - here.x(), 0, plan.z() - here.z());
                if (toPlan.length() > 0.3) scope.displace(current.actor(), toPlan.unit().scale(Math.min(ascendStep, toPlan.length())));
                // 完整身体抬不动就是头顶被挡：进入真实下落，跳弧由此缩短。
                const up = Math.min(climbStep, Math.max(0, apexY - here.y()));
                if (up > 0.02) {
                    heavyslamResetFall(scope, current.actor());
                    if (scope.displace(current.actor(), WorldCombat.point(0, up, 0)) < up - 0.02) { descend(current, 0); return; }
                }
                current.after(1, function (next: CombatAction) { ascend(next, elapsed + 1); });
            }
            ascend(action, 0);
        }
    });
}
