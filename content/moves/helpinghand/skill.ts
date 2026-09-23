/**
 * 帮助 / Helping Hand —— 执行组织。
 *
 * 核心念头：你替伙伴托一把——伸手把一小束光送进他身体，他**下一次出手**因此重得多；光用掉就散。
 *
 * 出手：短起手（windup 播伸手聚光），提交后在伙伴身上挂世界身份 world_combat:status/helpinghand
 *   （本单元效果 world_combat:helping_hand），并把强度、光点数量、施法者写进 world_combat:helpinghand_mark。
 * 兑现：伙伴的下一次伤害命中时（任何来源的攻击，宝可梦招式、原版生物近战、玩家挥击同一条路），入场规则
 *   读 mark 把伤害 ×(1+assist)，随后把这份力用掉——效果与 mark 一起消失，命中处炸开一圈暖光。
 * 自散：一直没出手时，效果走到时间尽头安静褪去（world_combat:mob_effect_removed 的 expired 岔路）。
 * 反制：这份力只兑现在下一次命中，对手可以先走位、用无敌帧或直接集火施法者让它落空。
 */
namespace PokemonSkills {
    function helpinghandAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.0, 0)); }

    WorldCombat.effect(helpinghandMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["boost", "motes"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] <= 0) throw new Error("Invalid helpinghand mark: " + key);
        });
        if (typeof value.caster !== "string") throw new Error("Invalid helpinghand mark: caster");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(helpinghandMark, "start", function () { });
    WorldCombat.effectHandler(helpinghandMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function helpinghandMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, helpinghandMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }

    // 兑现点：带身份者的下一次伤害命中时，伤害 ×(1+assist)，随后用掉这份力。
    NativeEffects.incomingRules.define({ id: "world_combat:move_helpinghand/strike", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.amount > 0)) return;
        const world = hit.world, source = hit.source;
        if (!world.valid(source) || String(source.ref()) === String(hit.target.ref())) return;
        if (!CombatStatus.has(world, source, helpinghandStatus)) return;
        const mark = helpinghandMarkOf(world, source);
        const boost = mark ? Math.max(0.1, Number(mark.boost) || 0.5) : 0.5;
        MobEffects.consumeTagged(world, source, StatusVocabulary.tag(helpinghandStatus));
        helpinghandReleaseMark(world, source);
        data.amount *= 1 + boost;
        const body = world.observe(source);
        if (body === null) return;
        const burst = Math.max(12, Math.round(16 + boost * 40));
        WorldFeedback.emit(world, helpinghandScene, 1, body.position(),
            { moment: "strike", target: String(source.ref()), boost: boost, burst: burst }, 26);
        WorldFeedback.text(world, helpinghandAbove(body.position()), helpinghandStrikeText, [], 24);
        world.sound("minecraft:block.amethyst_block.chime", body.position(), 14, "{}");
    } });
    function helpinghandReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, helpinghandMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }

    // 持助：每 20 刻在伙伴身上续一层暖光，数量沿用本招算出的光点数。
    WorldCombat.on("world_combat:move_helpinghand/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== helpinghandEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, helpinghandEffect) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const mark = helpinghandMarkOf(world, actor);
        WorldFeedback.keep(world, "world_combat:move_helpinghand/aura/" + String(actor.ref()), helpinghandScene, 1, body.position(),
            { moment: "ready", target: String(actor.ref()), motes: mark ? mark.motes : 18 }, 40);
    });

    // 自散：没等到出手，光安静褪去。
    WorldCombat.on("world_combat:move_helpinghand/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== helpinghandEffect || String(data.cause) !== "expired") return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        helpinghandReleaseMark(world, actor);
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, helpinghandScene, 1, body.position(),
            { moment: "fade", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, helpinghandAbove(body.position()), helpinghandFadeText, [], 22);
    });

    define({
        id: helpinghandId,
        cooldownParameter: "recharge", name: "帮助",
        description: "伸手托伙伴一把：把一小束光送进他身体，让他下一次命中更重；用掉即散，不用则自行褪去。只能帮助离自己够近的伙伴。",
        uses: ["让伙伴的下一发大招更重", "在队友连招前先托一把", "把一次命中机会放大成一次击倒"],
        kind: "friend", range: 4, maxRange: 6,
        prepare: 6, active: 0, recover: 5, cooldown: 48, style: "help",
        defaults: { rally: false },
        fields: [flag("rally", "同心协力")],
        resolve: function (pokemon, config, world, actor) {
            const context: NumberContext = { pokemon, skill: skills[helpinghandId], detail: { values: config }, world: world || null, actor: actor || null };
            return {
                prepare: Math.max(2, Math.round(p(helpinghandId, "tempo", context))),
                recover: Math.round(p(helpinghandId, "aftercast", context)),
                cooldown: Math.round(p(helpinghandId, "recharge", context)) + (config && config.rally ? 8 : 0),
                active: 0, range: p(helpinghandId, "reach", context)
            };
        },
        ready: function (action) {
            const target = action.target();
            if (target === null) return "invalid-target";
            if (String(target.ref()) === String(action.actor().ref())) return "invalid-target";
            return "";
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(helpinghandId, "reach", pokemon) : 4, geometry: "circle", style: "help",
                color: 0xFFD98A, label: config && config.rally ? "同心协力" : "帮助" };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_helpinghand:windup", helpinghandScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const body = world.observe(self), ally = world.observe(target);
            const boost = Math.max(0.4, Math.min(0.95, p(helpinghandId, "assist", action)));
            const ticks = Math.max(50, Math.round(p(helpinghandId, "assistTicks", action)));
            const motes = Math.max(8, Math.round(p(helpinghandId, "motes", action)));
            MobEffects.apply(world, target, helpinghandEffect, ticks, 0);
            helpinghandReleaseMark(world, target);
            world.effect(helpinghandMark, target, JSON.stringify({ boost: boost, motes: motes, caster: String(self.ref()) }), ticks);
            sound(action, "minecraft:block.amethyst_block.chime");
            if (body !== null && ally !== null) {
                WorldFeedback.emit(world, helpinghandScene, 1, ally.position(),
                    { moment: "reach", path: [String(self.ref()), String(target.ref())], target: String(target.ref()), motes: motes, boost: boost }, 22);
                WorldFeedback.text(world, helpinghandAbove(ally.position()), helpinghandReadyText, [motes], 30);
            }
            done(action);
        }
    });
}
