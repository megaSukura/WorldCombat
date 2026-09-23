/**
 * 增强拳 / poweruppunch 的出手方式。
 *
 * 核心念头：一记短促的直拳打上去，每打中一次，拳头就硬一分。这招不靠单次伤害，靠把下一次打得更重——
 *   它的身份是「越打越硬的拳头」，不是某一下的重击。
 *
 * 两幕：
 *   起（windup，提交前）：收拳、拧腰，指节上先亮起一层硬光，只播预告。
 *   硬（execute，提交后）：朝瞄准方向一记直拳探出去（reach／radius），打到活体结算一记 jab 接触+拳伤害；
 *       命中即把拳头硬化 `gain` 级（`NativeEffects.boost(...,"atk",gain)`，写入公共能力阶梯），并刷新共享身份
 *       `world_combat:status/hardened` 的「拳硬」窗口（amplifier 记录本招累计抬起的级数）。物攻等级抬高后，
 *       下一记直拳经共享伤害结算更重——「越来越硬」直接发生在伤害上。硬化到顶（+6）时额外亮一下、浮出「拳已硬到极致」。
 *   续（linger）：窗口内的拳上留一层硬光；窗口到期或被清除时，按 amplifier 原样收回这段等级。
 *
 * 与同族分开：同是拳类，迷昏拳是**一串按节拍的连拳**（一记内打多下、打懵），增强拳是**一记单拳**，
 *   它的重复跨施放累积——打在同一个对手身上，第二拳、第三拳比第一拳重。蓄劲配置把这一点推得更陡。
 *
 * 配置 `charge` 由 resolve 改时序、由公式改级数／威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const poweruppunchScene = "world_combat:move_poweruppunch";
    const poweruppunchHardened = "world_combat:poweruppunch_hardened";
    const poweruppunchHardenText = "world_combat.move.poweruppunch.text.harden";
    const poweruppunchPeakText = "world_combat.move.poweruppunch.text.peak";
    const poweruppunchMissText = "world_combat.move.poweruppunch.text.miss";
    const poweruppunchFadeText = "world_combat.move.poweruppunch.text.fade";

    /** 公共能力阶梯：宝可梦读原生等级，其他战斗者读同一套等级落在属性上的载体。 */
    function poweruppunchStage(world: CombatWorld, actor: CombatActor, stat: string): number {
        return String(actor.domain()) === "cobblemon"
            ? NativeEffects.stage(NativeEffects.read(world, actor), stat)
            : CombatStages.stage(world, actor, stat);
    }
    /** 抬高并返回这一次真正抬到的级数（顶到上限时可能少于请求值）。 */
    function poweruppunchRaise(world: CombatWorld, actor: CombatActor, stat: string, amount: number): number {
        const before = poweruppunchStage(world, actor, stat);
        NativeEffects.boost(world, actor, stat, amount);
        return Math.max(0, poweruppunchStage(world, actor, stat) - before);
    }
    /** 挂上/刷新「拳硬」窗口，amplifier 记录本招累计抬起的级数，供窗口结束时原样收回。 */
    function poweruppunchOpen(world: CombatWorld, actor: CombatActor, ticks: number, levels: number): number {
        const existing = MobEffects.read(world, actor, poweruppunchHardened);
        const total = Math.min(6, Math.max(0, existing === null ? 0 : existing.amplifier()) + levels);
        MobEffects.apply(world, actor, poweruppunchHardened, ticks, total);
        return total;
    }

    define({
        id: "poweruppunch",
        cooldownParameter: "recharge",
        name: "增强拳",
        description: "通过反复击打对手，使自己的拳头慢慢变硬。打中对手攻击就会提高。",
        uses: ["用一记必中的直拳起势，把物攻垫起来", "贴身对同一个目标连打，越打越重", "在开战几拍内把攻击拉满再转重手"],
        kind: "enemy",
        range: 2.5,
        maxRange: 2.9,
        prepare: 6,
        active: 12,
        recover: 7,
        cooldown: 26,
        style: "punch",
        defaults: { charge: false, ai: { maxChase: 6, topUp: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("poweruppunch", "reach", pokemon) * 1.3, geometry: "cone", style: "punch",
                color: 0xE8A24F, label: config && config.charge === true ? "蓄劲增强拳" : "增强拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["poweruppunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("poweruppunch", "tempo", context)),
                recover: Math.round(p("poweruppunch", "aftercast", context)),
                cooldown: Math.round(p("poweruppunch", "recharge", context)),
                active: skills["poweruppunch"].active,
                range: p("poweruppunch", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("poweruppunch:draw", poweruppunchScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", charge: config && config.charge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const reach = p("poweruppunch", "reach", action);
            const radius = p("poweruppunch", "radius", action);
            const jab = p("poweruppunch", "jab", action);
            const gain = Math.max(1, Math.round(p("poweruppunch", "gain", action)));
            const window = Math.max(60, Math.round(p("poweruppunch", "window", action)));
            const knock = p("poweruppunch", "knock", action);
            const sparks = Math.max(6, Math.round(p("poweruppunch", "sparks", action)));
            const charge = !!(config && config.charge === true);
            const before = poweruppunchStage(world, actor, "atk");
            const scale = Math.max(0.6, Math.min(2.0, reach / 2.2));
            const intensity = Math.max(0.6, Math.min(2.4, jab / 20 + before / 6));

            const aimed = action.targetPosition();
            const flat = WorldCombat.point(aimed.x() - body.position().x(), 0, aimed.z() - body.position().z());
            const forward = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const from = body.position();
            action.face(from.plus(forward), 24, 24);
            WorldFeedback.emit(world, poweruppunchScene, 1, from.plus(WorldCombat.point(0, body.height() * 0.55, 0)),
                { moment: "jab", direction: [forward.x(), forward.y(), forward.z()], reach: reach,
                    sparks: sparks, scale: scale, intensity: intensity, charge: charge ? 1 : 0 }, 20);
            sound(action, "minecraft:entity.player.attack.sweep");

            const strike = action.trace(from, from.plus(forward.scale(reach)), radius);
            if (!strike.hitEntity()) {
                WorldFeedback.emit(world, poweruppunchScene, 1, from.plus(forward.scale(reach * 0.7)),
                    { moment: "whiff", sparks: Math.round(sparks * 0.5), scale: scale }, 18);
                WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), poweruppunchMissText, [], 20);
                done(action);
                return;
            }
            const victim = strike.target();
            const point = strike.position();
            const landed = impact(action, strike, "poweruppunch", jab,
                { damage: damageSpec("poweruppunch", "jab"), contact: true, punch: true }, "jab");
            if (!landed || victim === null || !world.valid(victim)) {
                WorldFeedback.emit(world, poweruppunchScene, 1, point,
                    { moment: "whiff", sparks: Math.round(sparks * 0.5), scale: scale }, 18);
                done(action);
                return;
            }
            const victimBody = world.observe(victim);
            if (victimBody !== null) world.displace(victim, forward.scale(knock));
            const gained = poweruppunchRaise(world, actor, "atk", gain);
            const total = poweruppunchOpen(world, actor, window, gained);
            const peaked = total >= 6 && total - gained < 6;
            const after = world.observe(actor);
            const fist = after === null ? from : after.position();
            WorldFeedback.emit(world, poweruppunchScene, 1, point,
                { moment: "harden", target: String(victim.ref()), gained: gained, total: total, sparks: sparks,
                    scale: scale, intensity: intensity, charge: charge ? 1 : 0 }, 24);
            WorldFeedback.emit(world, poweruppunchScene, 1, fist.plus(WorldCombat.point(0, after === null ? 1 : after.height() * 0.6, 0)),
                { moment: peaked ? "peak" : "harden", target: String(actor.ref()), gained: gained, total: total,
                    sparks: sparks, scale: scale, intensity: intensity }, 28);
            WorldFeedback.text(world, fist.plus(WorldCombat.point(0, (after === null ? 1.4 : after.height()) + 0.1, 0)),
                peaked ? poweruppunchPeakText : poweruppunchHardenText, peaked ? [total] : [gained, total], 30);
            sound(action, "cobblemon:impact.fighting");
            done(action);
        }
    });

    // 拳硬窗口走完或被清除：把这段直拳抬起的物攻等级原样收回（只收到当前实际持有的正等级）。
    WorldCombat.on("world_combat:move_poweruppunch/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== poweruppunchHardened) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const levels = Math.max(1, Math.round(Number(data.amplifier) || 1));
        const loss = Math.min(levels, Math.max(0, poweruppunchStage(world, actor, "atk")));
        if (loss > 0) NativeEffects.boost(world, actor, "atk", -loss);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, poweruppunchScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() + 0.1, 0)), poweruppunchFadeText, [loss], 24);
    });

    // 拳硬存续期：拳上留一层低密度硬光，每 20 刻续期一次，让出本体视线。
    WorldCombat.on("world_combat:move_poweruppunch/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== poweruppunchHardened) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "poweruppunch:hardened:" + String(actor.ref()), poweruppunchScene, 1,
            body.position().plus(WorldCombat.point(0, body.height() * 0.6, 0)),
            { moment: "linger", target: String(actor.ref()), total: Math.max(0, Number(data.amplifier) || 0) }, 40);
    });
}
