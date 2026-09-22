/**
 * 找伙伴 / entrainment — 执行组织。
 *
 * 三幕：
 *   起（windup，提交前）：施法者踩出一段古怪的节拍，身体两侧荡开低密度音纹（`action.present` 预告，可被打断且不花代价）。
 *   行（提交后）：节拍沿施法者到目标的连线一节节亮起、推到目标身上（表现沿 `data.path` 的 polyline）。
 *   落（arrive）：节拍在目标处炸开；目标与波及半径内的敌人，只要特性读得出、能被顶替、又与自己不同，
 *     就被写入共享 NativeModifiers ability 层——变成施法者的特性（到期各自还原），并挂共享身份
 *     `world_combat:status/entrainment` 的标记。
 *
 * 目标可以是任何生物，但只有宝可梦有特性可被顶替；非宝可梦只会被节拍扫过并带上标记。
 * 双方都必须是宝可梦才读得出彼此的特性，`ready` 对非宝可梦直接拒绝，不浪费 PP。
 * 配置项 whole（全场节拍／贴身节拍）在 resolve 里改变冷却，公式里改变波及半径与维持时长。
 */
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
        name: "Entrainment",
        description: "踩出一段古怪的节拍逼对手跟着动，把对手的特性变成和自己的相同；节拍波及的敌人一起改变。",
        uses: ["把自己的负面特性塞给对手", "用普通特性顶掉对手的强力特性", "让围在身边的一圈敌人一起改特性"],
        kind: "enemy",
        range: 8,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 80,
        style: "rhythm",
        defaults: { whole: false, ai: { maxChase: 13, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["entrainment"], detail: { values: config } };
            return { radius: p("entrainment", "reach", context), geometry: "line", style: "rhythm", color: 0xE8C24A,
                label: config && config.whole === true ? "找伙伴 · 全场" : "找伙伴" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["entrainment"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const whole = !!(config && config.whole);
            return {
                prepare: Math.round(p("entrainment", "tempo", context)),
                recover: Math.round(p("entrainment", "aftercast", context)),
                cooldown: Math.round(p("entrainment", "recharge", context)) + (whole ? 16 : -10),
                active: 0,
                range: p("entrainment", "reach", context)
            };
        },
        ready: function (action) {
            const world = action.sense(), actor = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (String(actor.domain()) !== "cobblemon" || String(target.domain()) !== "cobblemon") return "no-ability";
            const body = world.observe(target);
            if (body === null) return "invalid-target";
            if (body.position().minus(action.origin()).length() > p("entrainment", "reach", action)) return "out-of-range";
            if (!world.clear(action.origin(), body.position())) return "no-line";
            const mine = entrainmentAbility(world, actor), theirs = entrainmentAbility(world, target);
            if (!mine) return "self-suppressed";
            if (!entrainmentShareable(mine)) return "self-locked";
            if (!theirs) return "target-suppressed";
            if (!entrainmentReceivable(theirs)) return "uncopyable";
            if (mine === theirs) return "already-same";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:entrainment:dance", entrainmentScene, 1, action.origin(), JSON.stringify({
                moment: "dance", beats: p("entrainment", "beats", action), whole: config && config.whole ? 1 : 0
            }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const body = world.observe(actor);
            if (target === null || !world.valid(target) || body === null) { done(action); return; }
            const whole = !!(config && config.whole);
            const velocity = p("entrainment", "velocity", action);
            const splash = Math.max(1.6, p("entrainment", "splash", action));
            const hold = Math.max(60, Math.round(p("entrainment", "hold", action)));
            const beats = Math.max(6, Math.round(p("entrainment", "beats", action)));
            const sway = Math.max(8, Math.round(p("entrainment", "sway", action)));
            const targetRef = String(target.ref());
            const path: (string | number[])[] = [String(actor.ref()), targetRef];
            const aimed = action.targetPosition().minus(body.position());
            const distance = Math.max(1, aimed.length());
            const delay = Math.max(2, Math.round(distance / Math.max(0.5, velocity)));
            const scale = splash / 3.2;
            const intensity = Math.max(0.7, Math.min(2, hold / 260));
            let settled = false;
            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }
            WorldFeedback.emit(world, entrainmentScene, 1, body.position(),
                { moment: "beat", target: targetRef, path: path, beats: beats, scale: scale, intensity: intensity }, delay + 44);
            action.after(delay, function (current) {
                const scope = current.world(), mine = entrainmentAbility(scope, current.actor());
                const foe = scope.actor(targetRef);
                let centre = current.targetPosition();
                if (foe !== null && scope.valid(foe)) {
                    const foeBody = scope.observe(foe);
                    if (foeBody !== null) centre = foeBody.position();
                }
                let shared = 0;
                if (mine && entrainmentShareable(mine)) {
                    WorldGeometry.selectEnemies(scope, WorldGeometry.ring(centre, 0, splash, { below: 2, above: 3 }),
                        function (other, facts) {
                            if (String(other.domain()) !== "cobblemon") return;
                            const theirs = entrainmentAbility(scope, other);
                            if (!theirs || theirs === mine || !entrainmentReceivable(theirs)) return;
                            NativeModifiers.apply(scope, other, { ability: mine }, hold);
                            MobEffects.apply(scope, other, entrainmentMark, hold, whole ? 1 : 0);
                            shared++;
                            WorldFeedback.emit(scope, entrainmentScene, 1, facts.position(),
                                { moment: "spread", target: String(other.ref()), path: [String(current.actor().ref()), String(other.ref())],
                                    sway: sway, scale: scale, intensity: intensity }, 32);
                        });
                }
                const spot = scope.observe(current.actor());
                if (spot !== null) {
                    WorldFeedback.emit(scope, entrainmentScene, 1, spot.position(),
                        { moment: shared > 0 ? "settle" : "fizzle", target: String(current.actor().ref()), path: path,
                            beats: beats, sway: sway, shared: shared, scale: scale, intensity: intensity }, 36);
                    WorldFeedback.text(scope, spot.position().plus(WorldCombat.point(0, 1.35, 0)),
                        shared > 0 ? entrainmentSharedText : entrainmentSameText, [shared], 40);
                }
                sound(current, shared > 0 ? "minecraft:block.note_block.bell" : "minecraft:block.amethyst_block.break");
                finish(current);
            });
            sound(action, "minecraft:block.note_block.pling");
        }
    });
}
