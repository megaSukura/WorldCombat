/**
 * 黑色目光 / meanlook — 执行组织。
 *
 * 核心念头：**用一条只靠视线维持的目光，把目标钉在原地——术者自己也得站在原地不动。**
 *
 * 三幕：
 *   起（windup，提交前）：术者眼里聚起黑光（只观察与预告，打断不花代价）。
 *   锁（lock，提交后）：命中活体且视线通畅时，起一个随动作存亡的 `world_combat:meanlook_lock`：
 *       它给目标挂上共享身份 `world_combat:status/trapped` 的 `world_combat:meanlook_gaze`（移动归零），
 *       随后每刻复查「目标还在 `leash` 之内、视线仍通畅」；任一条不成立就把锁标记为绷断并结束。
 *   断／松（snap / release）：术者被 `world_combat:interrupt`（畏缩类）打断、或自己松开技能键（持续输入停止），
 *       动作结束 → 动作存亡的锁随之结束 → 状态被精确移除，目标立刻恢复自由。
 *
 * 与同族分开：挡路在目标背后立实墙；蛛网缠在目标身上、怕火；黑色目光把术者自己钉成锁，术者一松劲就散。
 *
 * 玩家的输入形状是「按住技能键凝视」：`WorldCombat.preview` 声明持续输入（entity 步），
 *   松手即停；AI 侧不需要输入，动作按 `hold` 时长自然走完。
 *
 * 配置 `deep`（深凝视）由 resolve 改时序与射程，由公式改时长与绷断距离：锁得更久更牢但更慢更近。
 */
namespace PokemonSkills {
    const meanlookId = "meanlook";
    const meanlookScene = "world_combat:move_meanlook";
    const meanlookGaze = "world_combat:meanlook_gaze";
    const meanlookLock = "world_combat:meanlook_lock";
    const meanlookKey = "meanlook:beam:";
    const meanlookSnapText = "world_combat.move.meanlook.text.snap";
    const meanlookReleaseText = "world_combat.move.meanlook.text.release";
    const meanlookBlockedText = "world_combat.move.meanlook.text.blocked";
    const meanlookGripReference = 9.0;

