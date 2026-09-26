/**
 * 延后 / quash 的出手方式。
 *
 * 念头的形状：目标头顶先聚起一圈暗影（windup），随后一道压制之力从身下砸下去（strike）——
 * 命中的一刻，目标正在准备的动作被打断（interrupt），身上留下 `world_combat:quash` 压制（pin）：
 * 接下来它第一次想出手会被压回去一次（deny，在提交前拦下，不花它的资源，只是晚一拍），
 * 压制期间它的移动也被拖慢；压制自然走完或被清掉就是 release。
 * 三幕：windup → strike → pin/deny → release。
 *
 * 压制是真实的 MobEffect，任何战斗者共用；宝可梦那一层与原生生物一样，不额外镜像原生异常
 * （原作的“行动顺序”在即时战斗里没有对应的原生状态）。
 */
namespace PokemonSkills {
    const quashScene = "world_combat:move_quash";
    const Quash = "world_combat:quash";
    const quashPinText = "world_combat.move.quash.text.pin";
    const quashFizzleText = "world_combat.move.quash.text.fizzle";
    const quashVisual = "world_combat:quash_visual";
    WorldCombat.effect(quashVisual, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(quashVisual, "start", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "pin", quashScene, 1, body.position(), { moment: "pin", target: String(target.ref()) });
        effect.schedule("status", "status", 1, "{}");
    });
    WorldCombat.effectHandler(quashVisual, "status", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) { effect.end(); return; }
        if (MobEffects.read(world, target, Quash) === null) {
            WorldFeedback.emit(world, quashScene, 1, body.position(), { moment: "release", target: String(target.ref()) }, 20);
            effect.end(); return;
        }
        effect.schedule("status", "status", 1, "{}");
    });
    WorldCombat.effectHandler(quashVisual, "operation:world_combat:dispel", effect => effect.end());
    const quashAttempt = "world_combat:quash/attempt";
    CombatStatus.actions.define({ id: "world_combat:quash/deny", apply: function (context) {
        if (context.phase !== "commit" && !(context.phase === "damage" && DamageSemantics.read(context.metadata).attack)) return;
        const prior = MoveExecutions.read(context.world, quashAttempt);
        if (prior && prior.denied) {
            context.blocked.quashed = true; context.detail.quashed = { status: "quash", repeated: true }; return;
        }
        const effect = MobEffects.read(context.world, context.actor, Quash);
        if (effect === null || effect.amplifier() <= 0) return;
        context.blocked.quashed = true;
        context.detail.quashed = { status: "quash", carrier: String(effect.key()) };
    } });
    // Read-only commitment chooses the refusal; its writable rejection receipt spends exactly one native carrier count.
    CombatStatus.rejected.define({ id: "world_combat:quash/spend", apply: function (context) {
        if (context.reason !== "quashed" || context.details.repeated) return;
        const world = context.world, actor = context.actor;
        if (world.originInstance()) {
            const prior = MoveExecutions.read(world, quashAttempt);
            if (prior && prior.denied) return;
            MoveExecutions.write(world, quashAttempt, { denied: true });
        }
        const effect = MobEffects.read(world, actor, Quash);
        if (effect === null || String(effect.key()) !== context.details.carrier || effect.amplifier() <= 0) return;
        const left = effect.amplifier() - 1, remaining = Math.max(1, effect.duration());
        if (!world.removeMobEffect(actor, Quash, String(effect.key()))) return;
        MobEffects.apply(world, actor, Quash, remaining, left);
        const body = world.observe(actor);
        if (body !== null) WorldFeedback.emit(world, quashScene, 1, body.position(),
            { moment: "strike", target: String(actor.ref()), count: 8, size: .12, speed: .12 }, 12);
    } });

    define({
        id: "quash",
        name: "Quash",
        description: "尝试打断目标可中断的准备，并让它接下来的有限次出手晚一拍；压制期间移动变慢。",
        uses: ["打断对手正在蓄的大招", "抢先一拍保住自己的位置", "把冲上来的目标压慢"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 8,
        active: 30,
        recover: 8,
        cooldown: 60,
        style: "press",
        defaults: { crushing: false, ai: { maxChase: 11, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["quash"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var crushing = !!(config && config.crushing);
            return {
                prepare: p("quash", "prepare", context),
                recover: p("quash", "recover", context),
                cooldown: p("quash", "cooldown", context) + (crushing ? 20 : -8),
                range: p("quash", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_quash:windup", quashScene, 1, action.targetPosition(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const centre = action.targetPosition();
            const radius = p("quash", "traceRadius", action);
            const lockTicks = p("quash", "lockTicks", action);
            const deny = Math.max(1, Math.round(p("quash", "deny", action)));
            const hit = action.trace(origin, centre, radius, true);
            const target = hit.target();
            if (!hit.hitEntity() || target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, quashScene, 1, centre, { moment: "fizzle" }, 20);
                WorldFeedback.text(world, centre, quashFizzleText, [], 24);
                sound(action, "minecraft:entity.evoker.cast_spell");
                done(action);
                return;
            }
            const point = hit.position(), ref = String(target.ref());
            world.interrupt(target, "world_combat:quash");
            if (MobEffects.apply(world, target, Quash, lockTicks, deny) !== null) {
                const count = Math.round(16 + lockTicks / 6);
                WorldFeedback.emit(world, quashScene, 1, point, { moment: "strike", target: ref,
                    count: count, size: 0.08 + count * 0.006, speed: 0.16 + count * 0.008 }, 30);
                world.effects(target, quashVisual).forEach(effect => world.operation(effect.id(), "world_combat:dispel", "{}"));
                world.effect(quashVisual, target, "{}", lockTicks + 1);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.3, 0)), quashPinText, [], 30);
            }
            sound(action, "minecraft:entity.warden.sonic_boom");
            done(action);
        }
    });
}
