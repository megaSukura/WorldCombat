/**
 * 增强拳 / poweruppunch 的出手方式。
 *
 * 核心念头：一记短促的直拳打上去，每打中一次，拳头就硬一分。这招不靠单次伤害，靠把下一次打得更重——
 *   它的身份是「越打越硬的拳头」，不是某一下的重击。
 *
 * 两幕：
 *   起（windup，提交前）：收拳、拧腰，指节上先亮起一层硬光，只播预告。
 *   硬（execute，提交后）：朝瞄准方向一记直拳探出去（reach／radius），真实首碰决定打中谁（墙与友方身体同样挡拳）；
 *       只有这一拳真的造成伤害（`impact` 回执为真）才算命中，击倒目标的最后一拳同样算。命中后用
 *       `NativeEffects.boostWindow` 把这次实际抬到的物攻级数挂到「拳已变硬」载体窗口上：
 *       续期由同一次应用上的旧窗口原样结转，到期、被清除或下次刷新都只收回本招自己贡献的那几级，
 *       不从当前等级减总数，也不会扣掉别处（或已满）的攻击等级。这一拳空放或对手免疫时得不到等级。
 *   续（linger）：窗口内的拳上留一层硬光，环片数量对应当前窗口实际增益；窗口结束或被清除时随窗口一起收。
 *
 * 与同族分开：同是拳类，迷昏拳是**一串按节拍的连拳**（一记内打多下、打懵），增强拳是**一记单拳**，
 *   它的重复跨施放累积——打在同一个对手身上，第二拳、第三拳比第一拳重。蓄劲配置把这一点推得更陡。
 *
 * 配置 `charge` 由 resolve 改时序、由公式改级数／威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const poweruppunchScene = "world_combat:move_poweruppunch";
    const poweruppunchHardened = "world_combat:poweruppunch_hardened";
    const poweruppunchContribution = "world_combat:move/poweruppunch";
    const poweruppunchHardenText = "world_combat.move.poweruppunch.text.harden";
    const poweruppunchPeakText = "world_combat.move.poweruppunch.text.peak";
    const poweruppunchMissText = "world_combat.move.poweruppunch.text.miss";
    const poweruppunchFadeText = "world_combat.move.poweruppunch.text.fade";

    /** 本招窗口贡献所在的定义：宝可梦走原生修正层，其他战斗者走共享阶梯窗口。 */
    function poweruppunchWindowDefinition(actor: CombatActor): string {
        return String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
    }
    /** 本招窗口实际贡献的物攻级数（按窗口效果 id 或旧载体 key 匹配本招来源的那一层）。 */
    export function poweruppunchWindowLevels(world: CombatWorld, actor: CombatActor, id?: number, carrierKey?: string): number {
        if (!world.valid(actor)) return 0;
        const views = world.effects(actor, poweruppunchWindowDefinition(actor));
        for (let i = 0; i < views.length; i++) {
            const value = JSON.parse(String(views[i].data()));
            if (!value || !value.stages || value.source !== poweruppunchContribution) continue;
            if (id !== undefined && views[i].id() === id) return Math.max(0, Number(value.stages.atk) || 0);
            if (carrierKey !== undefined && value.carrier && String(value.carrier.key) === carrierKey)
                return Math.max(0, Number(value.stages.atk) || 0);
        }
        return 0;
    }
    /** AI 与表现共用的窗口快照：是否还戴着、剩余刻数、本窗口实际增益。 */
    export function poweruppunchWindow(world: CombatWorld, actor: CombatActor): { active: boolean; remaining: number; total: number } {
        const effect = MobEffects.read(world, actor, poweruppunchHardened);
        if (effect === null) return { active: false, remaining: 0, total: 0 };
        return { active: true, remaining: effect.duration(), total: poweruppunchWindowLevels(world, actor, undefined, String(effect.key())) };
    }

    define({
        id: "poweruppunch",
        cooldownParameter: "recharge",
        name: "增强拳",
        description: "一记短促直拳打上去：拳本身不重，但每次命中都会让自己的拳头硬一分（物攻 +1 级，蓄劲 +2 级），打中的那一下把下一次打得更重。手感在起势，不在单次伤害；只有真正造成伤害的拳头才算，击倒目标的最后一拳同样算。",
        uses: ["用一记直拳起势，把物攻垫起来", "贴身对同一个目标连打，越打越重", "在开战几拍内把攻击拉满再转重手"],
        kind: "aim",
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
            const scale = Math.max(0.6, Math.min(2.0, reach / 2.2));
            const intensity = Math.max(0.6, Math.min(2.4, jab / 20 + NativeEffects.effectiveStage(world, actor, "atk") / 6));

            const aimed = action.targetPosition();
            const flat = WorldCombat.point(aimed.x() - body.position().x(), 0, aimed.z() - body.position().z());
            const forward = flat.length() < 1e-6 ? aim(action) : flat.unit();
            const from = body.position();
            action.face(from.plus(forward), 24, 24);
            WorldFeedback.emit(world, poweruppunchScene, 1, from.plus(WorldCombat.point(0, body.height() * 0.55, 0)),
                { moment: "jab", direction: [forward.x(), forward.y(), forward.z()], reach: reach,
                    sparks: sparks, scale: scale, intensity: intensity, charge: charge ? 1 : 0 }, 20);
            sound(action, "minecraft:entity.player.attack.sweep");

            // 真实首碰：短拳沿方向探出；友方身体也纳入接触（伤害许可仍由命中层独立决定），墙同样挡拳。
            const strike = action.trace(from, from.plus(forward.scale(reach)), radius, true);
            if (!strike.hitEntity()) {
                WorldFeedback.emit(world, poweruppunchScene, 1, from.plus(forward.scale(reach * 0.7)),
                    { moment: "whiff", sparks: Math.round(sparks * 0.5), scale: scale }, 18);
                WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), poweruppunchMissText, [], 20);
                done(action);
                return;
            }
            const victim = strike.target();
            const point = strike.position();
            // 只有真正造成伤害才算命中；击倒目标的最后一拳仍在此结算成功后照常增强。
            const landed = impact(action, strike, "poweruppunch", jab,
                { damage: damageSpec("poweruppunch", "jab"), contact: true, punch: true }, "jab");
            if (!landed) {
                WorldFeedback.emit(world, poweruppunchScene, 1, point,
                    { moment: "whiff", sparks: Math.round(sparks * 0.5), scale: scale }, 18);
                WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), poweruppunchMissText, [], 20);
                done(action);
                return;
            }
            // 命中回执已成立：即使目标倒下也把这一拳算作有效热身。
            if (victim !== null && world.valid(victim)) world.displace(victim, forward.scale(knock));

            const previous = MobEffects.read(world, actor, poweruppunchHardened);
            const previousKey = previous !== null ? String(previous.key()) : "";
            const beforeOwned = previousKey.length ? poweruppunchWindowLevels(world, actor, undefined, previousKey) : 0;
            const carrier = MobEffects.apply(world, actor, poweruppunchHardened, window, previous !== null ? previous.amplifier() : 0);
            let windowId = 0, owned = 0;
            if (carrier !== null) {
                windowId = NativeEffects.boostWindow(world, actor, { atk: gain }, carrier.duration(),
                    poweruppunchContribution, carrier, previous);
                if (windowId) owned = poweruppunchWindowLevels(world, actor, windowId);
            }
            // 上限已被别处占满、本招一层都加不上时不留下空窗口，也不记成 +1。
            if (!windowId) MobEffects.consume(world, actor, poweruppunchHardened);
            const gained = Math.max(0, owned - beforeOwned);
            const peaked = owned >= 6 && beforeOwned < 6;

            const after = world.observe(actor);
            const fist = after === null ? from : after.position();
            WorldFeedback.emit(world, poweruppunchScene, 1, point,
                { moment: peaked ? "peak" : "harden", target: String(victim !== null && world.valid(victim) ? victim.ref() : ""),
                    gained: gained, total: owned, sparks: sparks, scale: scale, intensity: intensity, charge: charge ? 1 : 0 }, 24);
            WorldFeedback.emit(world, poweruppunchScene, 1, fist.plus(WorldCombat.point(0, after === null ? 1 : after.height() * 0.6, 0)),
                { moment: peaked ? "peak" : "harden", target: String(actor.ref()), gained: gained, total: owned,
                    sparks: sparks, scale: scale, intensity: intensity }, 28);
            // 只续期而没涨级时不冒升级数字；真的涨了级才浮字。
            if (gained > 0 || peaked) {
                WorldFeedback.text(world, fist.plus(WorldCombat.point(0, (after === null ? 1.4 : after.height()) + 0.1, 0)),
                    peaked ? poweruppunchPeakText : poweruppunchHardenText, peaked ? [owned] : [gained, owned], 30);
            }
            // 拳上的持续硬光绑在这次真正的窗口上：窗口自然到期、刷新或被清除时随它一起收。
            if (windowId) {
                WorldFeedback.onEffect(world, windowId, "world_combat:move_poweruppunch/linger", poweruppunchScene, 1,
                    fist.plus(WorldCombat.point(0, after === null ? 0.9 : after.height() * 0.6, 0)),
                    { moment: "linger", target: String(actor.ref()), total: owned,
                        scale: scale, intensity: intensity, full: owned >= 6 ? 14 : 0 });
            }
            sound(action, "cobblemon:impact.fighting");
            done(action);
        }
    });

    // 拳硬窗口走完或被清除：等级由载体窗口按实际贡献自行收回，这里只收回尾表现。
    WorldCombat.on("world_combat:move_poweruppunch/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== poweruppunchHardened) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束，不播散去。
        if (MobEffects.read(world, actor, poweruppunchHardened) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, poweruppunchScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, body.height() + 0.1, 0)), poweruppunchFadeText, [], 24);
    });
}
