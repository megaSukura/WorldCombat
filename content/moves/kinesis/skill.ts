/**
 * 折弯汤匙 / Kinesis — 执行组织。
 *
 * 核心念头：当场把一把汤匙掰弯，只弯给一个看得见它的目标看。汤匙不需要飞过去，靠的是「你看得见我」，
 *   所以射程较远，却也是会明确落空的一招——墙后、柱子后、走出视线，这场戏就白演。
 *
 * 出手：短起手（windup 在手里聚起蓝紫念力）后提交；慢掰与快掰在深度与出手速度之间取舍。
 * 折弯：提交后在身前用念力点出一把短直金属汤匙轮廓，沿 spoonTicks 逐步掰弯（服务端算出同一组顶点，
 *       表现用自定义线段场景沿 data.path 连续画出）。整个过程中每步都要求目标仍存在、在射程内且通视；
 *       视线按施法者与目标的真实眼部计算，中途被墙挡住或目标离场，这场戏就中断落空，不会隔墙成功。
 * 命中：弯到最后一刻且仍通视，才给目标挂共享的 world_combat:kinesis_beguiled（身份 world_combat:status/beguiled），
 *       把命中等级下降以 boostWindow 绑在这份载体上（载体在就在、载体走就复原），并闪一道连向实际目标的目光线。
 *       15% 的物理直接攻击抑制由共享 incoming 规则对所有实体同语义生效，不再只改原版 attack_damage 属性。
 * 反制：掩体与距离；单目标，不会波及旁人。
 */
namespace PokemonSkills {
    /** 实际眼部附近：优先读原生 getEyeY，取不到才退回身高 0.85 的近似高度，不再用体心 +0.7 身高的头顶外点。 */
    function kinesisEye(world: CombatWorld, actor: CombatActor, body: CombatObservation): CombatPoint {
        const pos = body.position();
        const native = world.nativeEntity(actor);
        if (native !== null) {
            try {
                const y = Number(native.getEyeY());
                if (isFinite(y)) return WorldCombat.point(pos.x(), y, pos.z());
            } catch (error) { }
        }
        return WorldCombat.point(pos.x(), pos.y() + body.height() * 0.85, pos.z());
    }