    WorldCombat.effect(meanlookLock, 1, 400, "action", function (json: string): string {
        const value = JSON.parse(json);
        ["leash", "strands", "grip", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid mean look lock state");
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);

    function meanlookHeld(world: CombatWorld, actor: CombatActor, victim: CombatActor, data: any, ticks: number): void {
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.keep(world, meanlookKey + String(victim.ref()), meanlookScene, 1, body.position(),
            { moment: "hold", target: String(victim.ref()), path: [String(actor.ref()), String(victim.ref())],
                strands: data.strands, grip: data.grip, scale: data.scale, intensity: data.intensity }, ticks);
    }

    WorldCombat.effectHandler(meanlookLock, "start", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        MobEffects.apply(world, victim, meanlookGaze, 600, 0);
        const data = JSON.parse(effect.state());
        meanlookHeld(world, effect.source(), victim, data, 20);
    });
    WorldCombat.effectHandler(meanlookLock, "operation:world_combat:meanlook/snap", function (effect) {
        if (effect.caller().key() !== effect.source().key()) { effect.reject("effect-not-owned"); return; }
        const state = JSON.parse(effect.state());
        state.snapped = true; effect.state(JSON.stringify(state));
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) { effect.end(); return; }
        const body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        WorldFeedback.emit(world, meanlookScene, 1, body.position(), { moment: "snap", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), meanlookSnapText, [], 22);
        world.sound("minecraft:entity.enderman.teleport", body.position(), 12, "{}");
        effect.end();
    });
    WorldCombat.effectHandler(meanlookLock, "end", function (effect) {
        const world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        const gaze = MobEffects.read(world, victim, meanlookGaze);
        if (gaze !== null) world.removeMobEffect(victim, meanlookGaze, gaze.key());
        if (JSON.parse(effect.state()).snapped) return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, meanlookScene, 1, body.position(), { moment: "release", target: String(victim.ref()) }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), meanlookReleaseText, [], 22);
    });

    // 被盯住的目标动不了：导航速度归零（移动速度属性由状态效果自带）。
    WorldCombat.on("world_combat:move_meanlook/root", "world_combat:navigate", "", function (event) {
        if (MobEffects.read(event.world(), event.actor(), meanlookGaze) === null) return;
        const data = JSON.parse(String(event.data()));
        data.speed = 0;
        event.data(JSON.stringify(data));
    });

    define({
        id: meanlookId,
        name: "黑色目光",
        description: "用一道勾人心魂的黑色目光盯住一个看得见的对手，把它完全钉在原地：术者必须站定不动、一直凝视；一被掩体挡住、被拽开或被打断，目光就断、目标立刻恢复自由。按住技能键持续凝视，松手即停。",
        uses: ["把想逃跑的目标钉在原地等队友收", "锁住一个高机动目标不让它脱离近战", "在开阔地一对一拖住对方的主力"],
        kind: "enemy",
        range: 7,
        maxRange: 10,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 150,
        style: "gaze",
        stationary: true,
        turn: 15,
        defaults: { deep: false, ai: { maxChase: 10, catchRunners: true, leaveStation: false } },
        fields: [
            flag("deep", "深凝视")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[meanlookId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(meanlookId, "tempo", context)),
                recover: Math.round(p(meanlookId, "aftercast", context)),
                cooldown: Math.round(p(meanlookId, "recharge", context)),
                active: 1,
                range: p(meanlookId, "gazeRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_meanlook:windup", meanlookScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(meanlookId, "gazeRange"), geometry: "line", style: "gaze", color: 0x2A2140,
                label: config && config.deep === true ? "黑色目光·深凝视" : "黑色目光" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, meanlookScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                finish(action); return;
            }
            const selfBody = world.observe(self), body = world.observe(target);
            if (selfBody === null || body === null) { finish(action); return; }
            const victim = target;
            if (!world.clear(selfBody.position(), body.position())) {
                WorldFeedback.emit(world, meanlookScene, 1, body.position(), { moment: "blocked", target: String(target.ref()) }, 18);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), meanlookBlockedText, [], 24);
                finish(action); return;
            }
            const hold = Math.max(40, Math.round(p(meanlookId, "hold", action)));
            const leash = Math.max(2, p(meanlookId, "leash", action));
            const strands = Math.max(3, Math.round(p(meanlookId, "strands", action)));
            const grip = Math.max(4, p(meanlookId, "grip", action));
            const scale = Math.max(0.6, Math.min(2.4, grip / meanlookGripReference));
            const data = { leash: leash, strands: strands, grip: grip, scale: scale,
                intensity: Math.max(0.6, Math.min(2.2, strands / 6)) };
            const lock = action.effect(meanlookLock, victim, JSON.stringify(data), hold);
            WorldFeedback.emit(world, meanlookScene, 1, body.position(),
                { moment: "lock", target: String(victim.ref()), path: [String(self.ref()), String(victim.ref())],
                    strands: strands, grip: grip, scale: scale, intensity: data.intensity }, 30);
            sound(action, "minecraft:entity.enderman.stare");
            let age = 0;
            function watch(current: CombatAction): void {
                if (settled) return;
                const scope = current.world(), me = scope.observe(current.actor());
                if (!scope.valid(victim) || me === null) { finish(current); return; }
                const held = scope.observe(victim);
                if (held === null) { finish(current); return; }
                if (held.position().minus(me.position()).length() > leash || !scope.clear(me.position(), held.position())) {
                    if (lock > 0) current.effectOperation(lock, "world_combat:meanlook/snap", "{}");
                    finish(current); return;
                }
                age++;
                if (age % 4 === 0) meanlookHeld(scope, current.actor(), victim, data, 20);
                if (age >= hold) { finish(current); return; }
                current.after(1, watch);
            }
            watch(action);
        }
    });

    // 目标先由玩家选一个活物、按住技能键持续凝视；必须在动作注册之后声明。
    WorldCombat.preview("world_combat:meanlook", JSON.stringify({
        radius: 0.6, lineOfSight: true, input: { version: 1, steps: ["entity"], sustained: true }
    }));
}
