/**
 * 剧毒牙 / poisonfang 的出手方式。
 *
 * 核心念头：**咬开伤口、把毒液注进去**——本族里咬得最轻、最准的一口，没有畏缩，卖的完全是那管毒。
 * 独有部分在**注毒**：咬中不立刻发作，隔 `pump` 刻毒液才在伤口里渗开；若伤口本来就带着毒，这一口会确保把它加深成剧毒。
 *
 * 两幕：
 *   起（windup，提交前）：牙面挂起毒滴、毒雾绕口打转，只播预告表现。
 *   咬（pounce → bite）：提交后沿瞄准方向扑出；trace 咬中即结算 fang 接触咬合，命中点炸开毒色迸溅与獠牙剪影。
 *   灌（venom）：咬中后隔 `pump` 刻，毒液在伤口里渗开：掷中 toxicChance（或目标已中毒）则加重为剧毒
 *       （共享身份 world_combat:status/toxic），否则留下普通中毒。
 *
 * 配置 `venom`（浓毒式）由 resolve 改时序、由公式改威力／毒液，提交后才触碰世界。
 * 它没有畏缩，因此没有 flinch 载体与门禁。
 */
namespace PokemonSkills {
    const poisonfangScene = "world_combat:move_poisonfang";
    const poisonfangHitText = "world_combat.move.poisonfang.text.hit";
    const poisonfangToxicText = "world_combat.move.poisonfang.text.toxic";
    const poisonfangVenomText = "world_combat.move.poisonfang.text.venom";
    const poisonfangImmuneText = "world_combat.move.poisonfang.text.immune";
    const poisonfangMissText = "world_combat.move.poisonfang.text.miss";

    define({
        freeMovement: true,
        id: "poisonfang",
        cooldownParameter: "recharge",
        name: "Poison Fang",
        description: "咬伤目标并注入毒液，随后有几率使其中剧毒。目标已经中毒时必定加深毒效。浓毒式强化毒效，快毒式强化咬击。",
        uses: ["用最轻最准的一口给目标注毒", "把已经中毒的目标加深成剧毒", "给厚血目标挂上持久的掉血"],
        kind: "enemy",
        range: 2.3,
        maxRange: 3.4,
        prepare: 5,
        active: 26,
        recover: 6,
        cooldown: 15,
        style: "bite",
        defaults: { venom: false, ai: { maxChase: 8, deepenExisting: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("poisonfang", "grip", pokemon) : 0.40) * 1.5, geometry: "line", style: "bite",
                color: 0x9BE86B, label: config && config.venom === true ? "浓毒式" : "剧毒牙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["poisonfang"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(3, Math.round(p("poisonfang", "tempo", context))),
                recover: Math.max(3, Math.round(p("poisonfang", "aftercast", context))),
                cooldown: Math.max(9, Math.round(p("poisonfang", "recharge", context))),
                active: skills["poisonfang"].active,
                range: p("poisonfang", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:poisonfang:windup", poisonfangScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", venom: config && config.venom === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const direction = aim(action);
            const length = p("poisonfang", "reach", action);
            const step = p("poisonfang", "lunge", action);
            const radius = p("poisonfang", "grip", action);
            const power = p("poisonfang", "fang", action);
            const toxicChance = Math.max(0.05, Math.min(0.95, p("poisonfang", "toxicChance", action)));
            const venomTicks = Math.max(200, Math.round(p("poisonfang", "venomTicks", action)));
            const pump = Math.max(2, Math.round(p("poisonfang", "pump", action)));
            const drops = Math.max(6, Math.round(p("poisonfang", "drops", action)));
            const scale = radius / 0.40;
            const intensity = Math.max(0.5, Math.min(2.2, power / 54));
            let travelled = 0, settled = false;

            WorldFeedback.emit(world, poisonfangScene, 1, action.origin(),
                { moment: "pounce", direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 24);
            sound(action, "minecraft:entity.fox.bite");

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction, at: CombatPoint): void {
                const scope = current.world();
                WorldFeedback.emit(scope, poisonfangScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), poisonfangMissText, [], 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                finish(current);
            }

            /** 毒液在伤口里渗开：目标已中毒则确保加深为剧毒，否则掷 toxicChance 决定剧毒还是普通中毒。 */
            function venom(current: CombatAction, victimRef: string, at: CombatPoint): void {
                const scope = current.world();
                const victim = scope.actor(victimRef);
                if (victim === null || !scope.valid(victim)) { finish(current); return; }
                const body = scope.observe(victim);
                const here = body === null ? at : body.position();
                const already = CombatStatus.has(scope, victim, "poison");
                const heavy = already || scope.random() < toxicChance;
                const landed = CombatStatus.inflict(scope, victim, heavy ? "toxic" : "poison", venomTicks, 0, { secondary: true });
                WorldFeedback.emit(scope, poisonfangScene, 1, here,
                    { moment: "venom", target: victimRef, drops: drops, scale: scale, intensity: intensity,
                        toxic: heavy ? 1 : 0 }, 24);
                WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.15, 0)),
                    landed ? (heavy ? poisonfangToxicText : poisonfangVenomText) : poisonfangImmuneText, [], 24);
                sound(current, "cobblemon:impact.poison");
                finish(current);
            }

            function latch(current: CombatAction, victim: CombatActor, at: CombatPoint, contact: CombatImpact): void {
                const scope = current.world();
                const victimRef = String(victim.ref());
                const landed = impact(current, contact, "poisonfang", power,
                    { damage: damageSpec("poisonfang", "fang"), contact: true, bite: true });
                WorldFeedback.emit(scope, poisonfangScene, 1, at,
                    { moment: "bite", target: victimRef, drops: drops, scale: scale, intensity: intensity }, 24);
                sound(current, "cobblemon:impact.poison");
                if (!landed || !scope.valid(victim)) { finish(current); return; }
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), poisonfangHitText, [], 22);
                current.after(pump, function (next: CombatAction) { venom(next, victimRef, at); });
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const origin = current.origin();
                const remaining = length - travelled;
                const delta = direction.scale(Math.min(step, Math.max(0, remaining)));
                if (remaining <= 0.001) { whiff(current, origin); return; }
                const hit = current.trace(origin, origin.plus(delta.scale(p("poisonfang", "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) { latch(current, target, hit.position(), hit); return; }
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p("poisonfang", "minimumMove", current) || travelled >= length) { whiff(current, origin); return; }
                current.after(1, advance);
            }

            advance(action);
        }
    });
}
