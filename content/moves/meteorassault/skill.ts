/** Commit one narrow extending thrust, then pay the original exhaustion cost. */
namespace PokemonSkills {
    const meteorassaultScene = "world_combat:move_meteorassault";
    const meteorassaultDazeEffect = "world_combat:meteorassault_daze";
    const meteorassaultExhaustMark = "world_combat:meteorassault_exhaust_mark";
    const meteorassaultDazeText = "world_combat.move.meteorassault.text.daze";
    const meteorassaultSwingText = "world_combat.move.meteorassault.text.swing";
    /** 力竭托管的缓冲寿命：覆盖整段伸枪动作与随后的结算轮询。 */
    const meteorassaultMarkTicks = 400;

    define({
        freeMovement: true,
        id: "meteorassault",
        name: "Meteor Assault",
        description: "站稳前探，把长兵沿锁定直线逐段伸出，一枪贯过同线敌人；每人只结算一次合并主伤，墙挡住兵端，第一次伸枪后就计入这次要付的力竭。",
        uses: ["锁定方向伸出长兵", "贯过同一直线上的对手", "以力竭换取一次重击"],
        kind: "aim",
        range: 3.6,
        maxRange: 5,
        prepare: 8,
        active: 80,
        recover: 10,
        cooldown: 90,
        style: "swing",
        stationary: true,
        defaults: { swings: 3, ai: { minHealth: 0.4, preferMultiple: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("meteorassault", "reach", pokemon), geometry: "line", style: "swing", color: 0xA8D060, label: "流星突击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["meteorassault"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var exhaust = Math.round(p("meteorassault", "exhaust", context));
            return {
                prepare: Math.round(p("meteorassault", "charge", context)),
                recover: 10,
                cooldown: exhaust + 14,
                range: p("meteorassault", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            // 准备期就画出锁定的枪线与真实半宽，玩家确认这条直线会往哪伸、伸多粗。
            const heading = aim(action), from = action.origin();
            const reach = p("meteorassault", "reach", action);
            const width = Math.max(.15, Math.min(.5, p("meteorassault", "arc", action)));
            const to = from.plus(heading.scale(reach));
            action.present("world_combat:move_meteorassault:windup", meteorassaultScene, 1, from,
                JSON.stringify({ moment: "windup", path: [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]],
                    direction: [heading.x(), heading.y(), heading.z()], width: width, reach: reach }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const swings = Math.max(2, Math.min(5, Math.round(p("meteorassault", "swings", action))));
            const interval = Math.max(4, Math.round(p("meteorassault", "interval", action)));
            const arc = p("meteorassault", "arc", action);
            const reach = p("meteorassault", "reach", action);
            const smash = p("meteorassault", "smash", action);
            const exhaustTicks = Math.max(1, Math.round(p("meteorassault", "exhaust", action)));
            const scale = reach / 3.0;
            const heading = aim(action);
            let armed = false, mark = 0;

            sound(action, "cobblemon:move.closecombat.actor_1");
            // 短促前探把身体送到握持位，再取真实枪根；起点是前探后身体握持处，不是旧的身体中心。
            world.displace(actor, WorldGeometry.flatUnit(heading).scale(.3));
            const tipStart = action.origin();
            const struck: { [ref: string]: boolean } = {};
            const width = Math.max(.15, Math.min(.5, arc)), totalPower = smash * swings;
            let tip = tipStart, budget = 0;
            const scenes = WorldFeedback.actionScenes(meteorassaultScene);

            // 第一次伸枪就在独立 actor 载体上登记这次应付的力竭；取消、打断或自然收枪都由它统一结清。
            function arm(current: CombatAction): void {
                if (armed) return; armed = true;
                mark = current.world().effect(meteorassaultExhaustMark, actor,
                    JSON.stringify({ instance: current.id(), scale: scale, seconds: Math.round(exhaustTicks / 20 * 10) / 10,
                        count: Math.round(8 + (exhaustTicks / 20) * 5), ticks: exhaustTicks }), meteorassaultMarkTicks);
            }

            // 兵端是半宽 width 的线体：中心线与两侧偏移都要挡真实薄墙，判定与表现共用同一端点。
            function spearEnd(scope: CombatWorld, from: CombatPoint, to: CombatPoint): { end: CombatPoint; blocked: boolean } {
                const flat = WorldGeometry.flatUnit(heading), side = WorldCombat.point(-flat.z(), 0, flat.x()).scale(width);
                const starts = [from, from.plus(side), from.minus(side)];
                let best: CombatPoint | null = null;
                for (let i = 0; i < starts.length; i++) {
                    const offset = i === 0 ? WorldCombat.point(0, 0, 0) : (i === 1 ? side : side.scale(-1));
                    const hit = WorldGeometry.blockHit(scope, starts[i], to.plus(offset));
                    if (hit !== null && (best === null || hit.position().minus(from).length() < best.minus(from).length())) best = hit.position();
                }
                return { end: best === null ? to : best, blocked: best !== null };
            }

            function retract(current: CombatAction): void {
                // 正常收枪：立刻让力竭载体结清，不留延迟空档。
                if (mark > 0) current.world().operation(mark, "world_combat:fire", "{}");
                scenes.finish(current, done);
            }

            function thrust(current: CombatAction): void {
                const scope = current.world(), next = tipStart.plus(heading.scale(Math.min(reach, budget + reach / swings)));
                const clipped = spearEnd(scope, tip, next), end = clipped.end;
                arm(current);
                let hits = 0;
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySegment(tip, end, width), function (enemy, facts) {
                    const ref = String(enemy.ref()); if (scope.friendly(enemy) || struck[ref]) return;
                    struck[ref] = true;
                    if (hurt(current, enemy, "meteorassault", totalPower, { damage: damageSpec("meteorassault", "smash"), contact: true })) {
                        hits++;
                        WorldFeedback.emit(scope, meteorassaultScene, 1, facts.position(), { moment: "contact", target: ref, intensity: Math.min(2.4,totalPower/120) }, 18);
                    }
                });
                tip = end; budget += reach / swings;
                scenes.show(current, "spear", end, { moment: "thrust", path: [[tipStart.x(),tipStart.y(),tipStart.z()],[tip.x(),tip.y(),tip.z()]], point: [tip.x(),tip.y(),tip.z()], count: swings, width: width });
                if (clipped.blocked || budget >= reach - .001) {
                    current.after(Math.max(2,Math.round(interval/2)), retract); return;
                }
                current.after(interval, thrust);
            }

            const target = action.target();
            if (target !== null && world.valid(target)) {
                const targetBody = world.observe(target);
                if (targetBody !== null) action.face(targetBody.position(), 20, 20);
            }
            action.releaseTarget();
            thrust(action);
        }
    });

    // 晃晕的共享身份门禁：带着 mustrecharge 的人在窗口内不能开始新动作；伤害阶段不受影响。
    CombatStatus.actions.define({ id: "world_combat:meteorassault/exhaust-gate", applies: function (context) { return context.phase !== "damage"; }, apply: function (context) {
        if (CombatStatus.has(context.world, context.actor, "mustrecharge")) context.blocked.exhausted = true;
    } });

    /** 力竭结清：挂上原时长的晃晕与定身，并把这一拍的落点表现绑在真实身体上。 */
    function meteorassaultPay(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor)) { effect.end(); return; }
        MobEffects.apply(world, actor, meteorassaultDazeEffect, state.ticks, 0);
        WorldEffects.apply(world, actor, "rooted", {}, state.ticks);
        world.stopMovement(actor);
        const body = world.observe(actor);
        if (body !== null) {
            WorldFeedback.emit(world, meteorassaultScene, 1, body.position(),
                { moment: "daze", scale: state.scale, seconds: state.seconds, count: state.count }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), meteorassaultDazeText, [state.seconds], 30);
            world.sound("minecraft:entity.ravager.stunned", body.position(), 16, "{}");
        }
        effect.end();
    }

