/**
 * 贝壳夹击 / clamp 的出手方式。
 *
 * 核心念头：贴身把厚壳合上一只对手，自己也跟着被钉在原地——壳一开一合地碾，对手走不掉，施法者也走不掉；
 * 直到撑满时长，或任一方被击退扯开、倒下。它是一记擒抱：力量来自壳的厚度与身体的重量。
 *
 * 三幕：
 *   起（windup，提交前）：壳张开、水里透出白气的预告。
 *   合（seize → crush）：提交后朝目标补上一步把壳合上；双方被钉住，壳每 `interval` 碾一次
 *       （`crush` 伤害），同一目标只被这一边夹住。
 *   开（release / slip）：撑满时长自然松开；或双方被扯开到 `holdRange` 以外、任一方倒下时提前滑脱。
 *
 * 擒抱是双向的承诺：施法者按 `holdTicks` 被 rooted 与 `world_combat:clamping` 钉住，带 `clamping` 身份
 * 时不能开始新动作（本单元注册的动作门禁），所以被击退是这招最直接的反制。
 *
 * 配置 `grind`（磨壳式）由 resolve 改时序、由公式改每跳与时长：开启＝跳数更多、被钉更久。
 */
namespace PokemonSkills {
    const clampScene = "world_combat:move_clamp";
    const clampShellEffect = "world_combat:clamped_shell";
    const clampHoldEffect = "world_combat:clamping";
    const clampBond = "world_combat:clamp_bond";
    const clampSeizeText = "world_combat.move.clamp.text.seize";
    const clampReleaseText = "world_combat.move.clamp.text.release";
    const clampSlipText = "world_combat.move.clamp.text.slip";

