/** Commit one narrow extending thrust, then pay the original exhaustion cost. */
namespace PokemonSkills {
    const meteorassaultScene = "world_combat:move_meteorassault";
    const meteorassaultDazeEffect = "world_combat:meteorassault_daze";
    const meteorassaultDazeText = "world_combat.move.meteorassault.text.daze";
    const meteorassaultSwingText = "world_combat.move.meteorassault.text.swing";

    define({
        freeMovement: true,
        id: "meteorassault",
        name: "Meteor Assault",
        description: "站稳前探，把长兵沿锁定直线逐段伸出，一枪贯过同线敌人；每人只结算一次合并主伤，墙挡住兵端，收枪后力竭。",
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
            return { radius: p("meteorassault", "reach", pokemon), geometry: "cone", style: "swing", label: "流星突击" };
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
            action.present("world_combat:move_meteorassault:windup", meteorassaultScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
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
            let index = 0;

            sound(action, "cobblemon:move.closecombat.actor_1");

            function daze(current: CombatAction): void {
                const scope = current.world();
                MobEffects.apply(scope, current.actor(), meteorassaultDazeEffect, exhaustTicks, 0);
                WorldEffects.apply(scope, current.actor(), "rooted", {}, exhaustTicks);
                scope.stopMovement(current.actor());
                const body = scope.observe(current.actor());
                if (body !== null) {
                    WorldFeedback.emit(scope, meteorassaultScene, 1, body.position(), { moment: "daze", scale: scale,
                        seconds: exhaustTicks / 20, count: Math.round(8 + (exhaustTicks / 20) * 5) }, 30);
                    WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.5, 0)), meteorassaultDazeText,
                        [Math.round(exhaustTicks / 20 * 10) / 10], 30);
                }
                sound(current, "minecraft:entity.ravager.stunned");
            }

            const heading = aim(action), tipStart = action.origin(), struck: { [ref: string]: boolean } = {};
            const width = Math.max(.15, Math.min(.5, arc)), totalPower = smash * swings;
            let tip = tipStart, budget = 0;
            const scenes = WorldFeedback.actionScenes(meteorassaultScene);
            // A short native body lean commits position without tracking the target through the thrust.
            world.displace(actor, WorldGeometry.flatUnit(heading).scale(.3));
            function thrust(current: CombatAction): void {
                const scope = current.world(), next = tipStart.plus(heading.scale(Math.min(reach, budget + reach / swings)));
                const block = scope.clipBlocks(tip, next), end = block && block.blocked() ? block.position() : next;
                if (!block) { daze(current); scenes.finish(current, done); return; }
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
                scenes.show(current, "spear", tipStart, { moment: "thrust", path: [[tipStart.x(),tipStart.y(),tipStart.z()],[tip.x(),tip.y(),tip.z()]], count: swings, width: width });
                if (block.blocked() || budget >= reach - .001) {
                    current.after(Math.max(2,Math.round(interval/2)), function (last) { daze(last); scenes.finish(last,done); }); return;
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
