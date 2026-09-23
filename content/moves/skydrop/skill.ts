/**
 * 自由落体 / skydrop 的出手方式。
 *
 * 核心念头：贴身抓住一个对手，把它拎到空中停一段——这几刻它完全动不了、也出不了手——再连本带利
 * 摔到地面上。原生的两回合在这里是一段连续动作：**抓 → 提上天 → 滞空 → 摔下**。对手太重就抓不起来，
 * 这一条在提交前判掉，不花 PP。
 *
 * 三幕（提交后由本招自己驱动，`run` 自管节奏）：
 *   起（提交前，可打断）：蹲身预告，不花代价；对手体重超过 `liftCap` 直接拒绝。
 *   提/滞（提交后）：施法者每刻朝保持点上升；被抓的目标每刻被放到施法者头顶（走不了也掉不下去），
 *       带上真实的 `world_combat:skydrop_carried`（身份 world_combat:status/skydrop），门禁挡住它的
 *       起手、打断它正在进行的动作，导航速度归零；两者每刻清一次坠落距离，避免搬运途中被摔伤。
 *   摔（drop → slam）：松开保持、把目标向下摔；落地按 `slam` × 实际提起高度系数结算接触伤害，
 *       施法者随后落回地面，落地前同样清坠落距离。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（teleport／displace）、
 * 状态（真实 MC MobEffect）都走同一条路；只有“目标体重”的读取是宝可梦层（非宝可梦目标按 0 处理）。
 */
namespace PokemonSkills {
    const skydropScene = "world_combat:move_skydrop";
    const skydropCarried = "world_combat:skydrop_carried";
    const skydropGrabText = "world_combat.move.skydrop.text.grab";
    const skydropSlamText = "world_combat.move.skydrop.text.slam";

