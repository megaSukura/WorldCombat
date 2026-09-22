/**
 * 魂舞烈音爆 / clangoroussoul 的出手方式。
 *
 * 念头的形状（两幕 + 逐拍结算）：
 *  1) 起势——站定仰首，脚下的声波光环向内收束（windup 预告，可被打断，此时代价未结清）。
 *  2) 逐拍——提交后每一拍支付一次生命，把攻击、防御、特攻、特防、速度各抬一级（`NativeEffects.boost`，
 *     宝可梦走原生等级、其他生物落到属性），并从脚边荡出一圈声波。生命不足以支付下一拍时提前收势。
 *  3) 收势——唱完后一段余韵；被打断则舞停下，已获得的等级保留。
 *
 * 与同族的甩肉分开：这是慢工出细活的分拍仪式、抬全部五项、有声音；甩肉是一刀、只抬进攻三项、无声音。
 */
namespace PokemonSkills {
    const clangorousScene = "world_combat:move_clangoroussoul";
    const clangorousBeatText = "world_combat.move.clangoroussoul.text.beat";
    const clangorousClimaxText = "world_combat.move.clangoroussoul.text.climax";
    const clangorousWeakText = "world_combat.move.clangoroussoul.text.weak";

    define({
        id: "clangoroussoul",
        name: "Clangorous Soul",
        description: "The user boosts all its stats by using some of its own HP.",
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
                if (body.health() <= body.maxHealth() * (cost + reserve)) {
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), clangorousWeakText, [], 26);
                    done(current);
                    return;
                }
                const paid = -world.health(actor, -body.maxHealth() * cost, "world_combat:clangoroussoul_cost");
                if (paid < 1) { done(current); return; }
                NativeEffects.boost(world, actor, "atk", rise);
                NativeEffects.boost(world, actor, "def", rise);
                NativeEffects.boost(world, actor, "spa", rise);
                NativeEffects.boost(world, actor, "spd", rise);
                NativeEffects.boost(world, actor, "spe", rise);
                const climax = index === beats - 1;
                const moment = climax && beats > 1 ? "climax" : "beat";
                WorldFeedback.emit(world, clangorousScene, 1, body.position(),
                    { moment: moment, scale: radius / 4, intensity: (index + 1) / beats, beat: index + 1, beats: beats }, 30);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)),
                    climax && beats > 1 ? clangorousClimaxText : clangorousBeatText, [index + 1, beats], 26);
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
