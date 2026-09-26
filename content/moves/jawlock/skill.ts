/**
 * 紧咬不放 / jawlock —— 注册与动作。
 *
 * 核心念头：一口咬住对手，**然后谁也别想走**。施法者扑上去咬合一次（不像贝壳夹击那样每跳磨），
 *   咬中的一刹那双方都被钉在原地：咬的人嘴还咬着、被咬的人被牙钉住。对峙一直持续到任一方倒下，
 *   或有人被外力把两者拉开 `grip` 格以外。这份「互相钉住」的承诺就是它的代价——施法者也不能走。
 *
 * 选取：`kind: "aim"`——可指定敌人，也可朝一个短方向/世界点扑咬；提交与执行都不要求存在敌人。
 *   扑咬沿瞄准方向做原生 `moveSweep`，**咬到实际碰上的第一个非友方才结算**；墙会挡住、扑空不伤害，
 *   两者都不建立关系。
 *
 * 幕：
 *   起（windup，提交前）：压低身、张颚的预告（`action.present`，可被打断、不花 PP）。
 *   咬（pounce → bite / miss，提交后）：沿锁定方向逐段推进，`moveSweep` 撞上第一个非友方时结算一次
 *     `chomp` 物理伤害（contact+bite）——伤害被拒或目标免疫束缚时只吃这一口，不建立互锁。
 *   锁（lock → hold）：咬合成立后给目标挂 `world_combat:jaw_locked`、给自己挂 `world_combat:jaw_holding`
 *     （共享身份 world_combat:status/trapped），两者都被 rooted；持久效果 `world_combat:jawlock_grip`
 *     每 4 刻核对双方是否还活着、是否还在 `grip` 格内，断则提前摘下双方的状态并给出 break/free 表现。
 *   松（release / break）：时长走完或对方倒下/被拉开时松开。
 *
 * 与同族分开：贝壳夹击每跳磨、还封自己的动作；捕兽夹丢在地上施法者走开；紧咬不放是双方互锁、
 *   只咬一次、必须靠外力或倒下才能拆开的擒咬。配置 `vise`（死咬式）由 resolve 与公式改锁的时长、
 *   维持距离、咬合与冷却。
 */
namespace PokemonSkills {
    const jawlockScene = "world_combat:move_jawlock";
    const jawLocked = "world_combat:jaw_locked";
    const jawHolding = "world_combat:jaw_holding";
    const jawGrip = "world_combat:jawlock_grip";
    const jawLockText = "world_combat.move.jawlock.text.lock";
    const jawBreakText = "world_combat.move.jawlock.text.break";
    const jawReleaseText = "world_combat.move.jawlock.text.release";
    const jawMissText = "world_combat.move.jawlock.text.miss";
    const jawImmuneText = "world_combat.move.jawlock.text.immune";