    function clampBondData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid clamp bond");
        ["crush", "interval", "range", "straps"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid clamp bond");
        });
        if (value.interval < 1 || value.range <= 0) throw new Error("Invalid clamp bond");
        return JSON.stringify(value);
    }

    /** 松开：摘掉双方身上的夹击状态与 rooted，并在原地留下收尾表现。 */
    function clampRelease(effect: CombatEffect): void {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const shell = MobEffects.read(world, victim, clampShellEffect);
            if (shell !== null) world.removeMobEffect(victim, clampShellEffect, shell.key());
            const body = world.observe(victim);
            if (body !== null) {
                WorldFeedback.emit(world, clampScene, 1, body.position(),
                    { moment: data.slipped ? "slip" : "release", target: String(victim.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)),
                    data.slipped ? clampSlipText : clampReleaseText, [], 26);
            }
        }
        const caster = world.actor(data.caster);
        if (caster !== null && world.valid(caster)) {
            const hold = MobEffects.read(world, caster, clampHoldEffect);
            if (hold !== null) world.removeMobEffect(caster, clampHoldEffect, hold.key());
            const roots = world.effects(caster, "world_combat:rooted");
            for (let i = 0; i < roots.length; i++) world.operation(roots[i].id(), "world_combat:dispel", "{}");
            const body = world.observe(caster);
            if (body !== null) WorldFeedback.emit(world, clampScene, 1, body.position(), { moment: "free", target: String(caster.ref()) }, 20);
        }
    }

    WorldCombat.effect(clampBond, 1, 400, "actor", clampBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(clampBond, "start", function (effect) { effect.schedule("grind", "grind", 1, "{}"); });
    WorldCombat.effectHandler(clampBond, "grind", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const caster = world.actor(data.caster);
        if (caster === null || !world.valid(caster)) { data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return; }
        const held = world.observe(victim), holder = world.observe(caster);
        if (held === null || holder === null || held.position().minus(holder.position()).length() > data.range) {
            data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        hurt(world, victim, "clamp", data.crush, { damage: damageSpec("clamp", "crush"), contact: true });
        if (!world.valid(victim)) { effect.end(); return; }
        WorldFeedback.emit(world, clampScene, 1, held.position(),
            { moment: "crush", target: String(victim.ref()), straps: data.straps, crush: data.crush,
                intensity: Math.max(0.6, Math.min(2, data.crush / 30)) }, 22);
        world.sound("cobblemon:impact.water", held.position(), 16, "{}");
        effect.schedule("grind", "grind", Math.max(4, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(clampBond, "end", clampRelease);

    // 施法者带着 world_combat:status/clamping 时不能开始新动作：壳合着就没法再出手，这是擒抱的承诺。
    CombatStatus.actions.define({ id: "world_combat:move/clamp/hold-gate", applies: function (context) { return context.phase !== "damage"; },
        apply: function (context) { if (CombatStatus.has(context.world, context.actor, "clamping")) context.blocked.holding = true; } });

    // 带着夹击壳的目标无法移动：对宝可梦与原生生物一致归零导航速度（效果自带移动属性归零）。
    WorldCombat.on("world_combat:move_clamp/roots", "world_combat:navigate", "", function (event) {
        if (event.world().mobEffect(event.actor(), clampShellEffect) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    define({
        freeMovement: true,
        id: "clamp",
        name: "Clamp",
        description: "贴身把厚壳合上一只对手并钉在原地：目标的移动被锁死，施法者同样不能移动、也无法再出招，壳每隔一会儿碾一次，直到撑满时长或被扯开。磨壳式跳数更多、双方被钉更久；速决式每跳更重、更快脱离。",
        uses: ["把冲进来的硬目标钉住等队友来收", "用壳的厚度磨掉近身的大体型对手", "在狭窄处锁死一个关键目标", "用自己不动换对手动不了"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.6,
        prepare: 10,
        active: 12,
        recover: 10,
        cooldown: 40,
        style: "shellclamp",
        defaults: { grind: false, ai: { maxChase: 6, minSelf: 0.35 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("clamp", "holdRange", pokemon), geometry: "circle", style: "shellclamp",
                color: 0x9FD7E8, label: config && config.grind === true ? "磨壳夹击" : "速决夹击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["clamp"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const grind = !!(config && config.grind);
            return {
                prepare: p("clamp", "tempo", context),
                recover: p("clamp", "recover", context),
                cooldown: p("clamp", "cooldown", context) + (grind ? 10 : 0),
                active: skills["clamp"].active,
                range: p("clamp", "holdRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("clamp:gape", clampScene, 1, action.origin(),
                JSON.stringify({ moment: "gape", grind: config && config.grind === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const body = world.observe(self);
            if (body === null || target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, clampScene, 1, body !== null ? body.position() : action.origin(), { moment: "miss" }, 18);
                done(action); return;
            }
            const victim = world.observe(target);
            if (victim === null) { WorldFeedback.emit(world, clampScene, 1, body.position(), { moment: "miss" }, 18); done(action); return; }
            const from = body.position(), to = victim.position();
            const delta = to.minus(from), distance = delta.length();
            const holdRange = Math.max(1.6, p("clamp", "holdRange", action));
            if (distance > 0.8) {
                const step = Math.min(Math.max(0, p("clamp", "lunge", action)), distance - 0.8);
                if (step > 0.05) world.displace(self, delta.unit().scale(step));
            }
            const settled = world.observe(self);
            const gap = settled === null ? distance : settled.position().minus(to).length();
            if (gap > holdRange) {
                WorldFeedback.emit(world, clampScene, 1, to, { moment: "miss", target: String(target.ref()) }, 18);
                WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), clampSlipText, [], 24);
                done(action); return;
            }
            const holdTicks = Math.max(50, Math.round(p("clamp", "holdTicks", action)));
            const interval = Math.max(6, Math.round(p("clamp", "interval", action)));
            const crush = p("clamp", "crush", action);
            const straps = Math.max(8, Math.round(p("clamp", "straps", action)));
            MobEffects.apply(world, target, clampShellEffect, holdTicks, 0);
            MobEffects.apply(world, self, clampHoldEffect, holdTicks, 0);
            WorldEffects.apply(world, self, "rooted", {}, holdTicks);
            world.effect(clampBond, target, JSON.stringify({ caster: String(self.ref()), crush: crush, interval: interval, range: holdRange, straps: straps, slipped: false }), holdTicks + 40);
            WorldFeedback.emit(world, clampScene, 1, to,
                { moment: "seize", target: String(target.ref()), straps: straps, shell: gap, duration: holdTicks }, 30);
            WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), clampSeizeText, [Math.round(holdTicks / 20 * 10) / 10], 28);
            sound(action, "cobblemon:move.bubble.actor");
            done(action);
        }
    });
}
