/** 鬼面以一个可见状态承载短时减速，命中时的后缩提示生效。 */
namespace PokemonSkills {
    function scaryfaceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: scaryfaceId,
        cooldownParameter: "recharge",
        name: "鬼面",
        description: "吓退范围内的一个对手，让它短时间步伐迟滞。被吓住的状态结束时，速度一起恢复。",
        uses: ["拦下一个冲得最快、最麻烦的对手", "在被近身前先把对方拖慢", "为队友争取拉开距离的时间"],
        kind: "enemy",
        range: 6,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 150,
        style: "terror",
        defaults: {},
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[scaryfaceId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(scaryfaceId, "tempo", context)),
                recover: p(scaryfaceId, "recover", context),
                cooldown: Math.round(p(scaryfaceId, "recharge", context)),
                active: 1,
                range: p(scaryfaceId, "gazeRange", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            return MobEffects.read(world, target, scaryfaceEffect) ? "already-active" : "";
        },
        windup: function (action, config, prepare) {
            action.present("scaryface-windup", scaryfaceScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (_config, pokemon) { return { radius: p(scaryfaceId, "gazeRange", pokemon), geometry: "line", style: "terror", color: 0x5B2A86, label: "鬼面" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(3, Math.round(p(scaryfaceId, "drop", action))));
            const fear = Math.max(60, Math.round(p(scaryfaceId, "fearTicks", action)));
            const recoil = Math.max(0, p(scaryfaceId, "recoil", action));
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, scaryfaceScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            if (at === null) { done(action); return; }
            if (at.position().minus(origin).length() > action.range() || MobEffects.read(world, target, scaryfaceEffect)) { done(action); return; }
            // 真实目视通路：提交后目标若已挪到掩体后，目光停在第一处阻挡上，恐惧不落地。
            if (!world.clear(origin, at.position())) {
                const impact = action.trace(origin, at.position(), 0.25, false);
                const stop = impact.position();
                WorldFeedback.emit(world, scaryfaceScene, 1, stop,
                    { moment: "blocked", target: String(target.ref()), path: ["source", [stop.x(), stop.y(), stop.z()]] }, 20);
                WorldFeedback.text(world, scaryfaceAbove(at.position()), "world_combat.move.scaryface.text.blocked", [], 28);
                done(action); return;
            }
            const carrier = MobEffects.apply(world, target, scaryfaceEffect, fear, 0);
            if (!carrier) { done(action); return; }
            const before = NativeEffects.effectiveStage(world, target, "spe");
            const window = NativeEffects.boostWindow(world, target, { spe: -drop }, fear, "world_combat:move/scaryface", carrier);
            const lost = before - NativeEffects.effectiveStage(world, target, "spe");
            if (!window || lost <= 0) {
                // 减级窗口没有成立：收回状态载体，恐惧不播，也不推动目标。
                if (window) NativeEffects.windowClose(world, window);
                else world.removeMobEffect(target, scaryfaceEffect, carrier.key());
                done(action); return;
            }
            // 状态与减级窗口都成立，此时才播恐惧。
            sound(action, "minecraft:entity.enderman.scream");
            const away = at.position().minus(origin);
            if (recoil > 0 && away.length() > 0.01) world.displace(target, away.unit().scale(recoil));
            WorldFeedback.emit(world, scaryfaceScene, 1, at.position(),
                { moment: "gaze", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    drop: lost, shards: 12 + lost * 10 }, 26);
            WorldFeedback.text(world, scaryfaceAbove(at.position()), "world_combat.move.scaryface.text.gaze", [lost], 34);
            done(action);
        }
    });

    // 恐惧存续期间，目标头顶持续冒出被吓出的暗紫余悸。
    WorldCombat.on("world_combat:move_scaryface/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== scaryfaceEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "scaryface:" + String(actor.ref()), scaryfaceScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
