/** Share your Ability with the selected Pokémon; a non-Pokémon instead has its movement speed pulled toward the caster's. */
namespace PokemonSkills {
    export const entrainmentScene = "world_combat:move_entrainment";
    export const entrainmentMark = "world_combat:entrainment";
    export const entrainmentSharedText = "world_combat.move.entrainment.text.shared";
    export const entrainmentSameText = "world_combat.move.entrainment.text.same";

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
    var entrainmentTrouble = ["wonderguard", "multiscale", "magicguard", "intimidate", "levitate", "flashfire", "waterabsorb",
        "voltabsorb", "sapsipper", "sturdy", "disguise", "thickfat", "filter", "regenerator", "immunity", "hydration", "overcoat"];
    export function entrainmentLiabilityAbility(ability: string): boolean { return entrainmentLiability.indexOf(ability) >= 0; }
    export function entrainmentWorthOverwriting(ability: string): boolean { return entrainmentTrouble.indexOf(ability) >= 0; }

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
            if (String(target.domain()) !== "cobblemon") return world.attributeValue(target, CombatCopies.speed) ? "" : "no-rhythm";
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
            function breakBeat(scope: CombatWorld, point: CombatPoint): void {
                WorldFeedback.emit(scope, entrainmentScene, 1, point,
                    { moment: "fizzle", target: String(actor.ref()), beats: beats, scale: scale }, 22);
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.35, 0)), entrainmentSameText, [], 34);
            }
            /** 拍子真正落到受术者身上才结算；被别的身体挡住或目标离场就断拍，不当成已经同步。 */
            function land(current: CombatAction, impact: CombatImpact): void {
                const scope = current.world(), foe = impact.target();
                const selfBody = scope.observe(current.actor());
                if (foe === null || !scope.valid(foe) || String(foe.ref()) !== chosen) {
                    breakBeat(scope, selfBody === null ? current.origin() : selfBody.position());
                    finish(current);
                    return;
                }
                const mine = entrainmentAbility(scope, current.actor());
                let shared = false;
                if (String(foe.domain()) === "cobblemon") {
                    const theirs = entrainmentAbility(scope, foe);
                    if (mine && entrainmentShareable(mine) && theirs && theirs !== mine && entrainmentReceivable(theirs)) {
                        NativeModifiers.apply(scope, foe, { ability: mine }, hold);
                        MobEffects.apply(scope, foe, entrainmentMark, hold, 0);
                        shared = true;
                    }
                } else {
                    const mineSpeed = scope.attributeValue(current.actor(), CombatCopies.speed);
                    const theirsSpeed = scope.attributeValue(foe, CombatCopies.speed);
                    if (mineSpeed !== null && theirsSpeed !== null) {
                        const from = theirsSpeed.value(), to = mineSpeed.value();
                        const wanted = Math.max(from * (1 - pull), Math.min(from * (1 + pull), from + (to - from) * blend));
                        if (Math.abs(wanted - from) > 0.0005) {
                            const carrier = MobEffects.apply(scope, foe, entrainmentMark, hold, 0);
                            if (carrier) {
                                const values: CombatCopies.Values = {};
                                values[CombatCopies.speed] = wanted;
                                CombatCopies.apply(scope, foe, values, hold, "entrainment", MobEffects.anchor(carrier));
                                shared = true;
                            }
                        }
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
                    WorldFeedback.text(scope, selfBody === null ? current.origin() : selfBody.position().plus(WorldCombat.point(0, 1.35, 0)), entrainmentSharedText, [], 40);
                } else {
                    breakBeat(scope, selfBody === null ? current.origin() : selfBody.position());
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