    function kinesisAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.05, 0)); }

    /** 汤匙轮廓：匙柄与匙面少量固定点，先直后弯；顶点是世界坐标，服务端判定与客户端表现读同一份。 */
    function kinesisSpoonPath(grip: CombatPoint, toward: CombatPoint, bend: number, length: number): number[][] {
        const flat = WorldCombat.point(toward.x() - grip.x(), 0, toward.z() - grip.z());
        const forward = flat.length() < 0.001 ? WorldCombat.point(0, 0, 1) : flat.unit();
        const up = WorldCombat.point(0, 1, 0);
        const neck = length * 0.52;
        const angle = Math.max(0, Math.min(1, bend)) * 0.96;
        function place(along: number, lift: number): number[] {
            if (along <= neck) {
                const p = grip.plus(forward.scale(along)).plus(up.scale(lift));
                return [p.x(), p.y(), p.z()];
            }
            const d = along - neck, cosine = Math.cos(angle), sine = Math.sin(angle);
            const p = grip.plus(forward.scale(neck)).plus(forward.scale(d * cosine)).plus(up.scale(d * sine + lift));
            return [p.x(), p.y(), p.z()];
        }
        const points: number[][] = [];
        for (let i = 0; i <= 4; i++) points.push(place(neck * i / 4, 0));
        const bowlAlong = neck + length * 0.24, rx = length * 0.19, ry = length * 0.13, segments = 10;
        for (let i = 0; i <= segments; i++) {
            const t = Math.PI * 2 * i / segments;
            points.push(place(bowlAlong + rx * Math.cos(t), ry * Math.sin(t)));
        }
        return points;
    }

    // 15% 物理直接攻击抑制：共享 incoming 规则，按共享身份作用于任何实体的物理直攻，不被原版 attack_damage 属性局限。
    NativeEffects.incomingRules.define({ id: "world_combat:move/kinesis/direct-suppression", apply: function (hit: NativeEffects.Hit) {
        if (String(hit.source.key()) === String(hit.target.key())) return;
        if (!CombatStatus.has(hit.world, hit.source, kinesisSpot)) return;
        if (!DamageSemantics.directOffense(hit.data)) return;
        if (DamageSemantics.read(hit.data).category !== "physical") return;
        hit.data.amount = Math.max(0, hit.data.amount * 0.85);
    } });

    define({
        id: kinesisId,
        cooldownParameter: "recharge",
        name: "折弯汤匙",
        description: "当面用念力点出一把汤匙并逐步掰弯，只引开一个看得见它的对手的注意：命中下降、物理直接攻击变弱。射程较远，但整个折弯过程都必须与目标通视，中途被掩体挡住或目标离开就落空。",
        uses: ["远距离点名一个最难缠的对手", "在掩体对峙时削弱对方的远程", "给决斗或撤退创造单点优势"],
        kind: "enemy",
        range: 7,
        maxRange: 10,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 180,
        style: "bend",
        defaults: { bend: "twist" },
        fields: [
            choice("bend", "手法", ["twist", "snap"], ["慢掰", "快掰"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[kinesisId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const twist = !(config && config.bend === "snap");
            return {
                prepare: Math.round(p(kinesisId, "tempo", context)) + (twist ? 6 : 0),
                recover: p(kinesisId, "recover", context),
                cooldown: Math.round(p(kinesisId, "recharge", context) * (twist ? 1.2 : 0.95)),
                active: 1,
                range: p(kinesisId, "gazeRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("kinesis-windup", kinesisScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", bend: config && config.bend === "snap" ? "snap" : "twist",
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[kinesisId], detail: { values: config } };
            return { radius: p(kinesisId, "gazeRange", context), geometry: "line", style: "bend",
                color: 0x8FA8E0, label: config && config.bend === "snap" ? "折弯汤匙·快掰" : "折弯汤匙·慢掰" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const twist = !(config && config.bend === "snap");
            const target = action.target();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : kinesisEye(world, self, body);
            const stage = Math.max(1, Math.min(3, Math.round(p(kinesisId, "blindStage", action)) + (twist ? 1 : 0)));
            const duration = Math.max(60, Math.round(p(kinesisId, "duration", action) * (twist ? 1.4 : 1)));
            const spoonTicks = Math.max(10, Math.round(p(kinesisId, "spoonTicks", action)));
            const swirl = Math.max(10, Math.round(p(kinesisId, "swirl", action)));
            const length = body === null ? 0.8 : Math.max(0.55, Math.min(1.3, body.height() * 0.5));
            const scale = Math.max(0.6, Math.min(1.6, length / 0.8));
            const scenes = WorldFeedback.actionScenes(kinesisScene);
            const spoons = WorldFeedback.actionScenes(kinesisSpoonScene);
            sound(action, "cobblemon:move.kinesis.actor");
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, kinesisScene, 1, action.targetPosition(), { moment: "fizzle" }, 18);
                done(action);
                return;
            }
            const first = world.observe(target);
            const firstPoint = first === null ? action.targetPosition() : kinesisEye(world, target, first);
            const targetRef = String(target.ref());
            if (WorldGeometry.blockHit(world, origin, firstPoint) !== null) {
                WorldFeedback.emit(world, kinesisScene, 1, firstPoint, { moment: "fizzle", target: targetRef }, 22);
                WorldFeedback.text(world, kinesisAbove(firstPoint), "world_combat.move.kinesis.text.blocked", [], 30);
                done(action);
                return;
            }
            let completed = false, elapsed = 0;
            function finishAbort(current: CombatAction, point: CombatPoint): void {
                if (completed) return;
                completed = true;
                spoons.stop(current, "spoon");
                WorldFeedback.emit(current.world(), kinesisScene, 1, point, { moment: "fizzle", target: targetRef }, 20);
                WorldFeedback.text(current.world(), kinesisAbove(point), "world_combat.move.kinesis.text.blocked", [], 28);
                scenes.finish(current, done);
            }
            function bend(current: CombatAction): void {
                if (completed) return;
                const scope = current.world(), held = current.target();
                const obs = scope.observe(self);
                if (obs === null || held === null || !scope.valid(held) || scope.friendly(held)) { finishAbort(current, current.targetPosition()); return; }
                const eye = kinesisEye(scope, self, obs);
                const at = scope.observe(held);
                if (at === null) { finishAbort(current, current.targetPosition()); return; }
                const point = kinesisEye(scope, held, at);
                // 持续通视与射程：任何一步被墙挡住、目标离场或走出凝注距离，都中断这次失神施加。
                if (point.minus(eye).length() > current.range() || WorldGeometry.blockHit(scope, eye, point) !== null) { finishAbort(current, point); return; }
                elapsed += 2;
                const progress = Math.min(1, elapsed / spoonTicks);
                const grip = eye.plus(WorldGeometry.flatUnit(point.minus(eye), current.direction()).scale(0.35));
                spoons.show(current, "spoon", eye, { moment: "spoon", path: kinesisSpoonPath(grip, point, progress, length),
                    swirl: swirl, glow: 0.15 + progress * 0.5, scale: scale });
                if (progress < 1) { current.after(2, bend); return; }
                // 折弯走完且仍通视，才施加失神；状态被拒绝时不当作已命中。
                const previous = MobEffects.read(scope, held, kinesisEffect);
                const carrier = MobEffects.apply(scope, held, kinesisEffect, duration, 0);
                if (carrier === null) { finishAbort(current, point); return; }
                // 命中等级下降绑在这份载体上，并记录这一记真正削掉的级数。
                const before = NativeEffects.effectiveStage(scope, held, "accuracy");
                NativeEffects.boostWindow(scope, held, { accuracy: -stage }, carrier.duration(), "world_combat:move/kinesis", carrier, previous);
                const dropped = Math.max(0, before - NativeEffects.effectiveStage(scope, held, "accuracy"));
                completed = true;
                spoons.stop(current, "spoon");
                WorldFeedback.emit(scope, kinesisScene, 1, eye, { moment: "gaze",
                    path: ["source", String(held.ref())], swirl: swirl }, 20);
                WorldFeedback.emit(scope, kinesisScene, 1, point, { moment: "beguile", target: String(held.ref()),
                    swirl: swirl, scale: 1 + dropped * 0.15 }, 40);
                WorldFeedback.text(scope, kinesisAbove(point), "world_combat.move.kinesis.text.beguile", [dropped], 38);
                sound(current, "cobblemon:move.kinesis.target");
                scenes.finish(current, done);
            }
            spoons.show(action, "spoon", origin, { moment: "spoon", path: kinesisSpoonPath(origin, firstPoint, 0, length),
                swirl: swirl, glow: 0.15, scale: scale });
            action.after(2, bend);
        }
    });

    // 失神存续期间，目标头顶持续转着没散去的念力；随载体生命周期存续，清除即结束。
    WorldCombat.on("world_combat:move_kinesis/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== kinesisEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 5 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "kinesis:" + String(actor.ref()), kinesisScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
