/** A short single-body whisper crosses cover. Point input resolves near one fixed remembered position; the owned Sp. Atk window ends with its carrier. */
namespace PokemonSkills {
    function confideAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: confideId,
        cooldownParameter: "recharge",
        name: "密语",
        description: "凑到对手耳边说个秘密，让它失去集中力、降低特攻；密语是声音，能绕过掩体、不需要视线，但只在听得见的距离内生效。这份下降只持续一段失神窗口，窗口结束或被驱散就精确复原；说完就能自由行动。",
        uses: ["隔着掩体先手削弱法系威胁", "削弱高特攻敌人的下一轮输出", "说完立刻换回自己的进攻"],
        kind: "aim",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 140,
        style: "whisper",
        defaults: {},
        fields: [],
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (action.targetPosition().minus(action.origin()).length() > action.range()) return "out-of-range";
            if (target !== null && (!world.valid(target) || world.friendly(target))) return "invalid-target";
            return "";
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[confideId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(confideId, "tempo", context)),
                recover: p(confideId, "recover", context),
                cooldown: Math.round(p(confideId, "recharge", context)),
                active: 1,
                range: p(confideId, "whisperRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("confide-windup", confideScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext | undefined = pokemon ? { pokemon, skill: skills[confideId], detail: { values: config } } : undefined;
            return { radius: context ? p(confideId, "whisperRange", context) : 6, geometry: "line", style: "whisper", color: 0x8A7BD8,
                label: "密语" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(2, Math.round(p(confideId, "drop", action))));
            const focus = Math.max(60, Math.round(p(confideId, "focusTicks", action)));
            const whispers = Math.max(6, Math.round(p(confideId, "whispers", action)));
            sound(action, "minecraft:entity.villager.ambient");
            let target = action.target();
            if (target === null) {
                // 记忆输入是冻结的世界点。只在该小点查真实身体，不拿旧 ref 跟踪隐藏目标。
                const point = action.targetPosition(), bodies: { actor: CombatActor; distance: number }[] = [];
                WorldGeometry.selectBodies(world, WorldGeometry.bodySphere(point, .6), (other, facts) => {
                    if (facts.friendly() || String(other.ref()) === String(self.ref())) return;
                    bodies.push({ actor: other, distance: world.closestPoint(other, point).minus(point).length() });
                });
                bodies.sort((a, b) => a.distance - b.distance);
                target = bodies.length ? bodies[0].actor : null;
            }
            if (target === null || !world.valid(target) || world.friendly(target) || String(target.ref()) === String(self.ref())) {
                WorldFeedback.emit(world, confideScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action); return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (at === null || point.minus(origin).length() > action.range()) {
                WorldFeedback.emit(world, confideScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action); return;
            }
            // 声音不需要通视：掩体挡不住密语，这正是它不用瞄准的价值。
            const previous = MobEffects.read(world, target, confideEffect);
            const carrier = MobEffects.apply(world, target, confideEffect, focus, 0);
            if (carrier === null) {
                WorldFeedback.emit(world, confideScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 18);
                done(action); return;
            }
            // 下降绑在失神载体上：窗口走完、被驱散或被再次施加时，这份贡献随载体一起收回。
            const before = NativeEffects.effectiveStage(world, target, "spa");
            const window = NativeEffects.boostWindow(world, target, { spa: -drop }, focus, "world_combat:move/confide", carrier, previous);
            const lost = Math.max(0, before - NativeEffects.effectiveStage(world, target, "spa"));
            if (!window || lost <= 0) {
                if (window) NativeEffects.windowClose(world, window);
                world.removeMobEffect(target, confideEffect, carrier.key());
                WorldFeedback.emit(world, confideScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 18);
                done(action); return;
            }
            const body = world.observe(target);
            const at2 = body === null ? point : body.position();
            const ref = String(target.ref()), selfRef = String(self.ref());
            // 声音可绕墙：能通视就画一条短低语线，被挡住就只留两端，不画穿墙实体飞弹。
            const data: any = { moment: "leak", target: ref, drop: lost, whispers: whispers, through: world.clear(origin, point) ? 0 : 1 };
            if (!data.through) data.path = [selfRef, ref];
            WorldFeedback.emit(world, confideScene, 1, at2, data, 20);
            WorldFeedback.text(world, confideAbove(at2), "world_combat.move.confide.text.whisper", [lost], 40);
            // 失神期间只留耳侧微弱符号，绑在真实窗口上，窗口一收就一起消失。
            WorldFeedback.onEffect(world, window, "confide:linger:" + ref, confideScene, 1, at2,
                { moment: "linger", target: ref });
            done(action);
        }
    });
}