    function jawlockGripData(json: string): string {
        const value = JSON.parse(json);
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid jaw lock caster");
        ["grip", "lock", "maw"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid jaw lock state");
        });
        if (value.grip <= 0 || value.lock < 1) throw new Error("Invalid jaw lock state");
        return JSON.stringify(value);
    }

    WorldCombat.effect(jawGrip, 1, 500, "actor", jawlockGripData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(jawGrip, "start", function (effect) { effect.schedule("hold", "hold", 4, "{}"); });
    WorldCombat.effectHandler(jawGrip, "hold", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const caster = world.actor(data.caster);
        if (caster === null || !world.valid(caster)) { data.broken = true; effect.state(JSON.stringify(data)); effect.end(); return; }
        const held = world.observe(victim), holder = world.observe(caster);
        if (held === null || holder === null || held.position().minus(holder.position()).length() > data.grip) {
            data.broken = true; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        const mid = held.position().plus(holder.position()).scale(0.5);
        // 持续锁链挂在 jawlock_grip 这个托管效果上：效果自然到期、被驱散或被外力拆开时，表现随之消失。
        WorldFeedback.onEffect(world, effect.id(), "jawlock:hold", jawlockScene, 1, mid,
            { moment: "hold", path: [String(caster.ref()), String(victim.ref())], maw: data.maw,
                beats: Math.max(1, Math.min(6, Math.round(data.lock / 60))) });
        effect.schedule("hold", "hold", 4, "{}");
    });
    WorldCombat.effectHandler(jawGrip, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const locked = MobEffects.read(world, victim, jawLocked);
            if (locked !== null) world.removeMobEffect(victim, jawLocked, locked.key());
            const body = world.observe(victim);
            if (body !== null) {
                WorldFeedback.emit(world, jawlockScene, 1, body.position(),
                    { moment: data.broken ? "break" : "release", target: String(victim.ref()) }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)),
                    data.broken ? jawBreakText : jawReleaseText, [], 24);
            }
        }
        const caster = world.actor(data.caster);
        if (caster !== null && world.valid(caster)) {
            const holding = MobEffects.read(world, caster, jawHolding);
            if (holding !== null) world.removeMobEffect(caster, jawHolding, holding.key());
            const body = world.observe(caster);
            if (body !== null) WorldFeedback.emit(world, jawlockScene, 1, body.position(), { moment: "free", target: String(caster.ref()) }, 20);
        }
    });

    // 被咬住或被咬的人无法移动：对宝可梦与原生生物一致归零导航速度（效果自带移动属性归零）。
    WorldCombat.on("world_combat:move_jawlock/roots", "world_combat:navigate", "", function (event) {
        const world = event.world(), actor = event.actor();
        if (world.mobEffect(actor, jawLocked) === null && world.mobEffect(actor, jawHolding) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    define({
        freeMovement: true,
        id: "jawlock",
        cooldownParameter: "recharge",
        name: "Jaw Lock",
        description: "扑上去一口咬住对手，然后双方都被钉在原地：咬合只结算一次，但谁也走不掉，直到任一方倒下或被外力拉开。死咬式锁得更久更牢、咬得稍轻；快咬式咬得更重、锁得短些。",
        uses: ["把关键目标钉住等队友来收", "用自己不动换对手动不了", "拦住想逃跑或突进的对手"],
        kind: "aim",
        range: 2.8,
        maxRange: 3.8,
        prepare: 9,
        active: 12,
        recover: 8,
        cooldown: 72,
        style: "jawlock",
        defaults: { vise: false, ai: { maxChase: 7, minSelf: 0.35, leaveStation: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["jawlock"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("jawlock", "tempo", context)),
                recover: Math.round(p("jawlock", "recover", context)),
                cooldown: Math.round(p("jawlock", "recharge", context)),
                active: skills["jawlock"].active,
                range: p("jawlock", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("jawlock:gather:" + action.id(), jawlockScene, 1, action.origin(),
                JSON.stringify({ moment: "gather",
                    maw: Math.max(8, Math.round(p("jawlock", "maw", action))) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["jawlock"], detail: { values: config } };
            return { radius: p("jawlock", "grip", context), geometry: "circle", style: "jawlock", color: 0x6E4A8C,
                label: config && config.vise === true ? "紧咬不放·死咬" : "紧咬不放" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selected = action.target();
            const target = selected !== null && world.valid(selected) && !world.friendly(selected)
                && String(selected.ref()) !== String(self.ref()) ? selected : null;
            const selfBody = world.observe(self);
            if (selfBody === null) { done(action); return; }
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() > 0.001 ? flat.unit() : aimed;
            const chomp = p("jawlock", "chomp", action);
            const lock = Math.max(120, Math.round(p("jawlock", "lockTicks", action)));
            const length = Math.max(1.8, p("jawlock", "reach", action));
            const grip = Math.max(1.4, p("jawlock", "grip", action));
            const step = Math.max(0.4, p("jawlock", "lunge", action));
            const maw = Math.max(8, Math.round(p("jawlock", "maw", action)));
            const radius = Math.max(0.3, Math.min(0.8, selfBody.width() * 0.5));
            const intensity = Math.max(0.6, Math.min(2, chomp / 42));
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, jawlockScene, 1, at, { moment: "miss", target: target === null ? "" : String(target.ref()) }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), jawMissText, [], 24);
                finish(current);
            }

            // 真正咬到第一个非友方：先结算伤害；伤害或束缚被拒时只留下这一口，不建立关系。
            function bite(current: CombatAction, contact: CombatImpact, victim: CombatActor): void {
                const scope = current.world();
                const at = contact.position();
                sound(current, "minecraft:entity.evoker_fangs.attack");
                const landed = impact(current, contact, "jawlock", chomp,
                    { damage: damageSpec("jawlock", "chomp"), contact: true, bite: true });
                if (!landed) { WorldFeedback.emit(scope, jawlockScene, 1, at, { moment: "miss", target: String(victim.ref()) }, 18); finish(current); return; }
                const lockedEffect = MobEffects.apply(scope, victim, jawLocked, lock, 0);
                const holdingEffect = lockedEffect === null ? null : MobEffects.apply(scope, self, jawHolding, lock, 0);
                if (lockedEffect === null || holdingEffect === null) {
                    // 免疫束缚：目标只吃这一口，术者也不单方面长锁——把可能已落下的载体收回。
                    if (lockedEffect !== null) scope.removeMobEffect(victim, jawLocked, lockedEffect.key());
                    WorldFeedback.emit(scope, jawlockScene, 1, at, { moment: "snap", target: String(victim.ref()), maw: maw, intensity: intensity }, 24);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), jawImmuneText, [], 24);
                    finish(current); return;
                }
                scope.stopMovement(victim);
                scope.stopMovement(self);
                // 锁效果与双方被钉的状态同时长：自然到期走 release，被拉开/一方倒下才走 break。
                scope.effect(jawGrip, victim, JSON.stringify({ caster: String(self.ref()), grip: grip, lock: lock, maw: maw, broken: false }), lock);
                WorldFeedback.emit(scope, jawlockScene, 1, at,
                    { moment: "lock", target: String(victim.ref()), maw: maw, grip: grip,
                        beats: Math.max(1, Math.min(6, Math.round(lock / 60))), intensity: intensity }, 28);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), jawLockText, [Math.round(lock / 20 * 10) / 10], 26);
                scope.sound("minecraft:block.chain.place", at, 16, "{}");
                finish(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const remaining = length - travelled;
                if (remaining <= 0.001) { whiff(current, current.origin()); return; }
                const delta = direction.scale(Math.min(step, remaining));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim) && String(victim.ref()) !== String(self.ref())) {
                        bite(current, hit, victim); return;
                    }
                    // 撞在非敌对象上：原地刹住，不建立关系。
                    whiff(current, hit.position()); return;
                }
                travelled += swept.moved;
                if (hit.blocked() || swept.moved < 0.04) { whiff(current, current.origin()); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
