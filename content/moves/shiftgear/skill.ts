/**
 * 换档 / shiftgear 的执行组织。
 *
 * 核心念头：把自己当成一台机器换挡。身侧一对齿轮咬合着转起来，到位后「咔」地锁定：
 * 扭力档把更多提升给攻击，超速档给速度，两档总量相同。
 *
 * 两档互斥：提升只维持一段有限窗口（span），由同一份挡位载体拥有；换到另一档会先撤掉本招
 * 上一档写下的贡献、再挂上这一档，所以来回换不会累积。挡位由载体 amplifier 记录。
 * 同一档仍在生效时拒绝重复换（ready 返回 same-gear），不白花 PP。
 * 其他来源的攻速等级（龙舞、高速移动、装备等）不属于本招，换档只回收自己那一份。
 *
 * 出手：起手随速度（windup 播齿轮加速咬合），可被打断，打断不消耗任何东西。
 * 换挡：提交后 MobEffects.set 精确落挡，NativeEffects.boostWindow 把攻速挂在这份载体上。
 * 反制：换挡期间会停下来；起手越慢，越容易在完成前被打断，白花一次 PP。
 */
namespace PokemonSkills {
    const shiftgearScene = "world_combat:move_shiftgear";
    const shiftgearGear = "world_combat:shiftgear_gear";
    const shiftgearContribution = "world_combat:move/shiftgear";
    const shiftgearGearText = "world_combat.move.shiftgear.text.gear";
    const shiftgearCappedText = "world_combat.move.shiftgear.text.capped";
    const shiftgearFadeText = "world_combat.move.shiftgear.text.faded";

    /** 挡位索引：0 扭力、1 超速，与偏好选项一致。 */
    function shiftgearGearIndex(config: any): number { return config && config.gear === 0 ? 0 : 1; }

    /** 只关掉本招来源写下的窗口，让再次换挡替换而不是叠加；其他来源的等级不动。 */
    function shiftgearCloseOwnWindows(world: CombatWorld, actor: CombatActor): void {
        const definition = String(actor.domain()) === "cobblemon" ? "cobblemon_world_combat:modifier" : CombatStages.windowDefinition;
        const views = world.effects(actor, definition);
        for (let index = 0; index < views.length; index++) {
            const data = JSON.parse(String(views[index].data()));
            if (data && data.source === shiftgearContribution) NativeEffects.windowClose(world, views[index].id());
        }
    }

    define({
        id: "shiftgear",
        cooldownParameter: "wait",
        name: "换档",
        description: "转动齿轮换到扭力档或超速档：两档在攻击与速度之间分配相同的总提升，换到另一档会替换本招当前贡献并重新计时。提升只维持一段窗口，窗口走完或被清除时自行收回。",
        uses: ["开场把自己变成另一台机器", "在追人前先提速", "被迫近身前抢先换挡"],
        kind: "self",
        range: 0,
        prepare: 12,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "gear",
        defaults: { gear: 1, ai: { maxChase: 16, minGap: 4 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shiftgear"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("shiftgear", "telegraph", context)),
                recover: Math.round(p("shiftgear", "aftermath", context)),
                cooldown: Math.round(p("shiftgear", "wait", context)),
                active: 1
            };
        },
        // 同一档仍在生效时不再支付：换到另一档才会替换本招贡献。
        ready: function (action, config) {
            const world = action.sense(), actor = action.actor();
            const current = MobEffects.read(world, actor, shiftgearGear);
            return current && current.amplifier() === shiftgearGearIndex(config) ? "same-gear" : "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shiftgear:windup", shiftgearScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", gear: shiftgearGearIndex(config), start: action.sense().tick(), duration: prepare }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const gear = shiftgearGearIndex(config);
            const attack = Math.max(1, Math.min(3, Math.round(p("shiftgear", "attackGift", action))));
            const speed = Math.max(1, Math.min(3, Math.round(p("shiftgear", "speedGift", action))));
            const span = Math.max(60, Math.round(p("shiftgear", "span", action)));
            const orbit = Math.max(0.9, p("shiftgear", "orbit", action));
            const carrier = MobEffects.set(world, self, shiftgearGear, span, gear);
            if (carrier === null) { done(action); return; }
            // A native refusal preserves the existing gear. Only a confirmed new carrier replaces its contribution.
            shiftgearCloseOwnWindows(world, self);
            const before = NativeEffects.effectiveStages(world, self);
            let windowId = 0, gainedAtk = 0, gainedSpe = 0;
            if (carrier) {
                windowId = NativeEffects.boostWindow(world, self, { atk: attack, spe: speed }, span, shiftgearContribution, carrier);
                const raised = NativeEffects.effectiveStages(world, self);
                gainedAtk = (raised.atk || 0) - (before.atk || 0);
                gainedSpe = (raised.spe || 0) - (before.spe || 0);
            }
            const at = body.position();
            if (!windowId) {
                // 攻速都已到顶：不留空载体，也不播升级。
                MobEffects.consume(world, self, shiftgearGear);
                WorldFeedback.emit(world, shiftgearScene, 1, at, { moment: "capped", gear: gear, orbit: orbit }, 24);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), shiftgearCappedText, [], 28);
                done(action); return;
            }
            WorldFeedback.emit(world, shiftgearScene, 1, at,
                { moment: "engage", actor: String(self.ref()), gear: gear, orbit: orbit, attack: gainedAtk, speed: gainedSpe, start: world.tick() }, 30);
            // 挡位在线：一小枚齿轮符号随真实窗口存续，窗口到期／被清除／替换时随它收回。
            WorldFeedback.onEffect(world, windowId, "world_combat:move_shiftgear/window", shiftgearScene, 1, at,
                { moment: "window", actor: String(self.ref()), gear: gear, orbit: orbit, attack: gainedAtk, speed: gainedSpe });
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), shiftgearGearText,
                [gainedAtk > 0 ? "+" + gainedAtk : String(gainedAtk), gainedSpe > 0 ? "+" + gainedSpe : String(gainedSpe)], 34);
            world.sound("minecraft:block.piston.extend", at, 18, "{}");
            done(action);
        }
    });

    // 挡位载体到期或被清除：贡献由共享窗口自行收回，这里只做退场反馈；替换时旧载体被移除而新载体仍在，不播散去。
    WorldCombat.on("world_combat:move_shiftgear/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== shiftgearGear) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, shiftgearGear) !== null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, shiftgearScene, 1, body.position(),
            { moment: "fade", actor: String(actor.ref()), start: world.tick() }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), shiftgearFadeText, [], 22);
    });
}
