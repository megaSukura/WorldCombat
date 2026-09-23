/**
 * 紧咬不放 / jawlock —— 注册与动作。
 *
 * 核心念头：一口咬住对手，**然后谁也别想走**。施法者扑上去咬合一次（不像贝壳夹击那样每跳磨），
 *   咬中的一刹那双方都被钉在原地：咬的人嘴还咬着、被咬的人被牙钉住。对峙一直持续到任一方倒下，
 *   或有人被外力把两者拉开 `grip` 格以外。这份「互相钉住」的承诺就是它的代价——施法者也不能走。
 *
 * 幕：
 *   起（windup，提交前）：压低身、张颚的预告（`action.present`，可被打断、不花 PP）。
 *   咬（bite，提交后）：朝目标补上一步，够到 `reach` 以内就结算一次 `chomp` 物理伤害（contact+bite）。
 *   锁（lock → hold）：给目标挂 `world_combat:jaw_locked`、给自己挂 `world_combat:jaw_holding`
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
        WorldFeedback.keep(world, "jawlock:hold:" + String(effect.id()), jawlockScene, 1, mid,
            { moment: "hold", path: [String(caster.ref()), String(victim.ref())], target: String(victim.ref()), maw: data.maw, grip: data.grip }, 12);
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
        kind: "enemy",
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
                JSON.stringify({ moment: "gather", vise: config && config.vise === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["jawlock"], detail: { values: config } };
            return { radius: p("jawlock", "grip", context), geometry: "circle", style: "jawlock", color: 0x6E4A8C,
                label: config && config.vise === true ? "紧咬不放·死咬" : "紧咬不放" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            const selfBody = world.observe(self);
            if (selfBody === null || target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, jawlockScene, 1, selfBody === null ? action.origin() : selfBody.position(), { moment: "miss" }, 18);
                done(action); return;
            }
            const victim = world.observe(target);
            if (victim === null) { WorldFeedback.emit(world, jawlockScene, 1, selfBody.position(), { moment: "miss" }, 18); done(action); return; }
            const chomp = p("jawlock", "chomp", action);
            const lock = Math.max(120, Math.round(p("jawlock", "lockTicks", action)));
            const reach = Math.max(1.8, p("jawlock", "reach", action));
            const grip = Math.max(1.4, p("jawlock", "grip", action));
            const lunge = Math.max(0, p("jawlock", "lunge", action));
            const maw = Math.max(8, Math.round(p("jawlock", "maw", action)));
            const from = selfBody.position(), to = victim.position();
            const delta = to.minus(from), distance = delta.length();
            if (distance > 0.9 && lunge > 0.05) world.displace(self, delta.unit().scale(Math.min(lunge, distance - 0.9)));
            const settled = world.observe(self);
            const gap = settled === null ? distance : settled.position().minus(to).length();
            if (gap > reach) {
                WorldFeedback.emit(world, jawlockScene, 1, to, { moment: "miss", target: String(target.ref()) }, 18);
                WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), jawMissText, [], 24);
                done(action); return;
            }
            sound(action, "minecraft:entity.evoker_fangs.attack");
            hurt(action, target, "jawlock", chomp, { damage: damageSpec("jawlock", "chomp"), contact: true, bite: true });
            if (!world.valid(target)) { done(action); return; }
            MobEffects.apply(world, target, jawLocked, lock, 0);
            MobEffects.apply(world, self, jawHolding, lock, 0);
            world.stopMovement(target);
            world.stopMovement(self);
            world.effect(jawGrip, target, JSON.stringify({ caster: String(self.ref()), grip: grip, lock: lock, maw: maw, broken: false }), lock + 40);
            WorldFeedback.emit(world, jawlockScene, 1, to,
                { moment: "lock", target: String(target.ref()), maw: maw, grip: grip, lock: lock, intensity: Math.max(0.6, Math.min(2, chomp / 42)) }, 28);
            WorldFeedback.text(world, to.plus(WorldCombat.point(0, 1.1, 0)), jawLockText, [Math.round(lock / 20 * 10) / 10], 26);
            world.sound("minecraft:block.chain.place", to, 16, "{}");
            done(action);
        }
    });
}
