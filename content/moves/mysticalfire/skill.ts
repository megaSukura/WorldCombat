/**
 * 魔法火焰 / mysticalfire —— 注册与动作。
 *
 * 核心念头：**吐出一枚会自己追上目标的魔法火团，让它绕目标盘成一圈炽焰、把特攻一点点抽走**——
 * 不是一记即走的远程，而是贴上去不放：火团追上先夺 1 级特攻，缠住期间每几刻再咬一口，
 * 缠满全程火焰一收、再抽 1 级。它是四式里唯一缠身的那个。
 *
 * 三幕：
 *   起（windup，提交前）：喉间收拢一枚火团、越收越亮（`action.present` 预告，不碰世界）。
 *   追（launch → hit）：提交后火团脱手，朝目标转向追踪；命中时结算 `core`、`NativeEffects.boost(..., "spa", -1)`
 *       并按概率点燃（`impact` 的 `status: "burn"`）。
 *   缠（coil → siphon / slip）：火焰绕目标盘 `coilTicks`，每 `pulseTicks` 刻结算一次 `coil`；
 *       目标跑出 `leash` 算挣脱（slip），缠满则收束再夺 1 级特攻（siphon）。
 *
 * 与同族分开：喷射火焰是一道自己变长的向前火舌；魔法火焰是会拐弯追上目标、绕身盘住不放的那一枚。
 *
 * 配置 `linger`（黏焰式）由 resolve 改时序与射程、由公式改缠身与点燃：开启＝更慢更短、缠更久更疼更易点燃；
 * 关闭＝更快更远、一发更重。
 */
namespace PokemonSkills {
    const mysticalfireScene = "world_combat:move_mysticalfire";
    const mysticalfireSiphonText = "world_combat.move.mysticalfire.text.siphon";
    const mysticalfireSlipText = "world_combat.move.mysticalfire.text.slip";

    define({
        id: "mysticalfire",
        name: "Mystical Fire",
        description: "吐出一枚会追上目标的魔法火团：命中时造成特殊伤害、夺走 1 级特攻，并可能点燃；火焰随后绕目标盘住，每几刻再咬一口，缠满全程再夺 1 级特攻。目标跑远会挣脱。黏焰式更慢更短、缠得更久更易点燃，快速式更快更远、一发更重。",
        uses: ["缠住一个高特攻目标，把它的特攻一层层抽走", "用会转向的火团追打爱走位的对手", "先手点燃再贴身消耗"],
        kind: "enemy",
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
            let settled = false, landed = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 火团命中后缠住目标：每 `pulse` 刻咬一口，缠满收束再抽一级，跑远则挣脱。 */
            function coil(current: CombatAction, victim: CombatActor): void {
                const body = current.world().observe(victim);
                if (body === null) { finish(current); return; }
                let elapsed = 0, struck = 0;
                function step(inner: CombatAction): void {
                    if (settled) return;
                    const scope = inner.world();
                    if (!scope.valid(victim)) { emitSlip(scope, inner, ""); finish(inner); return; }
                    const at = scope.observe(victim), me = scope.observe(inner.actor());
                    if (at === null || me === null) { finish(inner); return; }
                    if (at.position().minus(me.position()).length() > leash) {
                        emitSlip(scope, inner, String(victim.ref())); finish(inner); return;
                    }
                    elapsed++;
                    if (elapsed % pulse === 0) {
                        struck++;
                        hurt(scope, victim, "mysticalfire", coilPower, { damage: damageSpec("mysticalfire", "coil") });
                        WorldFeedback.emit(scope, mysticalfireScene, 1, at.position(),
                            { moment: "coil", target: String(victim.ref()), wisps: wisps, scale: scale,
                                intensity: Math.max(0.4, Math.min(1.6, coilPower / 9)), struck: struck }, 20);
                    }
                    WorldFeedback.keep(scope, "mysticalfire:coil:" + String(inner.id()), mysticalfireScene, 1, at.position(),
                        { moment: "wrap", target: String(victim.ref()), wisps: wisps, scale: scale,
                            intensity: Math.max(0.4, Math.min(1.6, coilPower / 9)) }, pulse + 4);
                    if (elapsed >= coilTicks) {
                        NativeEffects.boost(scope, victim, "spa", -finale);
                        WorldFeedback.emit(scope, mysticalfireScene, 1, at.position(),
                            { moment: "siphon", target: String(victim.ref()), wisps: wisps, scale: scale, intensity: intensity }, 28);
                        WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.3, 0)), mysticalfireSiphonText, [finale], 30);
                        sound(inner, "cobblemon:impact.fire");
                        finish(inner); return;
                    }
                    inner.after(1, step);
                }
                step(current);
            }

            function emitSlip(scope: CombatWorld, current: CombatAction, ref: string): void {
                const at = target !== null && scope.valid(target) ? scope.observe(target) : null;
                if (at === null) return;
                WorldFeedback.emit(scope, mysticalfireScene, 1, at.position(),
                    { moment: "slip", target: ref, wisps: wisps, scale: scale, intensity: 0.8 }, 22);
                WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.3, 0)), mysticalfireSlipText, [], 24);
            }

            function onImpact(current: CombatAction, hit: CombatImpact): void {
                if (settled || landed) return;
                const scope = current.world(), victim = hit.target();
                if (victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                landed = true;
                if (!impact(current, hit, "mysticalfire", power,
                    { damage: damageSpec("mysticalfire", "core"), status: "burn", chance: burnChance })) return;
                const at = scope.observe(victim);
                if (at === null) { finish(current); return; }
                NativeEffects.boost(scope, victim, "spa", -siphon);
                WorldFeedback.emit(scope, mysticalfireScene, 1, at.position(),
                    { moment: "hit", target: String(victim.ref()), wisps: wisps, scale: scale, intensity: intensity }, 26);
                WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.3, 0)),
                    "world_combat.move.mysticalfire.text.siphon", [siphon], 28);
                sound(current, "cobblemon:impact.fire");
                coil(current, victim);
            }

            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, mysticalfireScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                finish(action); return;
            }

            const appearance: any = { sprite: "cobblemon:generic/fire/wisp", tint: 0xE060C0, glow: true,
                scale: Math.max(0.9, radius / 0.4) };
            appearance.homing = { target: String(target.ref()), turn: turn, range: reach + 6 };
            sound(action, "cobblemon:move.flamethrower.actor");
            WorldFeedback.emit(world, mysticalfireScene, 1, action.origin(),
                { moment: "launch", target: String(target.ref()), wisps: wisps, scale: scale, intensity: intensity }, 22);
            LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, gravity: 0, lifetime: 200, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) { onImpact(current, hit); }
            }, function (current: CombatAction) { if (!landed) finish(current); });
        }
    });
}