    const skydropCarry = "world_combat:skydrop_carry";
    WorldCombat.effect(skydropCarry, 1, 260, "action", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(skydropCarry, "start", function () { });
    WorldCombat.effectHandler(skydropCarry, "end", function (effect) {
        const world = effect.world(), target = effect.target();
        if (world.valid(target) && world.effects(target, skydropCarry).every(view => view.id() === effect.id())) {
            skydropResetFall(world, target);
            MobEffects.consume(world, target, skydropCarried);
        }
    });
    WorldCombat.on("world_combat:move_skydrop/carry-watch", "world_combat:mob_effect_tick", "", function (event) {
        if (JSON.parse(event.data()).id !== skydropCarried) return;
        const world = event.world(), target = event.actor();
        if (!world.effects(target, skydropCarry).length) {
            skydropResetFall(world, target);
            MobEffects.consume(world, target, skydropCarried);
        }
    });
    function skydropFinish(action: CombatAction): void {
        action.releaseTarget();
        const ticks = Number(JSON.parse(action.data("skydrop:recover") || "{}").ticks || 0);
        function recover(current: CombatAction, left: number): void {
            if (left <= 0) { current.finish(); return; }
            current.stage("recovering"); current.stopMovement();
            current.after(1, next => recover(next, left - 1));
        }
        recover(action, ticks);
    }

    /** 目标体重（千克）；非宝可梦目标按 0（不构成抓取限制）。 */
    function skydropWeight(world: CombatWorld, actor: CombatActor): number {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return 0;
        try { return Number(CobblemonCombat.pokemon(actor).weight()); } catch (error) { return 0; }
    }

    /** 目标正下方最近地表的顶面高度；找不到就返回脚底当前高度。 */
    function skydropSurface(world: CombatWorld, body: CombatObservation): number {
        const from = body.position(), feet = from.y() - body.height() * 0.5;
        for (let step = 0; step <= 24; step++) {
            const block = world.block(WorldCombat.point(from.x(), feet - step, from.z()));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return Math.floor(feet - step) + 1;
        }
        return feet;
    }

    function skydropAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    /** 清一次坠落距离：搬运与摔落由本招的 slam 结算，不能让原生物理再补一次坠落伤害。 */
    function skydropResetFall(world: CombatWorld, actor: CombatActor): void {
        try { const native = world.nativeEntity(actor); if (native) native.fallDistance = 0; } catch (error) { }
    }

    /** 把一个活体朝指定点推动一步。 */
    function skydropToward(world: CombatWorld, actor: CombatActor, point: CombatPoint, speed: number): void {
        const body = world.observe(actor);
        if (body === null) return;
        const delta = point.minus(body.position()), length = delta.length();
        if (length < 0.01) return;
        world.displace(actor, delta.unit().scale(Math.min(speed, length)));
    }

    /** 施法者朝保持点上升／落回：直接给竖直速度，不受地面/同格活体阻挡影响。 */
    function skydropLift(world: CombatWorld, actor: CombatActor, hold: CombatPoint, speed: number): void {
        const body = world.observe(actor);
        if (body === null) return;
        skydropResetFall(world, actor);
        const delta = hold.minus(body.position());
        const vy = Math.abs(delta.y()) < 0.05 ? 0 : Math.max(-speed, Math.min(speed, delta.y()));
        world.motion(actor, WorldCombat.point(0, vy, 0), false);
    }

    /** 把被抓的目标放到指定点：直接落位，落不了再退化为推动一步。 */
    function skydropRide(world: CombatWorld, target: CombatActor, point: CombatPoint): void {
        skydropResetFall(world, target);
        if (world.teleport(target, point)) return;
        skydropToward(world, target, point, 1.2);
    }

    function skydropAbort(world: CombatWorld, target: CombatActor): void {
        if (world.valid(target)) MobEffects.consume(world, target, skydropCarried);
    }

    interface SkydropState { phase: string; elapsed: number; ticks: number; surface: number; altitude: number; reference: number; riseLimit: number; casterHold: number[]; dropped: number; }

    function skydropBegin(current: CombatAction, target: CombatActor, slam: number, liftSpeed: number, dropSpeed: number, holdTicks: number, altitude: number): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor), body = world.observe(target);
        if (self === null || body === null) { skydropFinish(current); return; }
        const surface = skydropSurface(world, body), cx = body.position().x(), cz = body.position().z();
        const casterHold = WorldCombat.point(cx, surface + altitude, cz);
        const duration = Math.ceil(altitude / Math.max(0.15, liftSpeed)) + holdTicks + 90;
        const state: SkydropState = { phase: "rise", elapsed: 0, ticks: 0, surface: surface, altitude: altitude,
            reference: altitude + 1.9, riseLimit: Math.ceil(altitude / Math.max(0.15, liftSpeed)) + 4,
            casterHold: [casterHold.x(), casterHold.y(), casterHold.z()], dropped: 0 };
        world.deliver(target, "world_combat:interrupt");
        world.stopMovement(target);
        current.effect(skydropCarry, target, "{}", 260);
        MobEffects.apply(world, target, skydropCarried, duration, 0);
        WorldFeedback.emit(world, skydropScene, 1, self.position(),
            { moment: "grab", target: String(target.ref()), altitude: altitude, scale: Math.max(0.6, Math.min(2, altitude / 4)) }, 26);
        WorldFeedback.text(world, skydropAbove(self.position()), skydropGrabText, [], 24);
        sound(current, "cobblemon:move.aerialace.actor_1");
        skydropStep(current, target, state, slam, liftSpeed, dropSpeed, holdTicks);
    }

    function skydropStep(current: CombatAction, target: CombatActor, state: SkydropState, slam: number, liftSpeed: number, dropSpeed: number, holdTicks: number): void {
        const world = current.world(), actor = current.actor();
        const self = world.observe(actor), victim = world.observe(target);
        state.ticks++;
        if (self === null || state.ticks > 220 || MobEffects.read(world, target, skydropCarried) === null) { skydropAbort(world, target); skydropFinish(current); return; }
        current.stopMovement();
        world.stopMovement(target);
        const casterHold = WorldCombat.point(state.casterHold[0], state.casterHold[1], state.casterHold[2]);
        if (state.phase === "rise" || state.phase === "hold") {
            if (victim === null) { skydropAbort(world, target); skydropFinish(current); return; }
            const rate = state.phase === "rise" ? liftSpeed : liftSpeed * 0.4;
            skydropLift(world, actor, casterHold, rate);
            const top = world.observe(actor);
            if (top !== null) skydropRide(world, target, top.position().plus(WorldCombat.point(0, 1.9, 0)));
            if (state.phase === "rise") {
                state.elapsed++;
                if (self.position().minus(casterHold).length() <= 0.3 || state.elapsed >= state.riseLimit) {
                    state.phase = "hold"; state.elapsed = 0;
                    WorldFeedback.emit(world, skydropScene, 1, victim.position(), { moment: "hold", target: String(target.ref()), altitude: state.altitude }, 20);
                }
            } else {
                WorldFeedback.keep(world, "skydrop:hold:" + String(target.ref()), skydropScene, 1, victim.position(),
                    { moment: "hold", target: String(target.ref()), altitude: state.altitude }, 6);
                state.elapsed++;
                if (state.elapsed >= holdTicks) {
                    state.phase = "drop";
                    state.dropped = Math.max(0, victim.position().y() - (state.surface + victim.height() * 0.5));
                    world.deliver(target, "world_combat:interrupt");
                    sound(current, "minecraft:entity.generic.small_fall");
                }
            }
            current.after(1, function (next: CombatAction) { skydropStep(next, target, state, slam, liftSpeed, dropSpeed, holdTicks); });
            return;
        }
        if (state.phase === "drop") {
            if (victim === null) { skydropAbort(world, target); skydropFinish(current); return; }
            const feet = victim.position().y() - victim.height() * 0.5;
            if (feet <= state.surface + 0.12 || victim.grounded()) { skydropSlam(current, target, state, slam); return; }
            skydropResetFall(world, target);
            world.displace(target, WorldCombat.point(0, -dropSpeed, 0));
            WorldFeedback.keep(world, "skydrop:fall:" + String(target.ref()), skydropScene, 1, victim.position(),
                { moment: "fall", target: String(target.ref()), drop: Math.round(dropSpeed * 100) / 100, rate: Math.round(30 + dropSpeed * 30) }, 4);
            current.after(1, function (next: CombatAction) { skydropStep(next, target, state, slam, liftSpeed, dropSpeed, holdTicks); });
            return;
        }
    }

    function skydropSlam(current: CombatAction, target: CombatActor, state: SkydropState, slam: number): void {
        const world = current.world();
        const victim = world.observe(target);
        const heightFactor = 0.6 + 0.4 * Math.max(0, Math.min(1, state.dropped / Math.max(1, state.reference)));
        const power = slam * heightFactor;
        if (victim !== null) {
            skydropResetFall(world, target);
            hurt(current, target, "skydrop", power, { damage: damageSpec("skydrop", "slam"), contact: true });
            if (world.valid(target)) MobEffects.consume(world, target, skydropCarried);
            WorldFeedback.emit(world, skydropScene, 1, victim.position(),
                { moment: "slam", target: String(target.ref()), intensity: Math.max(0.6, Math.min(2.2, power / 60)),
                    height: Math.round(heightFactor * 100) / 100, count: Math.round(20 + power * 0.4) }, 30);
            sound(current, "cobblemon:impact.flying");
            sound(current, "minecraft:entity.generic.big_fall");
            WorldFeedback.text(world, skydropAbove(victim.position()), skydropSlamText, [], 28);
        } else {
            skydropAbort(world, target);
        }
        skydropLand(current, state, 0);
    }

    function skydropLand(current: CombatAction, state: SkydropState, guard: number): void {
        const world = current.world(), self = world.observe(current.actor());
        if (self === null || guard > 40) { skydropFinish(current); return; }
        const floor = skydropSurface(world, self);
        const feet = self.position().y() - self.height() * 0.5;
        if (feet > floor + 0.15) {
            skydropLift(world, current.actor(), WorldCombat.point(self.position().x(), floor + self.height() * 0.5, self.position().z()),
                Math.max(0.4, state.altitude * 0.4));
            current.after(1, function (next: CombatAction) { skydropLand(next, state, guard + 1); });
            return;
        }
        skydropResetFall(world, current.actor());
        WorldFeedback.emit(world, skydropScene, 1, self.position(), { moment: "land", target: String(current.actor().ref()) }, 18);
        skydropFinish(current);
    }

    define({
        freeMovement: true,
        id: "skydrop",
        name: "Sky Drop",
        description: "贴身抓住一个对手，把它拎到空中停一段——这几刻它完全动不了——再摔到地面上；抓得越高、目标越沉，摔得越重。对手太重抓不起来时本招不发动。",
        uses: ["把关键目标从战场里摘出去一段时间", "抓住一个近身的对手再连本带利摔回来", "用一次重摔换取一段暴露的滞空"],
        kind: "enemy",
        range: 4,
        maxRange: 6,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 46,
        style: "aerial",
        maximumTicks: 260,
        interruptible: true,
        defaults: { carryHigh: false, ai: { maxChase: 8, maxWeight: 300, preferIsolated: true } },
        fields: [field(pathOf("carryHigh"), "高抛", "boolean", {
            help: "开启：提得更高、滞空更久、摔落约 ×1.15，但起手 +3 刻、冷却 +10 刻。关闭（低位速摔）：提得低、摔得轻（约 ×0.85），但收手更快、冷却更短。"
        })],
        indicator: function (config, pokemon) {
            return { radius: p("skydrop", "reach", pokemon), geometry: "circle", style: "aerial", color: 0x9FC6E8,
                label: config && config.carryHigh === true ? "高抛自由落体" : "低位速摔" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["skydrop"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const high = skydropHigh(config);
            return {
                prepare: Math.max(4, Math.round(p("skydrop", "prepare", context)) + (high ? 3 : -1)),
                recover: Math.max(4, Math.round(p("skydrop", "recover", context)) + (high ? 2 : -2)),
                cooldown: Math.max(20, Math.round(p("skydrop", "cooldown", context)) + (high ? 10 : -6)),
                active: 0,
                range: p("skydrop", "reach", context)
            };
        },
        run: function (action, move, config) {
            const high = skydropHigh(config);
            const prepareTicks = Math.max(4, Math.round(p("skydrop", "prepare", action)) + (high ? 3 : -1));
            action.data("skydrop:recover", JSON.stringify({ ticks: Math.max(4, Math.round(p("skydrop", "recover", action)) + (high ? 2 : -2)) }));
            LivingActions.lifecycle(action, { interruptible: true });
            action.present("skydrop:windup", skydropScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", high: high ? 1 : 0 }));
            action.after(prepareTicks, function (current: CombatAction) {
                const sense = current.sense(), target = current.target();
                if (target === null || !sense.valid(target)) { current.reject("target-left"); return; }
                const body = sense.observe(target);
                if (body === null) { current.reject("target-left"); return; }
                if (sense.effects(target, skydropCarry).length) { current.reject("already-carried"); return; }
                if (skydropWeight(sense, target) > p("skydrop", "liftCap", current)) { current.reject("too-heavy"); return; }
                current.commit(Math.max(20, Math.round(p("skydrop", "cooldown", current)) + (high ? 10 : -6)));
                skydropBegin(current, target, p("skydrop", "slam", current), Math.max(0.15, p("skydrop", "liftSpeed", current)),
                    Math.max(0.3, p("skydrop", "dropSpeed", current)), Math.max(4, Math.round(p("skydrop", "holdTicks", current))),
                    Math.max(1.2, p("skydrop", "altitude", current)));
            });
        }
    });

    // 携带目标的招式与原生攻击均被挡住；旁人的救援伤害仍可打中施法者。
    CombatStatus.actions.define({ id: "world_combat:move_skydrop/carry-gate",
        apply: function (context) { if (CombatStatus.has(context.world, context.actor, "skydrop")) context.blocked.skycarried = true; } });

    // 被抓的目标导航速度归零，免得它的 AI 与保持位移互相对抗。
    WorldCombat.on("world_combat:move_skydrop/roots", "world_combat:navigate", "", function (event) {
        if (!CombatStatus.has(event.world(), event.actor(), "skydrop")) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });
}
