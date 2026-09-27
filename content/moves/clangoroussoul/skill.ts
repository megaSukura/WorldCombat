/**
 * 魂舞烈音爆 / clangoroussoul 的出手方式。
 *
 * 念头的形状（两幕 + 逐拍结算）：
 *  1) 起势——站定仰首，脚下的声波光环向内收束（windup 预告，可被打断，此时代价未结清）。
 *  2) 逐拍——提交后每一拍先核实五項里至少一项还能再升，再用原生自付入口 `world.payHealth` 付一次准确比例的生命；
 *     实际支付为正（含 0<paid<1 的部分支付）才把攻击、防御、特攻、特防、速度各抬一级（`NativeEffects.boost`），
 *     并按五项真实 delta 报告这一拍；生命不足以支付下一拍、或五项都已到顶时提前收势。
 *  3) 收势——唱完后一段余韵；被打断则舞停下，已获得的等级保留。
 *
 * 与同族的甩肉分开：这是慢工出细活的分拍仪式、抬全部五项、有声音；甩肉是一刀、只抬进攻三项、无声音。
 */
namespace PokemonSkills {
    const clangorousScene = "world_combat:move_clangoroussoul";
    const clangorousSigilScene = "world_combat:move_clangoroussoul_sigils";
    const clangorousBeatText = "world_combat.move.clangoroussoul.text.beat";
    const clangorousClimaxText = "world_combat.move.clangoroussoul.text.climax";
    const clangorousWeakText = "world_combat.move.clangoroussoul.text.weak";
    const clangorousRaiseText = "world_combat.move.clangoroussoul.text.raise";

    /** 本招抬的五项；起势、逐拍兑现与 AI 收益评估共用同一份顺序。 */
    export const clangorousStats = ["atk", "def", "spa", "spd", "spe"];

    /** 这五项里还能再升一级的项数（有效等级未到 +6）。 */
    function clangorousBoostable(world: CombatWorld, actor: CombatActor): number {
        let count = 0;
        for (let index = 0; index < clangorousStats.length; index++)
            if (NativeEffects.effectiveStage(world, actor, clangorousStats[index]) < 6) count++;
        return count;
    }

    define({
        id: "clangoroussoul",
        name: "Clangorous Soul",
        description: "踏着一支越唱越烈的战舞，逐拍燃烧自己的生命，把攻击、防御、特攻、特防、速度一起提高；血不足时舞会提前收势，被打断时已经抬起的等级会留下。",
        uses: ["开战前站定起舞，把全部五项拉起来", "在对手还在接近的窗口里叠起一张全能底牌", "生命充裕时用血换一次全面压制"],
        kind: "self",
        range: 3,
        prepare: 12,
        active: 30,
        recover: 10,
        cooldown: 84,
        style: "sound",
        defaults: { extended: false, ai: { reserveHealth: 0.2, maxChase: 20 } },
        fields: [ field(pathOf("extended"), "连唱", "boolean") ],
        indicator: function (config) { return { radius: 4, geometry: "area", style: "sound", color: 0xC79AF0, label: "魂舞" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["clangoroussoul"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const extended = !!(config && config.extended);
            return {
                prepare: p("clangoroussoul", "prepare", context) + (extended ? 4 : 0),
                recover: p("clangoroussoul", "recover", context),
                cooldown: p("clangoroussoul", "cooldown", context) + (extended ? 12 : 0),
                range: 3
            };
        },
        ready: function (action, config) {
            const world = action.sense(), body = world.observe(action.actor());
            if (body === null) return "target-left";
            if (clangorousBoostable(world, action.actor()) === 0) return "no-benefit";
            const reserve = config && config.ai && config.ai.reserveHealth !== undefined ? Number(config.ai.reserveHealth) : 0.2;
            const need = body.maxHealth() * (p("clangoroussoul", "costPerBeat", action) + reserve);
            return body.health() <= need ? "insufficient-health" : "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_clangoroussoul:windup", clangorousScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", scale: 1 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const beats = Math.max(1, Math.round(p("clangoroussoul", "beats", action)));
            const cost = p("clangoroussoul", "costPerBeat", action);
            const rise = p("clangoroussoul", "rise", action);
            const interval = Math.max(1, Math.round(p("clangoroussoul", "interval", action)));
            const radius = p("clangoroussoul", "pulseRadius", action);
            const reserve = config && config.ai && config.ai.reserveHealth !== undefined ? Number(config.ai.reserveHealth) : 0.2;
            let index = 0;

            function beat(current: CombatAction): void {
                const body = world.observe(actor);
                if (body === null) { done(current); return; }
                // 先核实至少一项实际可提升：一项都升不了就不白付生命。
                if (clangorousBoostable(world, actor) === 0) {
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), clangorousWeakText, [], 26);
                    done(current);
                    return;
                }
                if (body.health() <= body.maxHealth() * (cost + reserve)) {
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), clangorousWeakText, [], 26);
                    done(current);
                    return;
                }
                // 每一拍用原生自付入口结清代价（减伤不替代价打折）；实际支付为正就兑现，0<paid<1 也是真支付。
                const due = body.maxHealth() * cost;
                const paid = due > 0 ? current.world().payHealth(due, "world_combat:clangoroussoul_cost") : 0;
                if (!(paid > 0)) { done(current); return; }
                let gained = 0, raised = 0;
                const lit: number[] = [];
                for (let stat = 0; stat < clangorousStats.length; stat++) {
                    const delta = NativeEffects.boost(world, actor, clangorousStats[stat], rise);
                    lit.push(delta !== 0 ? 1 : 0);
                    if (delta !== 0) { gained += delta; raised++; }
                }
                const climax = index === beats - 1;
                WorldFeedback.emit(world, clangorousScene, 1, body.position(),
                    { moment: climax && beats > 1 ? "climax" : "beat", radius: radius, intensity: (index + 1) / beats,
                        beat: index + 1, beats: beats, raised: raised, gained: gained }, 30);
                // 五向符号逐拍拍在施法者周围，亮暗按这一拍五项真实 delta。
                WorldFeedback.emit(world, clangorousSigilScene, 1, body.position(),
                    { start: world.tick(), duration: climax && beats > 1 ? 34 : 24, lit: lit, raised: raised, gained: gained,
                        beat: index + 1, beats: beats }, 34);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)),
                    climax && beats > 1 ? clangorousClimaxText : clangorousBeatText, [index + 1, beats], 26);
                if (raised > 0)
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), clangorousRaiseText, [gained, raised], 26);
                world.sound(index === 0 ? "cobblemon:move.sing.actor" : climax ? "cobblemon:move.nastyplot.actor_2" : "cobblemon:move.nastyplot.actor_1",
                    body.position(), 18, "{}");
                index++;
                if (index >= beats) { done(current); return; }
                current.after(interval, beat);
            }

            beat(action);
        }
    });
}
