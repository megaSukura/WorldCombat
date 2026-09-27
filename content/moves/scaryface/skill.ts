/** 鬼面以一个可见状态承载短时减速；状态与减速窗口同生共死，命中时才在真实身前亮出鬼面。 */
namespace PokemonSkills {
    const scaryfaceFaceScene = "world_combat:move_scaryface_face";
    const scaryfaceLinger = "world_combat:move_scaryface/linger";
    const scaryfaceContribution = "world_combat:move/scaryface";

    function scaryfaceAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 鬼面在施法者真实身前的位置与朝向：脸前一段距离，面形平面由真实 forward/right/up 撑起，判定与表现共用。 */
    function scaryfaceFaceData(body: CombatObservation, gaze: CombatPoint): any {
        const frame = WorldGeometry.basis(gaze);
        const forward = frame.forward, right = frame.right, up = frame.up;
        const head = body.position().plus(WorldCombat.point(0, body.height() * 0.12, 0));
        const centre = head.plus(forward.scale(body.width() * 0.5 + 0.35));
        return { moment: "face", center: [centre.x(), centre.y(), centre.z()],
            right: [right.x(), right.y(), right.z()], up: [up.x(), up.y(), up.z()],
            width: body.width() * 0.55 + 0.12, height: body.height() * 0.4 + 0.18, drop: 0 };
    }

    define({
        id: scaryfaceId,
        cooldownParameter: "recharge",
        name: "鬼面",
        description: "在真实身前亮出一张鬼面，吓退范围内一个看得见的对手，让它短时间步伐迟滞。命中那刻把它朝背离你的方向推开一点；被吓住的状态与被压低的等级绑在同一条减速窗口上，状态结束或被清除时速度与鬼面余悸一起消失。",
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
            // 起手阶段鬼面在真实身前成型（提交前只观察，随动作清理）。
            const self = action.sense().observe(action.actor());
            if (self !== null) {
                const face = scaryfaceFaceData(self, action.targetPosition().minus(action.origin()));
                action.present("scaryface-face", scaryfaceFaceScene, 1,
                    WorldCombat.point(face.center[0], face.center[1], face.center[2]), JSON.stringify(face));
            }
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
            const window = NativeEffects.boostWindow(world, target, { spe: -drop }, fear, scaryfaceContribution, carrier);
            const lost = before - NativeEffects.effectiveStage(world, target, "spe");
            // 没有真正降速就不留状态：窗口没成立、或目标已到速度下限（lost<=0）时，撤窗口也撤掉状态载体，
            // 不留一个没有收益的「被吓住」。
            if (!window || lost <= 0) {
                if (window) NativeEffects.windowClose(world, window);
                world.removeMobEffect(target, scaryfaceEffect, carrier.key());
                done(action); return;
            }
            // 状态与减级窗口都成立，此时才播恐惧。
            sound(action, "minecraft:entity.enderman.scream");
            const away = at.position().minus(origin);
            if (recoil > 0 && away.length() > 0.01) world.hitDisplace(target, away.unit().scale(recoil));
            if (selfBody !== null) {
                const face = scaryfaceFaceData(selfBody, at.position().minus(origin));
                face.drop = lost;
                WorldFeedback.emit(world, scaryfaceFaceScene, 1,
                    WorldCombat.point(face.center[0], face.center[1], face.center[2]), face, 24);
            }
            WorldFeedback.emit(world, scaryfaceScene, 1, at.position(),
                { moment: "gaze", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    drop: lost, shards: 12 + lost * 10 }, 26);
            WorldFeedback.text(world, scaryfaceAbove(at.position()), "world_combat.move.scaryface.text.gaze", [lost], 34);
            // 受惊后的持续余悸绑在真实减速窗口上：窗口走完、被清除或施法者离开时一起收走，不留视觉残留。
            WorldFeedback.onEffect(world, window, scaryfaceLinger, scaryfaceScene, 1, at.position(),
                { moment: "linger", target: String(target.ref()) });
            done(action);
        }
    });
}
