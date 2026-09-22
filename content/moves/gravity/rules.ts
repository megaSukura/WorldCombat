/**
 * 重力 / gravity 的井规则与凌空封锁，对所有战斗者一致。
 *
 * 重力井是一条区域规则：每 5 刻扫描半径内的活体，给它们补 `world_combat:gravity_well`
 *   （身份 `world_combat:status/gravity`），拔掉 fly／bounce／magnetrise／telekinesis 四个共享浮空身份，
 *   并把还没落地的身体按 `pull` 逐刻往下拽。离开井后贴地身份自然到期。
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

    /** 给井里的活体补贴地身份、拔浮空，并把离地的身体往下拽；返回是否把身体正在往下拽。 */
    function gravityHold(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): boolean {
        const body = world.observe(actor);
        if (body === null) return false;
        gravityStrip(world, actor);
        const pin = Math.max(20, Math.round(Number(field.data.pin) || 40));
        MobEffects.apply(world, actor, gravityWell, pin + 20, 0);
        if (body.grounded()) return false;
        const pull = Math.max(0.1, Number(field.data.pull) || 0.32);
        world.motion(actor, WorldCombat.point(0, -pull, 0), false);
        return true;
    }

    WorldEffects.fieldRule(gravityField, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const body = world.observe(actor);
            if (body === null) return;
            const stripped = gravityStrip(world, actor);
            MobEffects.apply(world, actor, gravityWell, Math.max(40, Math.round(Number(field.data.pin) || 40)) + 20, 0);
            const shock = Math.max(1, Math.round(Number(field.data.shock) || 8));
            if (!body.grounded()) {
                const pull = Math.max(0.1, Number(field.data.pull) || 0.32);
                world.motion(actor, WorldCombat.point(0, -pull, 0), false);
                WorldFeedback.emit(world, gravityScene, 1, body.position(),
                    { moment: "fall", target: String(actor.ref()), shock: shock, pull: pull }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), gravityFallText, [], 26);
                return;
            }
            if (stripped) {
                WorldFeedback.emit(world, gravityScene, 1, body.position(), { moment: "stripped", target: String(actor.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1, 0)), gravityPinText, [], 24);
                return;
            }
            WorldFeedback.emit(world, gravityScene, 1, body.position(),
                { moment: "pin", target: String(actor.ref()), shock: shock }, 20);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            gravityHold(world, actor, field);
        },
        leave: function (world: CombatWorld, actor: CombatActor): void {
            MobEffects.consume(world, actor, gravityWell);
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
