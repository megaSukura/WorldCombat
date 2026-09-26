/**
 * 魔法火焰 / mysticalfire —— 注册与动作。
 *
 * 核心念头：**吐出一枚会自己追上目标的魔法火团，让它绕目标盘成一圈炽焰、把特攻一点点抽走**——
 * 不是一记即走的远程，而是贴上去不放：火团追上先夺 1 级特攻，缠住期间每几刻再咬一口，
 * 缠满全程火焰一收、再抽 1 级。它是四式里唯一缠身的那个。
 *
 * 三幕：
 *   起（windup，提交前）：喉间收拢一枚火团、越收越亮（`action.present` 预告，不碰世界）。
 *   追（launch → hit）：提交后火团脱手，有敌人时朝它转向追踪；命中实际首敌时结算 `core`、
 *       `NativeEffects.boost(..., "spa", -1)` 一次，并按概率点燃；打在方块或没有敌人时只散火（fizzle）。
 *   缠（coil → siphon / slip）：命中后在该目标身上挂共享身份的状态载体，并建一个**独立托管效果**做缠火：
 *       每 `pulse` 刻结算一次 `coil`；目标离施放者超过 `leash` 立即 slip 断线、不再有后续；缠满则收束再抽 1 级特攻。
 *       状态被提前清除（牛奶、驱散）时，缠火同步解除。缠火跨过施放动作，属于托管效果，不锁住施放者。
 *
 * 选取 `kind: "aim"`：可直接点敌人追踪，也可只点方向／世界点空投；命中实际首敌后才建缠火，
 * `target` 为 null 时沿提交朝向飞出，不要求存在敌人。
 *
 * 配置 `linger`（黏焰式）由 resolve 改时序与射程、由公式改缠身与点燃：开启＝更慢更短、缠更久更疼更易点燃；
 * 关闭＝更快更远、一发更重。
 */
namespace PokemonSkills {
    const mysticalfireScene = "world_combat:move_mysticalfire";
    const mysticalfireWrap = "world_combat:mysticalfire_wrap";
    const mysticalfireBond = "world_combat:mysticalfire_bond";
    const mysticalfireWrapKey = "mysticalfire:wrap:";
    const mysticalfireSiphonText = "world_combat.move.mysticalfire.text.siphon";
    const mysticalfireSlipText = "world_combat.move.mysticalfire.text.slip";

