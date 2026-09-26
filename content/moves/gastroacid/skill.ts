/** gastroacid：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    export const gastroacidScene = "world_combat:move_gastroacid";
    export const gastroacidEffect = "world_combat:gastroacid";
    export const gastroacidSealText = "world_combat.move.gastroacid.text.sealed";
    export const gastroacidCoatText = "world_combat.move.gastroacid.text.coated";
    const gastroacidReferenceRadius = 0.3;

    /** 把目标的特性压制 hold 刻；目标不可压制时返回 false。 */
    function gastroacidSeal(world: CombatWorld, target: CombatActor, hold: number, carrier: MobEffects.Anchor): boolean {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return false;
        if (!NativeModifiers.abilitySuppressible(world, target)) return false;
        NativeModifiers.apply(world, target, { suppressAbility: true, carrier: carrier, source: "world_combat:gastroacid" }, hold);
        return true;
    }

    const gastroacidBond = "world_combat:gastroacid_bond";
    WorldCombat.effect(gastroacidBond, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(gastroacidBond, "start", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target), data = JSON.parse(effect.state());
        if (body === null) { effect.end(); return; }
        // The suppression layer owns a Pokemon's native carrier; the acid bond owns ordinary bodies' carrier.
        if (String(target.domain()) !== "cobblemon") data.lease = MobEffects.bind(world, target, gastroacidEffect);
        effect.state(JSON.stringify(data));
        WorldFeedback.onEffect(world, effect.id(), "film", gastroacidScene, 1, body.position(), { moment: "coat", target: String(target.ref()) });
        effect.schedule("watch", "watch", 1, "{}");
        effect.schedule("pulse", "pulse", 40, "{}");
    });
    WorldCombat.effectHandler(gastroacidBond, "watch", effect => {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target) || !MobEffects.matches(world, target, data.carrier)) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(gastroacidBond, "pulse", effect => {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target) || !MobEffects.matches(world, target, data.carrier)) { effect.end(); return; }
        if (String(target.domain()) !== "cobblemon") PokemonDamage.residual(world, target, "gastroacid", 1);
        effect.schedule("pulse", "pulse", 40, "{}");
    });
    WorldCombat.effectHandler(gastroacidBond, "operation:world_combat:dispel", effect => effect.end());
    PokemonDamage.onDamageApplied("world_combat:gastroacid/residual", receipt => {
        const fact = WorldFeedback.receipt(receipt.event);
        if (fact === null || !(fact.actual > 0)) return;
        WorldFeedback.emit(receipt.world, gastroacidScene, 1, fact.point,
            { moment: "sting", target: String(receipt.target.ref()) }, 12);
    }, { move: "gastroacid", segment: "residual" });

    define({
        id: "gastroacid",
        cooldownParameter: "recharge",
        name: "Gastro Acid",
        description: "酸弹命中后留下胃酸，暂时压制宝可梦特性。普通生物和玩家的护甲会被蚀薄，并持续受到少量酸蚀伤害。",
        uses: ["定点拆掉对手的强力特性", "压制威吓、飘浮一类持续生效的特性"],
        kind: "aim",
        range: 9,
        maxRange: 17,
        prepare: 10,
        active: 0,
        recover: 7,
        cooldown: 80,
        style: "acid",
        defaults: { thick: false, ai: { maxChase: 16, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["gastroacid"], detail: { values: config } };
            return { radius: p("gastroacid", "reach", context), geometry: "line", style: "acid", color: 0x9BE049, label: "胃液" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["gastroacid"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const thick = !!(config && config.thick);
            return {
                prepare: Math.round(p("gastroacid", "tempo", context)),
                recover: Math.round(p("gastroacid", "aftercast", context)),
                cooldown: Math.round(p("gastroacid", "recharge", context)) + (thick ? 22 : -12),
                active: 0,
                range: p("gastroacid", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), target = action.target();
            if (target === null) return "";
            if (!world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("gastroacid", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (CombatStatus.has(world, target, "gastroacid")) return "already-coated";
            if (String(target.domain()) === "cobblemon" && !NativeModifiers.abilitySuppressible(world, target)) return "no-effect";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:gastroacid:gather", gastroacidScene, 1, action.origin(), JSON.stringify({
                moment: "gather", bubbles: p("gastroacid", "bubbles", action),
                thick: config && config.thick ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const thickness = !!(config && config.thick);
            const velocity = p("gastroacid", "velocity", action);
            const radius = Math.max(0.15, p("gastroacid", "radius", action));
            const hold = Math.max(40, Math.round(p("gastroacid", "hold", action)));
            const drops = Math.max(8, Math.round(p("gastroacid", "drops", action)));
            const bubbles = Math.max(6, Math.round(p("gastroacid", "bubbles", action)));
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            const body = world.observe(actor);
            const from = body === null ? action.origin() : body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0));
            const aimed = action.targetPosition().minus(from);
            const base = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            const scale = radius / gastroacidReferenceRadius;
            const intensity = Math.max(0.7, Math.min(2, hold / 200));
            let settled = false;
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                WorldFeedback.emit(current.world(), gastroacidScene, 1, current.origin(),
                    { moment: "settle", target: targetRef, drops: drops }, 24);
                done(current);
            }
            function corrode(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), target = impact.target(), point = impact.position();
                if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                    const applied = MobEffects.apply(scope, target, gastroacidEffect, hold, thickness ? 1 : 0);
                    if (applied === null) { finish(current); return; }
                    const anchor = MobEffects.anchor(applied), sealed = gastroacidSeal(scope, target, hold, anchor);
                    scope.effects(target, gastroacidBond).forEach(effect => scope.operation(effect.id(), "world_combat:dispel", "{}"));
                    scope.effect(gastroacidBond, target, JSON.stringify({ carrier: anchor }), hold);
                    const at = scope.observe(target);
                    if (at !== null) {
                        WorldFeedback.emit(scope, gastroacidScene, 1, at.position(),
                            { moment: "corrode", target: String(target.ref()), drops: drops, thick: thickness ? 1 : 0,
                                intensity: intensity, scale: scale }, 32);
                        WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.2, 0)),
                            sealed ? gastroacidSealText : gastroacidCoatText, [], 34);
                    }
                }
                WorldFeedback.emit(scope, gastroacidScene, 1, point,
                    { moment: "splash", drops: drops, scale: scale, intensity: intensity }, 26);
                sound(current, "minecraft:entity.generic.splash");
                finish(current);
            }
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: radius, lifetime: 160,
                direction: base,
                appearance: { sprite: "cobblemon:particle/generic/goo/acidsplash", scale: Math.max(0.7, scale),
                    tint: 0x9BE049, homing: targetRef === "" ? undefined : { target: targetRef, turn: 5, delay: 1, range: action.range() } },
                impact: corrode
            }, finish);
            WorldFeedback.emit(world, gastroacidScene, 1, from,
                { moment: "spit", projectile: flight, bubbles: bubbles, scale: scale, intensity: intensity }, 40);
            sound(action, "minecraft:entity.llama.spit");
        }
    });
}
