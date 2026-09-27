/** Share your Ability with the selected Pokémon; a non-Pokémon instead has its movement speed pulled toward the caster's. */
namespace PokemonSkills {
    export const entrainmentScene = "world_combat:move_entrainment";
    export const entrainmentMark = "world_combat:entrainment";
    export const entrainmentBeat = "world_combat:entrainment_beat";
    export const entrainmentSharedText = "world_combat.move.entrainment.text.shared";
    export const entrainmentSpeedText = "world_combat.move.entrainment.text.speed";
    export const entrainmentSameText = "world_combat.move.entrainment.text.same";
    export const entrainmentBlockedText = "world_combat.move.entrainment.text.blocked";
    export const entrainmentImmuneText = "world_combat.move.entrainment.text.immune";

    /** 一个战斗者当前生效的特性（含临时层与压制）；非宝可梦返回 ""。 */
    export function entrainmentAbility(world: CombatWorld, actor: CombatActor): string {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return "";
        return NativeEffects.ability(CobblemonCombat.pokemon(actor), NativeEffects.read(world, actor));
    }

    /** 自己的特性是否递得出去（原生 noentrain 是「不能被我方递给别人」的标记）。 */
    export function entrainmentShareable(ability: string): boolean {
        return !!ability && !NativeAbilities.flag(ability, "noentrain");
    }

    /** 目标特性是否接得住这段节拍：读得出、不是 truant、且允许被顶替。 */
    export function entrainmentReceivable(ability: string): boolean {
        return !!ability && ability !== "truant" && !NativeAbilities.flag(ability, "cantsuppress");
    }

    /** 只有把自己的特性递出去不亏、或对手的特性值得顶掉时才值得出手：这是 AI 的「有意义」判断。 */
    var entrainmentLiability = ["truant", "slowstart", "defeatist", "klutz", "cacophony", "normalize", "stall"];
    var entrainmenttrouble = ["wonderguard", "multiscale", "magicguard", "intimidate", "levitate", "flashfire", "waterabsorb",
        "voltabsorb", "sapsipper", "sturdy", "disguise", "thickfat", "filter", "regenerator", "immunity", "hydration", "overcoat"];
    export function entrainmentLiabilityAbility(ability: string): boolean { return entrainmentLiability.indexOf(ability) >= 0; }
    export function entrainmentWorthOverwriting(ability: string): boolean { return entrainmenttrouble.indexOf(ability) >= 0; }

    /**
     * 与本招实际结算同源的原生移动速度（minecraft:generic.movement_speed 属性），供 AI 比较；
     * 不用物种速度事实，普通生物与宝可梦按同一单位读。
     */
    export function entrainmentNativeSpeed(world: CombatWorld, actor: CombatActor): number | null {
        const value = world.attributeValue(actor, CombatCopies.speed);
        return value === null ? null : value.value();
    }

    /**
     * 持续节拍画面绑定在一个真正 own 的托管效果上：它观察目标身上本招标记的最新 carrier（id+key），
     * 标记到期、被牛奶/驱散清除或换新实例，watch 立即失去匹配并结束，不留失效锚与残留画面。
     */
    function entrainmentBindBeat(scope: CombatWorld, foe: CombatActor, mark: CombatMobEffect,
        hold: number, beats: number, sway: number, scale: number, intensity: number): void {
        const owner = String(scope.source().ref());
        scope.effects(foe, entrainmentBeat).forEach(function (view) {
            if (String(view.source().ref()) === owner) scope.operation(view.id(), "world_combat:dispel", "{}");
        });
        const ticks = mark.duration() < 0 ? hold : Math.max(1, Math.min(hold, mark.duration()));
        scope.effect(entrainmentBeat, foe,
            JSON.stringify({ id: mark.id(), key: mark.key(), beats: beats, sway: sway, scale: scale, intensity: intensity }), ticks);
    }

