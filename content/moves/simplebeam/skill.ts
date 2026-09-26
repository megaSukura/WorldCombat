/**
 * 单纯光束 / simplebeam — 出手方式。
 *
 * 核心念头：先让对象变得单纯，之后它的能力等级变化全部翻倍——然后队友的强化、对手的降级都会被放大。
 *   敌友都可以指：给友方是接强化，给敌方是把它的自强化也一起放大（也可能反过来被我们利用）。
 *
 * 幕：
 *   聚（windup，提交前）：施法者面前聚起一束旋转的念头光，只观察与预告，可被打断且不花代价。
 *   发（beam，提交后）：光束沿视线一路打到对象头上。宝可梦的特性被写成共享 NativeModifiers ability 层（到期还原）；
 *     普通生物走共享的等级翻倍入口 `CombatStages.change`，期间任何能力等级变化翻倍。
 *   落（settle）：命中处两道环表示「后续变化 ×2」的倍率，并由一个独立托管效果持有贴身的单纯光环。
 *   闪光（surge）：真正有一次能力等级被放大落地时，才在它身上闪一下——等级没动就不闪。
 *   散／清：空点只是散束；改写到期时念头散去。
 *
 * 反制：特性带 cantsuppress、已经是单纯、或 truant 的宝可梦改不动（预检直接拒绝，不浪费 15 发 PP）。
 *   未知的 Boss 能力读不出就不冒充改写成功。瞄准是 kind:aim：只放开选择，不改写攻击权限。
 */

namespace PokemonSkills {
    export const simplebeamId = "simplebeam";
    export const simplebeamScene = "world_combat:move_simplebeam";
    export const simplebeamEffect = "world_combat:simple_beam";
    export const simplebeamAuraEffect = "world_combat:simple_beam_aura";
    export const simplebeamSimpleText = "world_combat.move.simplebeam.text.simple";
    export const simplebeamSpreadText = "world_combat.move.simplebeam.text.spread";
    export const simplebeamClearText = "world_combat.move.simplebeam.text.clear";
    export const simplebeamFizzleText = "world_combat.move.simplebeam.text.fizzle";
    export const simplebeamEmptyText = "world_combat.move.simplebeam.text.empty";

    // 普通生物没有原生 simple 特性：靠共享拦截点把实际等级变化翻倍。
    CombatStages.change.define({ id: "world_combat:move_simplebeam/native_stages", apply: function (context) {
        if (String(context.actor.domain()) !== "cobblemon" && MobEffects.read(context.world, context.actor, simplebeamEffect) !== null) context.amount *= 2;
    } });

    // 真正有一次能力等级被放大落地时才闪：读 after-before 的真实差值，等级没动不冒泡。
    CombatStages.changed.define({ id: "world_combat:move_simplebeam/surge", apply: function (change) {
        if (!change || !change.actor || !change.world || !CombatStatus.has(change.world, change.actor, "simplebeam")) return;
        const delta = Math.abs((change.after || 0) - (change.before || 0));
        if (!(delta > 0)) return;
        if (!change.world.valid(change.actor)) return;
        const body = change.world.observe(change.actor);
        if (body === null) return;
        try {
            WorldFeedback.emit(change.world, simplebeamScene, 1, body.position(),
                { moment: "surge", target: String(change.actor.ref()), amount: Math.min(6, delta),
                    scale: Math.max(0.6, Math.min(1.8, 0.6 + delta * 0.2)) }, 18);
        } catch (error) { }
    } });