    function mysticalfireBondData(json: string): string {
        const value = JSON.parse(json);
        ["coil", "pulse", "coilTicks", "leash", "finale", "wisps", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid mystical fire bond");
        });
        if (value.coilTicks < 1 || value.pulse < 1 || value.leash <= 0) throw new Error("Invalid mystical fire bond");
        if (!MobEffects.validAnchor(value.carrier)) throw new Error("Invalid mystical fire carrier");
        return JSON.stringify(value);
    }

    // 缠火：独立托管效果，在施放动作结束后继续。每刻把火圈贴到实际目标身上，按拍结算、缠满收束。
    WorldCombat.effect(mysticalfireBond, 1, 600, "actor", mysticalfireBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mysticalfireBond, "start", function (effect) {
        effect.schedule("coil", "coil", 1, "{}");
    });
    WorldCombat.effectHandler(mysticalfireBond, "coil", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        const at = world.observe(victim), me = world.observe(effect.source());
        if (at === null) { effect.end(); return; }
        // 施放者离场或目标跑出缠距：立即断线，不做后续 coil，也不给 finale。
        if (me === null || at.position().minus(me.position()).length() > data.leash) {
            data.reason = "slipped"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        data.elapsed = (data.elapsed || 0) + 1;
        if (data.elapsed % data.pulse === 0) {
            data.struck = (data.struck || 0) + 1;
            if (hurt(world, victim, "mysticalfire", data.coil, { damage: damageSpec("mysticalfire", "coil") }))
                WorldFeedback.emit(world, mysticalfireScene, 1, at.position(),
                    { moment: "coil", target: String(victim.ref()), wisps: data.wisps, scale: data.scale,
                        intensity: Math.max(0.4, Math.min(1.6, data.coil / 9)), struck: data.struck }, 20);
        }
        const progress = Math.max(0, Math.min(1, data.elapsed / data.coilTicks));
        // 火圈随进度合拢；快要完成时收得更紧，给玩家“要合拢了”的读数。
        WorldFeedback.onEffect(world, effect.id(), mysticalfireWrapKey + String(victim.ref()), mysticalfireScene, 1, at.position(),
            { moment: "wrap", target: String(victim.ref()), wisps: data.wisps, scale: data.scale,
                intensity: Math.max(0.4, Math.min(1.6, data.coil / 9)), ring: Math.max(0.22, 0.6 - 0.34 * progress),
                progress: progress, struck: data.struck || 0 });
        if (data.elapsed >= data.coilTicks) {
            NativeEffects.boost(world, victim, "spa", -data.finale);
            WorldFeedback.emit(world, mysticalfireScene, 1, at.position(),
                { moment: "siphon", target: String(victim.ref()), wisps: data.wisps, scale: data.scale, intensity: data.intensity }, 28);
            WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.3, 0)), mysticalfireSiphonText, [data.finale], 30);
            world.sound("cobblemon:impact.fire", at.position(), 16, "{}");
            data.reason = "finale"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        effect.state(JSON.stringify(data));
        effect.schedule("coil", "coil", 1, "{}");
    });
    WorldCombat.effectHandler(mysticalfireBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) return;
        // 只撤本绑定自己种下的载体；外部清除时它已不在，画面走 slip。
        if (data.carrier && MobEffects.matches(world, victim, data.carrier)) {
            const carrier = MobEffects.read(world, victim, mysticalfireWrap);
            if (carrier !== null) world.removeMobEffect(victim, mysticalfireWrap, carrier.key());
        }
        if (data.reason === "finale") return;
        const body = world.observe(victim);
        if (body === null) return;
        WorldFeedback.emit(world, mysticalfireScene, 1, body.position(),
            { moment: "slip", target: String(victim.ref()), wisps: data.wisps, scale: data.scale, intensity: 0.8 }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), mysticalfireSlipText, [], 24);
    });

    // 状态被提前清除（牛奶、/effect clear、别的招式）时，结束对应的缠火绑定。
    WorldCombat.on("world_combat:move_mysticalfire/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== mysticalfireWrap) return;
        const world = event.world(), victim = event.actor();
        if (!world.valid(victim)) return;
        const bonds = world.effects(victim, mysticalfireBond);
        for (let i = 0; i < bonds.length; i++) {
            let state: any;
            try { state = JSON.parse(String(bonds[i].data())); } catch (error) { state = null; }
            if (state === null || !state.carrier || !MobEffects.matches(world, victim, state.carrier))
                world.operation(bonds[i].id(), "world_combat:dispel", "{}");
        }
    });
    WorldCombat.effectHandler(mysticalfireBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "mysticalfire",
        name: "Mystical Fire",
        description: "向一个敌人（或自由方向／点）吐出一枚会追上目标的魔法火团：命中并造成伤害后夺走目标 1 级特攻、并可能点燃；火焰随后缠住目标，每隔几秒再咬一口，缠满全程再夺 1 级特攻。目标离施放者太远就会挣脱断线，缠火状态被提前清除时同步解除。黏焰式火团更慢更短、但缠得更久更疼更易点燃、蓄力与冷却略长；快速式火团更快更远。",
        uses: ["缠住一个高特攻目标，把它的特攻一层层抽走", "用会转向的火团追打爱走位的对手", "先手点燃，再贴身慢慢消耗"],
        kind: "aim",
        range: 9,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 32,
        style: "mystic",
        defaults: { linger: false, ai: { maxChase: 12, cutSpecial: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("mysticalfire", "wispRadius", pokemon), geometry: "line", style: "mystic",
                color: 0xE060C0, label: config && config.linger === true ? "黏焰魔法火焰" : "魔法火焰" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["mysticalfire"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const linger = !!(config && config.linger);
            return {
                prepare: Math.round(p("mysticalfire", "tempo", context)),
                recover: 8,
                cooldown: 32 + (linger ? 6 : 0),
                active: 0,
                range: p("mysticalfire", "wispRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:mysticalfire:" + action.id(), mysticalfireScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", linger: config && config.linger ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const power = p("mysticalfire", "core", action);
            const coilPower = p("mysticalfire", "coil", action);
            const speed = p("mysticalfire", "wispSpeed", action);
            const turn = Math.max(8, Math.round(p("mysticalfire", "wispTurn", action)));
            const reach = p("mysticalfire", "wispRange", action);
            const radius = p("mysticalfire", "wispRadius", action);
            const coilTicks = Math.max(20, Math.round(p("mysticalfire", "coilTicks", action)));
            const pulse = Math.max(4, Math.round(p("mysticalfire", "pulseTicks", action)));
            const leash = Math.max(4, p("mysticalfire", "leash", action));
            const burnChance = p("mysticalfire", "burnChance", action);
            const siphon = Math.max(1, Math.round(p("mysticalfire", "siphonStages", action)));
            const finale = Math.max(1, Math.round(p("mysticalfire", "finalStages", action)));
            const wisps = Math.max(10, Math.round(p("mysticalfire", "wisps", action)));
            const scale = Math.max(0.6, Math.min(2.2, reach / 9));
            const intensity = Math.max(0.5, Math.min(2.2, power / 70));
            const body = world.observe(action.actor());
            const origin = body === null ? action.origin() : body.position();
            const aimPoint = action.targetPosition();
            const delta = aimPoint.minus(origin);
            const direction = delta.length() < 0.05 ? action.direction().unit() : delta.unit();
            const tracking = target !== null && world.valid(target) && !world.friendly(target);
            const scenes = WorldFeedback.actionScenes(mysticalfireScene);
            let settled = false, landed = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            function buildBond(current: CombatAction, victim: CombatActor, at: CombatPoint): void {
                const scope = current.world();
                const carrierTicks = coilTicks + 20;
                if (!CombatStatus.apply(scope, victim, "mysticalfire", mysticalfireWrap, carrierTicks, 0, { unique: true })) return;
                const carrier = MobEffects.read(scope, victim, mysticalfireWrap);
                if (carrier === null) return;
                const state = { coil: coilPower, pulse: pulse, coilTicks: coilTicks, leash: leash, finale: finale,
                    wisps: wisps, scale: scale, intensity: intensity, elapsed: 0, struck: 0, reason: "",
                    carrier: MobEffects.anchor(carrier) };
                const bond = scope.effect(mysticalfireBond, victim, JSON.stringify(state), coilTicks + 40);
                WorldFeedback.onEffect(scope, bond, mysticalfireWrapKey + String(victim.ref()), mysticalfireScene, 1, at,
                    { moment: "wrap", target: String(victim.ref()), wisps: wisps, scale: scale, intensity: Math.max(0.4, Math.min(1.6, coilPower / 9)),
                        ring: 0.6, progress: 0, struck: 0 });
            }

            function onImpact(current: CombatAction, hit: CombatImpact): void {
                if (settled || landed) return;
                landed = true;
                scenes.stop(current, "cast");
                const scope = current.world(), victim = hit.target();
                if (victim === null) {
                    WorldFeedback.emit(scope, mysticalfireScene, 1, hit.position(), { moment: "fizzle" }, 16);
                    finish(current); return;
                }
                if (!scope.valid(victim) || scope.friendly(victim)) {
                    WorldFeedback.emit(scope, mysticalfireScene, 1, hit.position(), { moment: "fizzle" }, 16);
                    finish(current); return;
                }
                if (!impact(current, hit, "mysticalfire", power,
                    { damage: damageSpec("mysticalfire", "core"), status: "burn", chance: burnChance })) { finish(current); return; }
                const at = scope.observe(victim);
                if (at === null) { finish(current); return; }
                NativeEffects.boost(scope, victim, "spa", -siphon);
                WorldFeedback.emit(scope, mysticalfireScene, 1, at.position(),
                    { moment: "hit", target: String(victim.ref()), wisps: wisps, scale: scale, intensity: intensity }, 26);
                WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.3, 0)), mysticalfireSiphonText, [siphon], 28);
                scope.sound("cobblemon:impact.fire", at.position(), 16, "{}");
                buildBond(current, victim, at.position());
                finish(current);
            }

            const appearance: any = { sprite: "cobblemon:generic/fire/wisp", tint: 0xE060C0, glow: true,
                scale: Math.max(0.9, radius / 0.4) };
            if (tracking) appearance.homing = { target: String(target!.ref()), turn: turn, range: reach + 6 };
            sound(action, "cobblemon:move.flamethrower.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, gravity: 0, lifetime: 200, appearance: appearance,
                direction: direction,
                impact: function (current: CombatAction, hit: CombatImpact) { onImpact(current, hit); }
            }, function (current: CombatAction) {
                if (!landed) {
                    WorldFeedback.emit(current.world(), mysticalfireScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                    finish(current);
                }
            });
            scenes.show(action, "cast", origin,
                { moment: "cast", projectile: flight, target: tracking ? String(target!.ref()) : "", wisps: wisps, scale: scale, intensity: intensity });
        }
    });
}