    WorldCombat.effect(entrainmentBeat, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.id !== "string" || typeof value.key !== "string") throw new Error("Invalid entrainment beat anchor");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    function entrainmentBeatPresent(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target(), state = JSON.parse(effect.state());
        const body = world.observe(target);
        if (body === null || !MobEffects.matches(world, target, state)) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_entrainment/beat/" + effect.id(), entrainmentScene, 1, body.position(),
            { moment: "hold", target: String(target.ref()), beats: state.beats, sway: state.sway, scale: state.scale, intensity: state.intensity });
        effect.schedule("watch", "watch", 2, "{}");
    }
    WorldCombat.effectHandler(entrainmentBeat, "start", entrainmentBeatPresent);
    WorldCombat.effectHandler(entrainmentBeat, "watch", entrainmentBeatPresent);
    WorldCombat.effectHandler(entrainmentBeat, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "entrainment",
        cooldownParameter: "recharge",
        name: "Entrainment",
        description: "把一段节拍送到一个明确选中的对象身上：宝可梦的特性会暂时变成施放者的；普通生物的移动速度则被朝施放者当前的速度拉近，改变幅度有上限。只作用于这一个对象。",
        uses: ["把自己的负面特性塞给对手", "用普通特性顶掉对手的强力特性", "把强特性或速度节奏传给一个伙伴"],
        kind: "aim",
        range: 8,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 80,
        style: "rhythm",
        defaults: { snap: false, ai: { maxChase: 13, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["entrainment"], detail: { values: config } };
            return { radius: p("entrainment", "reach", context), geometry: "line", style: "rhythm", color: 0xE8C24A,
                label: config && config.snap === true ? "找伙伴 · 紧拍" : "找伙伴" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["entrainment"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("entrainment", "tempo", context)),
                recover: Math.round(p("entrainment", "aftercast", context)),
                cooldown: Math.round(p("entrainment", "recharge", context)),
                active: 0,
                range: p("entrainment", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target)) return "invalid-target";
            if (String(target.key()) === String(actor.key())) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            if (body.position().minus(action.origin()).length() > action.range()) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            if (String(target.domain()) !== "cobblemon") {
                // 普通生物用与执行同一条原生 movement_speed 属性比较；同速/净变化为零直接拒绝无收益刷新。
                const mineSpeed = entrainmentNativeSpeed(world, actor);
                const theirsSpeed = entrainmentNativeSpeed(world, target);
                if (mineSpeed === null || theirsSpeed === null) return "no-rhythm";
                const pull = Math.max(0.05, Math.min(1, p("entrainment", "pull", action)));
                const blend = Math.max(0.05, Math.min(1, p("entrainment", "blend", action)));
                const wanted = Math.max(theirsSpeed * (1 - pull), Math.min(theirsSpeed * (1 + pull),
                    theirsSpeed + (mineSpeed - theirsSpeed) * blend));
                return Math.abs(wanted - theirsSpeed) > 0.0005 ? "" : "no-rhythm";
            }
            if (String(actor.domain()) !== "cobblemon") return "no-ability";
            const mine = entrainmentAbility(world, actor), theirs = entrainmentAbility(world, target);
            if (!mine) return "self-suppressed";
            if (!entrainmentShareable(mine)) return "self-locked";
            if (!theirs) return "target-suppressed";
            if (!entrainmentReceivable(theirs)) return "uncopyable";
            if (mine === theirs) return "already-same";
            return "";
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            const path = target === null ? [String(action.actor().ref())] : [String(action.actor().ref()), String(target.ref())];
            action.present("world_combat:entrainment:dance", entrainmentScene, 1, action.origin(), JSON.stringify({
                moment: "dance", path: path, beats: p("entrainment", "beats", action), snap: config && config.snap ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null || String(target.key()) === String(actor.key())) { done(action); return; }
            const velocity = p("entrainment", "velocity", action);
            const hold = Math.max(60, Math.round(p("entrainment", "hold", action)));
            const beats = Math.max(6, Math.round(p("entrainment", "beats", action)));
            const sway = Math.max(8, Math.round(p("entrainment", "sway", action)));
            const blend = Math.max(0.05, Math.min(1, p("entrainment", "blend", action)));
            const pull = Math.max(0.05, Math.min(1, p("entrainment", "pull", action)));
            const chosen = String(target.ref());
            const aimed = action.targetPosition().minus(body.position());
            const direction = aimed.length() < 0.01 ? action.direction() : aimed.unit();
            const scale = Math.max(0.6, Math.min(1.8, beats / 10));
            const intensity = Math.max(0.7, Math.min(2, hold / 260));
            let settled = false;
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            /** 断拍：分清拦截 / 同速 / 免改，不再一律报「已经相同」。 */
            function breakBeat(scope: CombatWorld, point: CombatPoint, key: string): void {
                WorldFeedback.emit(scope, entrainmentScene, 1, point,
                    { moment: "fizzle", target: String(actor.ref()), beats: beats, scale: scale }, 22);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.35, 0)), key, [], 34);
            }
            /** 拍子真正落到受术者身上、且真实层写入成功才结算；被别的身体/墙挡住或目标离场就断拍。 */
            function land(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), foe = impact.target();
                const selfBody = scope.observe(current.actor());
                if (foe === null || !scope.valid(foe) || String(foe.ref()) !== chosen) {
                    breakBeat(scope, selfBody === null ? current.origin() : selfBody.position(),
                        impact.blocked() ? entrainmentBlockedText : entrainmentSameText);
                    finish(current);
                    return;
                }
                const mine = entrainmentAbility(scope, current.actor());
                let shared = false, sharedText = entrainmentSharedText, sharedArgs: any[] = [], failText = entrainmentSameText;
                if (String(foe.domain()) === "cobblemon") {
                    const theirs = entrainmentAbility(scope, foe);
                    const shareable = !!mine && entrainmentShareable(mine);
                    const receivable = !!theirs && entrainmentReceivable(theirs);
                    if (!shareable || !receivable) failText = entrainmentImmuneText;
                    if (shareable && receivable && theirs !== mine) {
                        // 先申请标记载体，再让能力层用同一 carrier 锚定；只有真实层写入成功才 shared。
                        const mark = MobEffects.apply(scope, foe, entrainmentMark, hold, 0);
                        if (mark !== null) {
                            const layer = NativeModifiers.apply(scope, foe, { ability: mine, carrier: MobEffects.anchor(mark) }, hold);
                            const applied = layer > 0 && scope.effects(foe, "cobblemon_world_combat:modifier").some(function (view) { return view.id() === layer; });
                            if (applied) {
                                shared = true;
                                // 显示真正送出去的特性名。
                                sharedArgs = [{ key: "cobblemon.ability." + mine, fallback: mine }];
                                entrainmentBindBeat(scope, foe, mark, hold, beats, sway, scale, intensity);
                            } else {
                                scope.removeMobEffect(foe, mark.id(), mark.key());
                                failText = entrainmentImmuneText;
                            }
                        } else {
                            failText = entrainmentImmuneText;
                        }
                    }
                } else {
                    sharedText = entrainmentSpeedText;
                    const mineSpeed = entrainmentNativeSpeed(scope, current.actor());
                    const theirsSpeed = entrainmentNativeSpeed(scope, foe);
                    if (mineSpeed !== null && theirsSpeed !== null) {
                        const from = theirsSpeed, to = mineSpeed;
                        const wanted = Math.max(from * (1 - pull), Math.min(from * (1 + pull), from + (to - from) * blend));
                        if (Math.abs(wanted - from) > 0.0005) {
                            const mark = MobEffects.apply(scope, foe, entrainmentMark, hold, 0);
                            if (mark !== null) {
                                const values: CombatCopies.Values = {};
                                values[CombatCopies.speed] = wanted;
                                // equalize 拒绝（原生属性范围/斜率挡下）就撤标记，不谎报同步。
                                const layer = CombatCopies.equalize(scope, foe, values, hold, "entrainment", MobEffects.anchor(mark));
                                if (layer > 0) {
                                    shared = true;
                                    sharedArgs = [wanted > from
                                        ? { key: "world_combat.move.entrainment.text.faster" }
                                        : { key: "world_combat.move.entrainment.text.slower" }];
                                    entrainmentBindBeat(scope, foe, mark, hold, beats, sway, scale, intensity);
                                } else {
                                    scope.removeMobEffect(foe, mark.id(), mark.key());
                                    failText = entrainmentImmuneText;
                                }
                            } else {
                                failText = entrainmentImmuneText;
                            }
                        }
                    } else {
                        failText = entrainmentImmuneText;
                    }
                }
                const foeBody = scope.observe(foe);
                if (shared) {
                    // 两端脚边同频短环：一边在受术者，一边在施术者，表示两边踩到了同一条拍子上。
                    if (foeBody !== null)
                        WorldFeedback.emit(scope, entrainmentScene, 1, foeBody.position(),
                            { moment: "sync", target: String(foe.ref()), path: [chosen, String(current.actor().ref())], beats: beats, sway: sway, scale: scale, intensity: intensity }, 32);
                    if (selfBody !== null)
                        WorldFeedback.emit(scope, entrainmentScene, 1, selfBody.position(),
                            { moment: "sync", target: String(current.actor().ref()), path: [String(current.actor().ref()), chosen], beats: beats, sway: sway, scale: scale, intensity: intensity }, 32);
                    WorldFeedback.text(scope, selfBody === null ? current.origin() : selfBody.position().plus(WorldCombat.point(0, 1.35, 0)), sharedText, sharedArgs, 40);
                } else {
                    breakBeat(scope, selfBody === null ? current.origin() : selfBody.position(), failText);
                }
                sound(current, shared ? "minecraft:block.note_block.bell" : "minecraft:block.amethyst_block.break");
                finish(current);
            }
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/note", scale: Math.max(0.6, scale), tint: 0xE8C24A,
                hitAllies: true, homing: { target: chosen, turn: 8, delay: 0, range: action.range() }
            };
            const flight = LivingActions.projectile(action, {
                speed: velocity, range: action.range(), radius: Math.max(0.3, 0.35 * scale), lifetime: 120,
                direction: direction, appearance: appearance, impact: land
            }, finish);
            WorldFeedback.emit(world, entrainmentScene, 1, body.position(),
                { moment: "beat", projectile: flight, target: chosen, path: [String(actor.ref()), chosen], beats: beats, scale: scale, intensity: intensity }, 40);
            sound(action, "minecraft:block.note_block.pling");
        }
    });
}
