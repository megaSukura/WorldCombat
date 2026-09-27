/**
 * 重力 / gravity 的井规则与凌空封锁，对所有战斗者一致。
 *
 * 重力井是一条区域规则：每 5 刻扫描半径内的活体，给它们补 `world_combat:gravity_well`
 *   （身份 `world_combat:status/gravity`），拔掉 fly／bounce／magnetrise／telekinesis 四个共享浮空身份，
 *   并给离地的身体挂上坠压载体 `world_combat:move_gravity/press`。坠压每 5 刻只改写竖直速度、保留横向移动；
 *   离开井后载体按 pin 余量继续，落地给一次落地反馈后结束或自然到期。
 * 凌空封锁：带重力身份的活体提交带原生 `gravity` flag 的招式时被拒绝——这就是「飞向空中的招式无法使用」
 *   的原生化翻译；哪些招式算凌空由 Cobblemon 的原生 flag 决定，不写死名单。
 */
namespace PokemonSkills {
    function gravityPoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    /** 拔掉目标身上的浮空身份；返回是否拔掉了任何一样。 */
    function gravityStrip(world: CombatWorld, actor: CombatActor): boolean {
        let removed = false;
        ["fly", "bounce", "magnetrise", "telekinesis"].forEach(function (name) {
            CombatStatus.tagged(world, actor, name).forEach(function (effect) {
                if (world.removeMobEffect(actor, effect.id(), effect.key())) removed = true;
            });
        });
        return removed;
    }

    /** 井里的贴地身份；离开井后按 pin 余量继续，浮空招式封锁随它一起挂住。 */
    function gravityWellOn(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const pin = Math.max(20, Math.round(Number(field.data.pin) || 40));
        MobEffects.apply(world, actor, gravityWell, pin + 20, 0);
    }

    /**
     * 坠压载体：离地时每 5 刻只改写竖直速度、保留横向移动；落地给一次落地反馈并结束，或按剩余时长自然结束。
     * 它比井活得久，所以离场后仍能兑现有限坠压。
     */
    function gravityPressState(json: string): string {
        const value = JSON.parse(json), pull = Number(value.pull);
        if (!isFinite(pull) || pull <= 0) throw new Error("Invalid gravity press");
        return JSON.stringify({ pull: pull, shock: Math.max(1, Math.round(Number(value.shock) || 8)), airborne: value.airborne === true });
    }
    WorldCombat.effect(gravityPress, 1, 120, "actor", gravityPressState, EffectProtocols.unchanged);
    WorldCombat.effectHandler(gravityPress, "start", function (effect) { effect.schedule("press", "press", 1, "{}"); });
    WorldCombat.effectHandler(gravityPress, "press", function (effect) {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) { effect.end(); return; }
        // 随施放者结束：施放者倒下或离开太远时，余压不再悬空。
        const source = world.observe(effect.source());
        if (source === null || body.position().minus(source.position()).length() > WorldEffects.fieldLimits.sourceRange) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        const pull = Math.max(0.1, Number(state.pull) || 0.32);
        if (body.grounded()) {
            if (state.airborne === true) {
                WorldFeedback.emit(world, gravityScene, 1, body.position(),
                    { moment: "pin", target: String(target.ref()), shock: Math.max(1, Math.round(Number(state.shock) || 8)) }, 20);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), gravityPinText, [], 20);
            }
            effect.end(); return;
        }
        if (state.airborne !== true) {
            state.airborne = true; effect.state(JSON.stringify(state));
            WorldFeedback.emit(world, gravityScene, 1, body.position(),
                { moment: "fall", target: String(target.ref()), shock: Math.max(1, Math.round(Number(state.shock) || 8)), pull: pull }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), gravityFallText, [], 26);
        }
        if (world.tick() % 5 === 0) {
            const velocity = body.velocity();
            // 只改竖直分量，保留目标此刻的横向速度。
            world.motion(target, WorldCombat.point(velocity.x(), -pull, velocity.z()), false);
        }
        effect.schedule("press", "press", 1, "{}");
    });
    WorldCombat.effectHandler(gravityPress, "operation:world_combat:refresh", function (effect) {
        const ticks = Number(JSON.parse(effect.input()).ticks);
        effect.remaining(isFinite(ticks) && ticks > 0 ? Math.round(ticks) : 1);
    });
    WorldCombat.effectHandler(gravityPress, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 给离地活体挂上或续期坠压；已有本来源的坠压只延长剩余时间。 */
    function gravityPressOn(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
        const pin = Math.max(20, Math.round(Number(field.data.pin) || 40));
        const data = JSON.stringify({ pull: Math.max(0.1, Number(field.data.pull) || 0.32), shock: Math.max(1, Math.round(Number(field.data.shock) || 8)) });
        const existing = world.effects(actor, gravityPress);
        for (let i = 0; i < existing.length; i++) {
            if (existing[i].source().key() === world.source().key()
                && world.operation(existing[i].id(), "world_combat:refresh", JSON.stringify({ ticks: pin }))) return;
        }
        world.effect(gravityPress, actor, data, pin);
    }

    /** 给井里的活体补贴地身份、拔浮空，并给离地身体挂上坠压；返回是否正在往下压。 */
    function gravityHold(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        gravityStrip(world, actor);
        gravityWellOn(world, actor, field);
        if (body.grounded()) return false;
        gravityPressOn(world, actor, field);
        return true;
    }

    WorldEffects.fieldRule(gravityField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const body = world.observe(actor);
            if (body === null) return;
            const stripped = gravityStrip(world, actor);
            gravityWellOn(world, actor, field);
            if (!body.grounded()) { gravityPressOn(world, actor, field); return; }
            if (stripped) {
                WorldFeedback.emit(world, gravityScene, 1, body.position(), { moment: "stripped", target: String(actor.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), gravityFallText, [], 24);
            }
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            gravityHold(world, actor, field);
        },
        leave: function (): void {
            // 离开井：贴地身份与坠压按 pin 余量继续，落地或到时结束，不再立即清除。
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = gravityPoint(field);
            WorldFeedback.keep(world, "world_combat:move_gravity/field/" + effect.id(), gravityScene, 1, centre,
                { moment: "field", density: field.data.density || 22, scale: field.radius / 3.4,
                    crush: (Number(field.data.pull) || 0.32) > 0.45 ? 1 : 0 }, 20);
        }
    });

    // 凌空招式在井里起不了手：原生 flag `gravity` 是机读键，带重力身份的活体提交这类招式时被拒绝。
    CombatStatus.actions.define({ id: "world_combat:move_gravity/flightless", apply: function (context) {
        if (context.blocked.gravity) return;
        const world = context.world, actor = context.actor, action = context.action;
        if (!world || !actor || !action || !world.valid(actor)) return;
        if (!CombatStatus.has(world, actor, gravityStatus)) return;
        const move = NativeLoadout.executing(action);
        if (!move) return;
        if (!NativeLoadout.facts(move).flags.gravity) return;
        context.blocked.gravity = true;
    } });
}