    function simplebeamAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.3, 0)); }

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function simplebeamAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        return NativeEffects.ability(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
    }

    /** 目标特性是否还能被这道念波改简单：读得出、不是单纯、不是 truant、且允许被顶替。 */
    export function simplebeamReceivable(ability: string): boolean {
        return !!ability && ability !== "simple" && ability !== "truant" && !NativeAbilities.flag(ability, "cantsuppress");
    }

    // 单纯光环：与属性层同寿命的独立托管效果，自己持有贴身的双环标记；改写提前结束时一并收掉。
    WorldCombat.effect(simplebeamAuraEffect, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.target !== "string") throw new Error("Invalid simple beam aura: target");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(simplebeamAuraEffect, "start", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(target)) { effect.end(); return; }
        const body = world.observe(target);
        if (body === null) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "aura", simplebeamScene, 1, body.position(),
            { moment: "aura", target: String(target.ref()), rings: Math.max(4, Math.round(Number(data.rings) || 6)) });
    });
    WorldCombat.effectHandler(simplebeamAuraEffect, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function simplebeamReleaseAura(world: CombatWorld, target: CombatActor): void {
        const views = world.effects(target, simplebeamAuraEffect);
        for (let index = 0; index < views.length; index++) world.operation(views[index].id(), "world_combat:dispel", "{}");
    }

    // 改写到期：念头从目标身上散去；光环一并收掉。特性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_simplebeam/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== simplebeamEffect) return;
        const world = event.world(), target = event.actor();
        simplebeamReleaseAura(world, target);
        if (String(data.cause) !== "expired") return;
        if (!world.valid(target)) return;
        const body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, simplebeamScene, 1, body.position(), { moment: "clear", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, simplebeamAbove(body.position()), simplebeamClearText, [], 26);
    });

    define({
        id: simplebeamId,
        cooldownParameter: "recharge",
        name: "单纯光束",
        description: "使选中的对象暂时变得单纯，之后的能力等级提升和降低都会翻倍；可以给友方接强化，也可以给敌方改写。",
        uses: ["把对手的强力特性顶成一枚单纯", "封掉靠自身特性运转的打法", "给友方套上单纯，让后续强化与降级翻倍"],
        kind: "aim",
        range: 9,
        maxRange: 15,
        prepare: 7,
        active: 1,
        recover: 7,
        cooldown: 78,
        style: "beam",
        defaults: { wave: false },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[simplebeamId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(simplebeamId, "tempo", context)),
                recover: Math.round(p(simplebeamId, "aftercast", context)),
                cooldown: Math.round(p(simplebeamId, "recharge", context)),
                active: 1,
                range: p(simplebeamId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[simplebeamId], detail: { values: config } };
            return { radius: p(simplebeamId, "reach", context), geometry: "line", style: "beam", color: 0xB774E8,
                label: config && config.wave === true ? "单纯光束 · 扩散" : "单纯光束" };
        },
        ready: function (action, config) {
            const world = action.sense(), target = action.target();
            // 空点：没有对象就散束，直接允许。
            if (target === null) return action.targetPosition().minus(action.origin()).length() > action.range() ? "out-of-range" : "";
            if (!world.valid(target)) return "target-left";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > p(simplebeamId, "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (String(target.domain()) !== "cobblemon") return MobEffects.read(world, target, simplebeamEffect) ? "already-simple" : "";
            const ability = simplebeamAbility(world, target);
            if (!ability) return "no-ability";
            return simplebeamReceivable(ability) && NativeModifiers.abilitySuppressible(world, target) ? "" : "uncopyable";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_simplebeam:charge", simplebeamScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", rings: p(simplebeamId, "rings", action),
                    beam: p(simplebeamId, "beam", action),
                    wave: config && config.wave === true ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const scenes = WorldFeedback.actionScenes(simplebeamScene);
            const wave = !!(config && config.wave);
            const origin = self === null ? action.origin() : self.position();
            const at = target === null ? null : world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            const hold = Math.max(40, Math.round(p(simplebeamId, "hold", action)));
            const rings = Math.max(4, Math.round(p(simplebeamId, "rings", action)));
            const beam = Math.max(0.6, p(simplebeamId, "beam", action));
            const fan = Math.max(0, p(simplebeamId, "fan", action));
            const scale = Math.max(0.6, Math.min(1.9, beam / 0.9));
            const aimed = point.minus(origin);
            const direction = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            let shared = 0;

            function rewrite(other: CombatActor, primaryHit: boolean): boolean {
                if (!world.valid(other)) return false;
                const ability = simplebeamAbility(world, other);
                if (String(other.domain()) === "cobblemon") {
                    if (!simplebeamReceivable(ability) || !NativeModifiers.abilitySuppressible(world, other)) return false;
                    NativeModifiers.apply(world, other, { ability: "simple" }, hold);
                }
                MobEffects.apply(world, other, simplebeamEffect, hold, wave ? 1 : 0);
                simplebeamReleaseAura(world, other);
                world.effect(simplebeamAuraEffect, other, JSON.stringify({ target: String(other.ref()), rings: rings }), hold);
                const body = world.observe(other);
                if (body === null) return false;
                scenes.show(action, "settle:" + String(other.ref()), body.position(),
                    { moment: primaryHit ? "settle" : "spread", target: String(other.ref()), rings: rings,
                        beam: beam, fan: fan, scale: scale,
                        path: primaryHit ? undefined : [String(actor.ref()), String(other.ref())] });
                if (primaryHit) WorldFeedback.text(world, simplebeamAbove(body.position()), simplebeamSimpleText, [], 32);
                return true;
            }

            // 空点：没有对象就散束，不冒充成功。
            if (target === null || at === null) {
                scenes.show(action, "scatter", point, { moment: "scatter", path: [String(actor.ref()), simplebeamVertex(point)],
                    direction: [direction.x(), direction.y(), direction.z()], rings: rings, beam: beam, scale: scale });
                WorldFeedback.text(world, simplebeamAbove(point), simplebeamEmptyText, [], 26);
                sound(action, "cobblemon:move.psychic.actor");
                scenes.finish(action, done);
                return;
            }

            if (String(target.domain()) === "cobblemon" && !simplebeamReceivable(simplebeamAbility(world, target))) {
                scenes.show(action, "fizzle", point, { moment: "fizzle", target: String(target.ref()) });
                WorldFeedback.text(world, simplebeamAbove(point), simplebeamFizzleText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                scenes.finish(action, done);
                return;
            }

            rewrite(target, true);
            // 扩散只扫非友方：给友方单束时不会顺手把敌人也一起改写。
            if (wave && fan > 0 && !world.friendly(target)) {
                WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, fan, { below: 2, above: 3 }),
                    function (other) {
                        if (String(other.ref()) === String(target.ref())) return;
                        if (rewrite(other, false)) shared++;
                    });
            }
            scenes.show(action, "beam", origin,
                { moment: "beam", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                    direction: [direction.x(), direction.y(), direction.z()],
                    length: Math.max(1.5, aimed.length()), rings: rings, beam: beam, fan: fan, shared: shared, scale: scale });
            if (shared > 0) WorldFeedback.text(world, simplebeamAbove(point), simplebeamSpreadText, [shared + 1], 32);
            sound(action, "cobblemon:move.psychic.actor");
            world.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
            scenes.finish(action, done);
        }
    });

    function simplebeamVertex(point: CombatPoint): number[] { return [point.x(), point.y(), point.z()]; }
}
