/**
 * 胃液 / gastroacid：从真实的muzzle吐出一枚慢速酸弹，命中处溅开酸滴并挂上一层酸膜。
 *
 * 酸膜对所有活体一视同仁：护甲被蚀薄（稀酸 -25%、浓酸 -50%），每 40 刻受 1 点残留酸伤；宝可梦若有可压制的
 * 特性，再附一层抑制（不可压制只让抑制缺席，绝不否决整招）。弹道起点、瞄准与射程视线都用同一个muzzle；
 * 飞行结束在真实弹点（命中用接触点，飞尽用原生最后位置）。新旧酸膜替换时，新膜先落地取到新 key，旧绑定
 * 才被撤下，因此旧清理不会误删新膜。薄/浓膜的区别由厚度与滴落率承担，不只换颜色。
 */
namespace PokemonSkills {
    export const gastroacidScene = "world_combat:move_gastroacid";
    export const gastroacidEffect = "world_combat:gastroacid";
    export const gastroacidSealText = "world_combat.move.gastroacid.text.sealed";
    export const gastroacidCoatText = "world_combat.move.gastroacid.text.coated";
    const gastroacidReferenceRadius = 0.3;

    /** 把目标的特性压制 hold 刻；目标不是宝可梦或不可压制时返回 false，且不拒绝整招。 */
    function gastroacidSeal(world: CombatWorld, target: CombatActor, hold: number, carrier: MobEffects.Anchor): boolean {
        if (String(target.domain()) !== "cobblemon" || !world.valid(target)) return false;
        if (!NativeModifiers.abilitySuppressible(world, target)) return false;
        NativeModifiers.apply(world, target, { suppressAbility: true, carrier: carrier, source: "world_combat:gastroacid" }, hold);
        return true;
    }

    /**
     * 酸膜对所有活体都有可观察作用：护甲被蚀薄、残留酸伤按同一份预算结算；宝可梦若有可压制特性则另有抑制。
     * 只有真正什么都作用不到（不可压制、免疫间接伤害且没有护甲）才返回 false，供合法性判断与 AI 使用。
     */
    export function gastroacidCanAct(world: CombatWorld, target: CombatActor): boolean {
        if (!world.valid(target)) return false;
        if (String(target.domain()) !== "cobblemon") return true;
        if (NativeModifiers.abilitySuppressible(world, target)) return true;
        const pokemon = CobblemonCombat.pokemon(target), state = NativeEffects.read(world, target), ability = NativeEffects.ability(pokemon, state);
        if (!NativeAbilities.flag(ability, "indirectImmune")) return true;
        const armor = world.attributeValue(target, "minecraft:generic.armor");
        return armor !== null && armor.value() > 0;
    }

    const gastroacidBond = "world_combat:gastroacid_bond";
    WorldCombat.effect(gastroacidBond, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(gastroacidBond, "start", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target), data = JSON.parse(effect.state());
        if (body === null) { effect.end(); return; }
        // The suppression layer owns a Pokemon's native carrier; the acid bond owns ordinary bodies' carrier.
        if (String(target.domain()) !== "cobblemon") data.lease = MobEffects.bind(world, target, gastroacidEffect);
        effect.state(JSON.stringify(data));
        // 薄/浓膜的区别由滴落率与厚度承担：浓酸挂得更密、滴得更急，而不是只换颜色。
        const thick = data.thick === 1;
        WorldFeedback.onEffect(world, effect.id(), "film", gastroacidScene, 1, body.position(), {
            moment: "coat", target: String(target.ref()), thick: data.thick || 0,
            filmRate: thick ? 8 : 4, dripRate: thick ? 5 : 2, drops: data.drops || 12, scale: data.scale || 1 });
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
        // 同一份残留酸伤预算对宝可梦与普通生物一致；宝可梦由 residual 内部的间接伤害免疫规则自行筛选。
        PokemonDamage.residual(world, target, "gastroacid", 1);
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
        description: "酸弹命中后留下胃酸：所有活物的护甲被蚀薄并持续受到少量酸蚀伤害；宝可梦若有可压制的特性，该特性同时被压制。",
        uses: ["定点拆掉对手的强力特性", "压制飘浮、厚脂肪一类持续生效的特性"],
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
            // 射程与视线从真正吐出酸液的muzzle算起，与 execute 传给弹道的起点一致。
            const self = world.observe(action.actor());
            const from = self === null ? action.origin() : self.position().plus(WorldCombat.point(0, self.height() * 0.6, 0));
            if (body.position().minus(from).length() > p("gastroacid", "reach", action)) return "out-of-range";
            if (!world.clear(from, body.position())) return "no-line";
            if (CombatStatus.has(world, target, "gastroacid")) return "already-coated";
            // 合法性以酸膜能否实际作用为准：不可压制特性不再否决整招，护甲／残留仍可蚀。
            if (!gastroacidCanAct(world, target)) return "no-effect";
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
            let settled = false, landed: CombatPoint | null = null, projectile = "";
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                // 结束在真实弹点：命中用接触点；飞尽用原生保留的最后位置，绝不拿满射程点或发射点假造。
                const end = landed !== null ? landed : current.world().projectilePosition(projectile);
                WorldFeedback.emit(current.world(), gastroacidScene, 1, end !== null ? end : current.origin(),
                    { moment: "settle", target: targetRef, drops: drops, scale: scale }, 24);
                done(current);
            }
            function corrode(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), target = impact.target(), point = impact.position();
                landed = point;
                if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                    // 新膜先落地并取到新 key；被原生拒绝时保留旧膜，不先误清。
                    const applied = MobEffects.set(scope, target, gastroacidEffect, hold, thickness ? 1 : 0);
                    if (applied === null) { finish(current); return; }
                    const anchor = MobEffects.anchor(applied), sealed = gastroacidSeal(scope, target, hold, anchor);
                    // 确认新承载成立后再撤旧绑定，旧 lease 已因新 key 失效，不会误删新膜。
                    scope.effects(target, gastroacidBond).forEach(effect => scope.operation(effect.id(), "world_combat:dispel", "{}"));
                    scope.effect(gastroacidBond, target, JSON.stringify({ carrier: anchor, thick: thickness ? 1 : 0, drops: drops, scale: scale }), hold);
                    const at = scope.observe(target);
                    if (at !== null) {
                        WorldFeedback.emit(scope, gastroacidScene, 1, at.position(),
                            { moment: "corrode", target: String(target.ref()), drops: drops, thick: thickness ? 1 : 0,
                                thickDrops: thickness ? 16 : 0, intensity: intensity, scale: scale }, 32);
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
                origin: from, direction: base,
                appearance: { sprite: "cobblemon:particle/generic/goo/acidsplash", scale: Math.max(0.7, scale),
                    tint: 0x9BE049, homing: targetRef === "" ? undefined : { target: targetRef, turn: 5, delay: 1, range: action.range() } },
                impact: corrode
            }, finish);
            projectile = flight;
            WorldFeedback.emit(world, gastroacidScene, 1, from,
                { moment: "spit", projectile: flight, bubbles: bubbles, drops: drops, scale: scale, intensity: intensity }, 40);
            sound(action, "minecraft:entity.llama.spit");
        }
    });
}
