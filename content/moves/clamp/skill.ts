/**
 * 贝壳夹击 / clamp 的出手方式。
 *
 * 核心念头：贴身把厚壳合上一只对手，自己也跟着被钉在原地——壳一开一合地碾，对手走不掉，施法者也走不掉；
 * 直到撑满时长，或任一方被击退扯开、倒下。它是一记擒抱：力量来自壳的厚度与身体的重量。
 *
 * 三幕：
 *   起（windup，提交前）：壳张开、水里透出白气的预告。
 *   合（seize → crush）：提交后朝目标补上一步把壳合上；控制成立时双方被钉住，壳每 `interval` 碾一次
 *       （`crush` 伤害）。控制被目标拒绝（守护、免控 Boss 等）时不把自己钉死：只留在接触距离里短促碾压几下。
 *   开（release / slip）：撑满时长自然松开；或双方被扯开、被墙隔开、状态被清除、任一方倒下时提前滑脱。
 *
 * 擒抱是双向的承诺：只有目标真的被挂上共享身份 `partiallytrapped`（`CombatStatus.apply` 成功）、施法者也
 * 真的挂上夹持态与 rooted，才按 `holdTicks` 创建 `clamp_bond`；三样里任一件失败就精确回滚本次已落下的那几件。
 * `clamp_bond` 记录双方的 carrier key 与本次 rooted 的 id：每 2 刻的短轮询复查接触距离、通视与双方 carrier
 * 是否仍在本招手里，松开或驱散时只撤自己这几件。主伤由接触结算（`hurt` 的 contact 伤害），只有真的结算成功
 * 才报碾合表现。
 *
 * 配置 `grind`（磨壳式）由 resolve 改时序、由公式改每跳与时长：开启＝跳数更多、被钉更久。
 */
namespace PokemonSkills {
    const clampScene = "world_combat:move_clamp";
    const clampShellEffect = "world_combat:clamped_shell";
    const clampHoldEffect = "world_combat:clamping";
    const clampBond = "world_combat:clamp_bond";
    const clampHoldKey = "clamp:hold";
    const clampSeizeText = "world_combat.move.clamp.text.seize";
    const clampShortText = "world_combat.move.clamp.text.short";
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