    // 力竭载体：actor 寿命，登记第一次伸枪的动作实例；动作一结束（自然或取消）就结清原力竭时长。
    WorldCombat.effect(meteorassaultExhaustMark, 1, meteorassaultMarkTicks, "actor", function (json) {
        const value = JSON.parse(json);
        if (typeof value.instance !== "number" || !isFinite(value.instance) || value.instance <= 0
            || typeof value.ticks !== "number" || !isFinite(value.ticks) || value.ticks < 1
            || typeof value.seconds !== "number" || !isFinite(value.seconds)
            || typeof value.scale !== "number" || !isFinite(value.scale) || value.scale <= 0
            || typeof value.count !== "number" || !isFinite(value.count) || value.count < 1)
            throw new Error("Invalid meteorassault exhaustion mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(meteorassaultExhaustMark, "start", function (effect) { effect.schedule("watch", "watch", 1, "{}"); });
    WorldCombat.effectHandler(meteorassaultExhaustMark, "watch", function (effect) {
        const world = effect.world(), actor = effect.target();
        if (!world.valid(actor)) { effect.end(); return; }
        const state = JSON.parse(effect.state()), active = world.actions();
        let running = false;
        for (let i = 0; i < active.length; i++) if (active[i].instance() === state.instance) running = true;
        if (running && effect.remaining() > 4) { effect.schedule("watch", "watch", 1, "{}"); return; }
        meteorassaultPay(effect);
    });
    WorldCombat.effectHandler(meteorassaultExhaustMark, "operation:world_combat:fire", meteorassaultPay);
    WorldCombat.effectHandler(meteorassaultExhaustMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    WorldCombat.on("world_combat:move_meteorassault/exhaust-halt", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== meteorassaultDazeEffect) return;
        event.world().stopMovement(event.actor());
    });

    // 晃晕期间把导航速度归零：让「无法移动」对所有活体（含宝可梦的脚本导航）成立。
    WorldCombat.on("world_combat:move_meteorassault/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), meteorassaultDazeEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    // 晃晕期间维持头顶转圈的晕眩：少而稳，放在头顶上方，不遮挡目标。
    WorldCombat.on("world_combat:move_meteorassault/exhaust-linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== meteorassaultDazeEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_meteorassault/recharge/" + String(actor.ref()), meteorassaultScene, 1,
            body.position(), { moment: "recharge", target: String(actor.ref()) }, 40);
    });
}
