/** Temporarily make the target Simple, doubling subsequent stat-stage gains and losses. Wave mode also affects nearby enemies. */

namespace PokemonSkills {
    export const simplebeamId = "simplebeam";
    export const simplebeamScene = "world_combat:move_simplebeam";
    export const simplebeamEffect = "world_combat:simple_beam";
    export const simplebeamSimpleText = "world_combat.move.simplebeam.text.simple";
    export const simplebeamSpreadText = "world_combat.move.simplebeam.text.spread";
    export const simplebeamClearText = "world_combat.move.simplebeam.text.clear";
    export const simplebeamFizzleText = "world_combat.move.simplebeam.text.fizzle";

    CombatStages.change.define({ id: "world_combat:move_simplebeam/native_stages", apply: function (context) {
        if (String(context.actor.domain()) !== "cobblemon" && MobEffects.read(context.world, context.actor, simplebeamEffect) !== null) context.amount *= 2;
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

    // 改写到期：念头从目标身上散去。特性层随效果同寿命自动还原。
    WorldCombat.on("world_combat:move_simplebeam/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== simplebeamEffect) return;
        if (String(data.cause) !== "expired") return;
        const world = event.world(), target = event.actor();
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
        description: "使目标暂时变得单纯，之后的能力等级提升和降低都会翻倍；扩散模式还能波及附近敌人。",
        uses: ["把对手的强力特性顶成一枚单纯", "封掉靠自身特性运转的打法", "扩散档一次扫掉围上来的一圈特性"],
        kind: "enemy",
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
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";

            const body = world.observe(target);
            if (body === null) return "invalid-target";
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
            const self = world.observe(actor), at = target === null ? null : world.observe(target);
            if (target === null || !world.valid(target) || self === null || at === null) { done(action); return; }
            const wave = !!(config && config.wave);
            const point = at.position();
            const origin = self.position();
            const hold = Math.max(40, Math.round(p(simplebeamId, "hold", action)));
            const rings = Math.max(4, Math.round(p(simplebeamId, "rings", action)));
            const beam = Math.max(0.6, p(simplebeamId, "beam", action));
            const fan = Math.max(0, p(simplebeamId, "fan", action));
            const scale = Math.max(0.6, Math.min(1.9, beam / 0.9));
            const primary = simplebeamAbility(world, target);
            const aimed = point.minus(origin);
            const direction = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            const path: (string | number[])[] = [String(actor.ref()), String(target.ref())];

            function rewrite(other: CombatActor, primaryHit: boolean): boolean {
                if (!world.valid(other)) return false;
                const ability = simplebeamAbility(world, other);
                if (String(other.domain()) === "cobblemon") {
                    if (!simplebeamReceivable(ability) || !NativeModifiers.abilitySuppressible(world, other)) return false;
                    NativeModifiers.apply(world, other, { ability: "simple" }, hold);
                }
                MobEffects.apply(world, other, simplebeamEffect, hold, wave ? 1 : 0);
                const body = world.observe(other);
                if (body === null) return false;
                if (primaryHit) {
                    WorldFeedback.emit(world, simplebeamScene, 1, body.position(),
                        { moment: "settle", target: String(other.ref()), rings: rings, beam: beam, scale: scale }, 30);
                    WorldFeedback.text(world, simplebeamAbove(body.position()), simplebeamSimpleText, [], 32);
                } else {
                    WorldFeedback.emit(world, simplebeamScene, 1, body.position(),
                        { moment: "spread", target: String(other.ref()), path: [String(actor.ref()), String(other.ref())],
                            rings: Math.max(3, Math.round(rings / 2)), beam: beam, scale: scale }, 26);
                }
                return true;
            }

            if (String(target.domain()) === "cobblemon" && !simplebeamReceivable(primary)) {
                WorldFeedback.emit(world, simplebeamScene, 1, point, { moment: "fizzle", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, simplebeamAbove(point), simplebeamFizzleText, [], 28);
                sound(action, "minecraft:block.amethyst_block.break");
                done(action);
                return;
            }
            let shared = 0;
            rewrite(target, true);
            if (wave && fan > 0) WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, fan, { below: 2, above: 3 }),
                function (other) {
                    if (String(other.ref()) === String(target.ref())) return;
                    if (rewrite(other, false)) shared++;
                });
            WorldFeedback.emit(world, simplebeamScene, 1, origin,
                { moment: "beam", target: String(target.ref()), path: path, direction: [direction.x(), direction.y(), direction.z()],
                    length: Math.max(1.5, aimed.length()), rings: rings, beam: beam, fan: fan, shared: shared, scale: scale }, 34);
            if (shared > 0) WorldFeedback.text(world, simplebeamAbove(point), simplebeamSpreadText, [shared + 1], 32);
            sound(action, "cobblemon:move.psychic.actor");
            world.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
            done(action);
        }
    });
}