    /**
     * 松开：只摘掉本次本招自己挂上的壳、施法者夹持态与那一记 rooted，别的来源的定身与状态原样保留。
     * carrier 用 key 精确比对：被别的来源刷新过的状态不动；本招自己的 root 只按记录的 id 收回。
     */
    function clampRelease(effect: CombatEffect): void {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const shell = MobEffects.read(world, victim, clampShellEffect);
            if (shell !== null && data.shell && MobEffects.matches(world, victim, data.shell))
                world.removeMobEffect(victim, clampShellEffect, shell.key());
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
            if (hold !== null && data.hold && MobEffects.matches(world, caster, data.hold))
                world.removeMobEffect(caster, clampHoldEffect, hold.key());
            if (typeof data.root === "number" && data.root > 0) world.operation(data.root, "world_combat:dispel", "{}");
            const body = world.observe(caster);
            if (body !== null) WorldFeedback.emit(world, clampScene, 1, body.position(), { moment: "free", target: String(caster.ref()) }, 20);
        }
    }

    /** 两个身体的真实表面端点（施法者壳口到目标身侧），持续闭壳与磨伤都读同一组接触。 */
    function clampContact(world: CombatWorld, caster: CombatActor, victim: CombatActor): number[][] {
        const held = world.observe(victim), holder = world.observe(caster);
        if (held === null || holder === null) return [];
        const from = world.closestPoint(caster, held.position()), to = world.closestPoint(victim, holder.position());
        return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
    }

    WorldCombat.effect(clampBond, 1, 400, "actor", clampBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(clampBond, "start", function (effect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        effect.schedule("check", "check", 2, "{}");
        effect.schedule("grind", "grind", 1, "{}");
        // 夹持走满 holdTicks 就是正常松开；在此之前断线/被清除才算滑脱。
        effect.schedule("expire", "expire", Math.max(1, data.expire - world.tick()), "{}");
    });
    // 连接复查与磨伤分开：每 2 刻量一次距离、通视与双方 carrier 是否仍在本招手里，断线立刻松。
    WorldCombat.effectHandler(clampBond, "check", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const caster = world.actor(data.caster);
        if (caster === null || !world.valid(caster)) { data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return; }
        const held = world.observe(victim), holder = world.observe(caster);
        if (held === null || holder === null || held.position().minus(holder.position()).length() > data.range
            || !world.clear(holder.position(), held.position())
            || !data.shell || !MobEffects.matches(world, victim, data.shell)
            || !data.hold || !MobEffects.matches(world, caster, data.hold)) {
            data.slipped = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        // 持续闭壳：按双方体型围合，绑在这份托管效果上，效果一收即断。
        WorldFeedback.onEffect(world, effect.id(), clampHoldKey, clampScene, 1, held.position(),
            { moment: "hold", target: String(victim.ref()), path: clampContact(world, caster, victim),
                selfR: Math.max(0.3, holder.width() * 0.5), shellR: Math.max(0.3, held.width() * 0.5),
                straps: data.straps, intensity: Math.max(0.6, Math.min(2, data.crush / 30)) });
        effect.schedule("check", "check", 2, "{}");
    });
    WorldCombat.effectHandler(clampBond, "grind", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        // 只有这一下真的结算成功才报碾合表现；被原生拒绝时不发成功提示。
        const landed = hurt(world, victim, "clamp", data.crush, { damage: damageSpec("clamp", "crush"), contact: true });
        if (!world.valid(victim)) { effect.end(); return; }
        const held = world.observe(victim);
        if (landed && held !== null) {
            WorldFeedback.emit(world, clampScene, 1, held.position(),
                { moment: "crush", target: String(victim.ref()), straps: data.straps, crush: data.crush,
                    intensity: Math.max(0.6, Math.min(2, data.crush / 30)) }, 22);
            world.sound("cobblemon:impact.water", held.position(), 16, "{}");
        }
        effect.schedule("grind", "grind", Math.max(4, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(clampBond, "expire", function (effect) {
        const data = JSON.parse(effect.state());
        data.slipped = false; effect.state(JSON.stringify(data)); effect.end();
    });
    WorldCombat.effectHandler(clampBond, "end", clampRelease);
    WorldCombat.effectHandler(clampBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    // 状态被清除（牛奶、/effect clear、别的脚本）时，夹击的持续效果立刻结束，不等下一跳。
    WorldCombat.on("world_combat:move_clamp/clear", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data())), world = event.world(), actor = event.actor();
        if (data.id === clampShellEffect) {
            world.effects(actor, clampBond).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        } else if (data.id === clampHoldEffect) {
            const caster = String(actor.ref());
            world.effectsOfType(clampBond).forEach(function (view) {
                try { if (String(JSON.parse(String(view.data())).caster) === caster) world.operation(view.id(), "world_combat:dispel", "{}"); } catch (error) { }
            });
        }
    });

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
        description: "贴身把厚壳合上一只对手并钉在原地：控制成立时目标的移动被锁死，施法者同样不能移动、也无法再出招，壳每隔一会儿碾一次。目标免控或被守护时不被假夹，只留在接触距离里短促碾压几下；拉开、隔墙或驱散都马上松壳。磨壳式跳数更多、双方被钉更久。",
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
        fields: [
            field(pathOf("grind"), "磨壳式", "boolean", { help: "开启（磨壳式）：每跳约 ×0.62、间隔约 ×0.72、夹持约 ×1.25，跳数更多、双方被钉更久，冷却 +10 刻——用来把硬目标按住等队友。关闭（速决式）：每跳满值、间隔更长、夹持更短，双方更快脱离，适合打完就走。" })
        ],
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
            // 墙隔开就够不着，不当夹住。
            if (!world.clear(body.position(), victim.position())) {
                WorldFeedback.emit(world, clampScene, 1, victim.position(), { moment: "miss", target: String(target.ref()) }, 18);
                WorldFeedback.text(world, victim.position().plus(WorldCombat.point(0, 1.1, 0)), clampSlipText, [], 24);
                done(action); return;
            }
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

            // 先确认控制真的挂上：共享身份落不下（守护、免控 Boss 等）就不进入长自锁。
            // 双方 carrier 比夹持多留 60 刻，让 clamp_bond 到时自行收尾时仍能按 key 精确撤掉这几件。
            const controlled = CombatStatus.apply(world, target, "partiallytrapped", clampShellEffect, holdTicks + 60, 0);
            const shell = controlled ? MobEffects.read(world, target, clampShellEffect) : null;
            const selfHold = controlled ? MobEffects.apply(world, self, clampHoldEffect, holdTicks + 60, 0) : null;
            const selfRooted = controlled && selfHold !== null ? WorldEffects.apply(world, self, "rooted", {}, holdTicks) : 0;
            if (shell !== null && selfHold !== null && selfRooted > 0) {
                world.effect(clampBond, target, JSON.stringify({ caster: String(self.ref()), crush: crush, interval: interval, range: holdRange, straps: straps, slipped: false,
                    expire: world.tick() + holdTicks, shell: MobEffects.anchor(shell), hold: MobEffects.anchor(selfHold), root: selfRooted }), holdTicks + 40);
                WorldFeedback.emit(world, clampScene, 1, to,
                    { moment: "seize", target: String(target.ref()), straps: straps, shell: gap, duration: holdTicks }, 30);
                WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), clampSeizeText, [Math.round(holdTicks / 20 * 10) / 10], 28);
                sound(action, "cobblemon:move.bubble.actor");
                done(action); return;
            }
            // 三样里只要有一件没成功，就把已经落下的部分精确回滚——只撤本招这一次挂上的键，不碰他源的壳与定身。
            if (shell !== null) world.removeMobEffect(target, clampShellEffect, shell.key());
            if (selfHold !== null) world.removeMobEffect(self, clampHoldEffect, selfHold.key());
            if (selfRooted > 0) world.operation(selfRooted, "world_combat:dispel", "{}");
            // 控制没成立：不把自己钉死，只留在接触距离里短促碾几下就收。
            WorldFeedback.emit(world, clampScene, 1, to,
                { moment: "seize", target: String(target.ref()), straps: straps, shell: gap, duration: 0, short: 1 }, 24);
            let hits = 0;
            function contactCrush(current: CombatAction): void {
                const enemy = target!;
                const scope = current.world(), held = scope.observe(enemy);
                if (held === null || !scope.valid(enemy)) { done(current); return; }
                const holder = scope.observe(self);
                if (holder === null || held.position().minus(holder.position()).length() > holdRange || !scope.clear(holder.position(), held.position())) { done(current); return; }
                const landed = hurt(current, enemy, "clamp", crush, { damage: damageSpec("clamp", "crush"), contact: true });
                if (landed) {
                    hits++;
                    WorldFeedback.emit(scope, clampScene, 1, held.position(),
                        { moment: "crush", target: String(enemy.ref()), straps: straps, crush: crush,
                            intensity: Math.max(0.6, Math.min(2, crush / 30)) }, 20);
                    scope.sound("cobblemon:impact.water", held.position(), 16, "{}");
                }
                if (!landed || hits >= 3) { done(current); return; }
                current.after(interval, function (next: CombatAction) { contactCrush(next); });
            }
            WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), clampShortText, [crush], 26);
            sound(action, "cobblemon:move.bubble.actor");
            contactCrush(action);
        }
    });
}
