/**
 * 剧毒牙 / poisonfang 的出手方式。
 *
 * 核心念头：**短咬咬住、压一小拍到毒进去**——本族里咬得最轻、最准的一口，没有畏缩，卖的完全是那管毒；
 * 不扑不冲，合牙的一刻就在口边结算，毒是否注得进去要看目标还留不留在口边。
 *
 * 两幕：
 *   起（windup，提交前）：牙面挂起毒滴、毒雾绕口打转，只播预告表现。
 *   咬（bite）：提交后朝瞄准方向做一段真实短 trace；第一个碰到的人或墙就是这一口合上的地方，
 *       命中非友方即结算 fang 接触咬合，命中点炸开毒色迸溅与獠牙剪影。空咬、咬到友方或先撞墙都不注入。
 *   灌（venom / drip）：咬中后隔 `pump` 刻，毒液在伤口里渗开：掷中 toxicChance（或目标已中毒）则加重为剧毒
 *       （共享身份 world_combat:status/toxic），否则普通中毒。注毒时目标必须仍在口边且通视；
 *       挣脱或移开则无毒、毒滴落空，首咬伤已结算保留。
 *
 * 配置 `venom`（浓毒式）由公式改威力／毒液与注毒延迟，提交后才触碰世界。
 * 它没有畏缩，因此没有 flinch 载体与门禁。
 */
namespace PokemonSkills {
    const poisonfangScene = "world_combat:move_poisonfang";
    const poisonfangHitText = "world_combat.move.poisonfang.text.hit";
    const poisonfangToxicText = "world_combat.move.poisonfang.text.toxic";
    const poisonfangVenomText = "world_combat.move.poisonfang.text.venom";
    const poisonfangImmuneText = "world_combat.move.poisonfang.text.immune";
    const poisonfangDripText = "world_combat.move.poisonfang.text.drip";
    const poisonfangMissText = "world_combat.move.poisonfang.text.miss";

    define({
        freeMovement: true,
        id: "poisonfang",
        cooldownParameter: "recharge",
        name: "Poison Fang",
        description: "贴身短咬一口并注入毒液，随后有几率使其中剧毒。目标已经中毒时必定加深毒效。毒液在咬后压一小拍才渗开，届时目标必须还在口边且通视，挣脱则毒滴落空、首咬伤保留。浓毒式强化毒效，快毒式强化咬击。",
        uses: ["用最轻最准的一口给近敌注毒", "把已经中毒的目标加深成剧毒", "给厚血目标挂上持久的掉血"],
        kind: "aim",
        range: 2.1,
        maxRange: 3.2,
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
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const direction = aim(action);
            const radius = p("poisonfang", "grip", action);
            const power = p("poisonfang", "fang", action);
            const toxicChance = Math.max(0.05, Math.min(0.95, p("poisonfang", "toxicChance", action)));
            const venomTicks = Math.max(200, Math.round(p("poisonfang", "venomTicks", action)));
            const pump = Math.max(2, Math.round(p("poisonfang", "pump", action)));
            const drops = Math.max(6, Math.round(p("poisonfang", "drops", action)));
            const scale = radius / 0.40;
            const intensity = Math.max(0.5, Math.min(2.2, power / 54));
            const from = self.position();
            const end = from.plus(direction.scale(action.range()));

            // 自由短方向咬：从口边朝瞄准方向做一段真实短 trace，最先碰到的人或墙才是这一口合上的地方。
            const contact = action.trace(from, end, radius, true);
            const target = contact.target();
            const victim = contact.hitEntity() && target !== null && world.valid(target)
                && String(target.ref()) !== String(actor.ref()) && !world.friendly(target) ? target : null;

            if (victim === null) {
                const at = contact.hitEntity() || contact.blocked() ? contact.position() : end;
                WorldFeedback.emit(world, poisonfangScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), poisonfangMissText, [], 20);
                sound(action, "minecraft:entity.player.attack.sweep");
                done(action);
                return;
            }

            const at = contact.position();
            const victimRef = String(victim.ref());
            const landed = impact(action, contact, "poisonfang", power,
                { damage: damageSpec("poisonfang", "fang"), contact: true, bite: true });
            WorldFeedback.emit(world, poisonfangScene, 1, at,
                { moment: "bite", target: victimRef, drops: drops, scale: scale, intensity: intensity }, 24);
            sound(action, "cobblemon:impact.poison");
            if (!landed || !world.valid(victim)) { done(action); return; }
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), poisonfangHitText, [], 22);
            action.after(pump, function (next: CombatAction) { venom(next, victimRef, at); });

            /** 毒液在伤口里渗开：目标必须仍在口边（咬程之内）且通视；挣脱或移开则无毒、毒滴落空，首咬伤已结算保留。 */
            function venom(next: CombatAction, ref: string, bitePoint: CombatPoint): void {
                const scope = next.world();
                const marked = scope.actor(ref);
                if (marked === null || !scope.valid(marked)) { done(next); return; }
                const body = scope.observe(marked);
                const here = body === null ? bitePoint : body.position();
                const source = scope.observe(next.actor());
                const mouth = source === null ? next.origin() : source.position();
                if (here.minus(mouth).length() > next.range() + 0.3 || !scope.clear(mouth, here)) {
                    WorldFeedback.emit(scope, poisonfangScene, 1, bitePoint,
                        { moment: "drip", target: ref, drops: drops, scale: scale, intensity: intensity }, 20);
                    WorldFeedback.text(scope, bitePoint.plus(WorldCombat.point(0, 1.0, 0)), poisonfangDripText, [], 22);
                    done(next);
                    return;
                }
                const already = CombatStatus.has(scope, marked, "poison");
                const heavy = already || scope.random() < toxicChance;
                const landed = CombatStatus.inflict(scope, marked, heavy ? "toxic" : "poison", venomTicks, 0, { secondary: true });
                WorldFeedback.emit(scope, poisonfangScene, 1, here,
                    { moment: "venom", target: ref, drops: drops, scale: scale, intensity: intensity, toxic: heavy ? 1 : 0 }, 24);
                WorldFeedback.text(scope, here.plus(WorldCombat.point(0, 1.15, 0)),
                    landed ? (heavy ? poisonfangToxicText : poisonfangVenomText) : poisonfangImmuneText, [], 24);
                sound(next, "cobblemon:impact.poison");
                done(next);
            }
        }
    });
}
