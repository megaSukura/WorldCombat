/**
 * 锁定 / lockon 的出手方式。
 *
 * 核心念头：把准星咬住一个对手的位置，把它钉在射线里——**接下来的这一击落在它身上时不会脱靶**；命中即散。
 *
 * 三幕：
 *   咬上（windup，提交前只观察与预告，可被打断，不花代价）。
 *   锁死（提交后）：给自己挂 world_combat:lockon_focus（身份 world_combat:status/lockon），给目标挂
 *     world_combat:lockon_track（轻压移动）或「钉死」时的 world_combat:lockon_clamp（完全钉住移动与飞行）；
 *     标记 world_combat:lockon_mark 记下目标、准星量与咬住时长。
 *   兑现（下一次伤害命中**锁住的那个目标**）：NativeEffects.appliedRules 用掉这层锁、移除目标身上的痕迹。
 *   自散：不出手时锁定期走完，锁与痕迹一起散（world_combat:mob_effect_removed）。
 *
 * 与同族分开：磨砺只管自己的要害、心之眼改自己的准星；锁定改的是**对手的位置**，把它拖在你的射线上。
 * 打别的目标不会兑现；目标退出射程、被解掉或让这一击落空，都拿不到兑现。
 */
namespace PokemonSkills {
    function lockonAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.2, 0)); }

    WorldCombat.effect(lockonMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["motes", "pin", "held"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key]) || value[key] < 0) throw new Error("Invalid lockon mark: " + key);
        });
        if (typeof value.target !== "string") throw new Error("Invalid lockon mark: target");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(lockonMark, "start", function () { });
    WorldCombat.effectHandler(lockonMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    function lockonMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, lockonMark);
        return views.length ? JSON.parse(String(views[0].data())) : null;
    }
    function lockonReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const views = world.effects(actor, lockonMark);
        if (views.length) world.operation(views[0].id(), "world_combat:dispel", "{}");
    }
    /** 移除目标身上的咬住痕（两种痕迹都试，缺一无害）。 */
    function lockonClearTrack(world: CombatWorld, ref: string): void {
        const target = world.actor(ref);
        if (target === null || !world.valid(target)) return;
        MobEffects.consume(world, target, lockonTrackEffect);
        MobEffects.consume(world, target, lockonClampEffect);
    }
    /** 收束这层锁：释放标记、移除目标痕迹；自然到期的岔路额外播一次褪去。 */
    function lockonClose(world: CombatWorld, actor: CombatActor, cause: string): void {
        const mark = lockonMarkOf(world, actor);
        if (mark === null) return;
        lockonReleaseMark(world, actor);
        lockonClearTrack(world, mark.target);
        if (cause !== "expired") return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, lockonScene, 1, body.position(), { moment: "fade", target: String(actor.ref()) }, 22);
        WorldFeedback.text(world, lockonAbove(body.position()), lockonFadeText, [], 22);
    }

    // 兑现点：带锁者下一次伤害命中**锁住的那个目标**时用掉这层锁，痕迹一并移除。
    NativeEffects.appliedRules.define({ id: "world_combat:move_lockon/spend", apply: function (hit) {
        const data = hit.data;
        if (!data || !(data.actual > 0)) return;
        if (data.category !== "physical" && data.category !== "special") return;
        const world = hit.world, source = hit.source;
        if (!world.valid(source)) return;
        const mark = lockonMarkOf(world, source);
        if (mark === null || String(hit.target.ref()) !== String(mark.target)) return;
        lockonReleaseMark(world, source);
        lockonClearTrack(world, mark.target);
        if (!MobEffects.consumeTagged(world, source, StatusVocabulary.tag(lockonStatus)).length) return;
        const victim = world.observe(hit.target);
        const ratio = victim === null ? 0 : Math.max(0, Math.min(1, data.actual / Math.max(1, victim.maxHealth())));
        const motes = Math.max(12, Math.round((Number(mark.motes) || 14) * (0.6 + ratio)));
        const body = world.observe(source);
        if (body === null) return;
        WorldFeedback.emit(world, lockonScene, 1, body.position(),
            { moment: "strike", target: String(source.ref()), path: [String(source.ref()), String(hit.target.ref())],
                motes: motes, held: mark.held, intensity: Math.max(0.6, Math.min(2.2, 0.7 + ratio)) }, 26);
        WorldFeedback.text(world, lockonAbove(body.position()), lockonStrikeText, [], 26);
        world.sound("minecraft:block.conduit.attack.target", body.position(), 14, "{}");
    } });

    // 自散/外解：锁定期走到头或被牛奶一类效果解除时，锁与目标痕迹一起散；自然到期额外播一次褪去。
    WorldCombat.on("world_combat:move_lockon/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== lockonFocusEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        lockonClose(world, actor, String(data.cause));
    });

    // 存续期：每 20 刻续一条准星线，数量沿用本招算出的准星数。
    WorldCombat.on("world_combat:move_lockon/aura", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== lockonFocusEffect || event.world().tick() % 20 !== 0) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || MobEffects.read(world, actor, lockonFocusEffect) === null) return;
        const mark = lockonMarkOf(world, actor);
        if (mark === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "world_combat:move_lockon/link/" + String(actor.ref()), lockonScene, 1, body.position(),
            { moment: "link", target: String(actor.ref()), path: [String(actor.ref()), String(mark.target)],
                motes: Math.max(8, Math.round(Number(mark.motes) || 14) / 2), held: mark.held }, 40);
    });

    define({
        id: lockonId,
        cooldownParameter: "recharge",
        name: "锁定",
        description: "把准星咬住一个对手，拖慢它的移动（钉死时连飞行一起钉住）；你用物理或特殊伤害命中它时锁即用掉，锁定期走完也会散去。",
        uses: ["在对手要逃开前先钉住它", "把目标拖住，为近身追击争取时间", "把跑得快的目标拖慢下来集火"],
        kind: "enemy",
        range: 9,
        maxRange: 13,
        prepare: 7,
        active: 1,
        recover: 4,
        cooldown: 88,
        style: "lock",
        defaults: { hold: false },
        fields: [flag("hold", "钉死")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[lockonId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(2, Math.round(p(lockonId, "tempo", context))),
                recover: Math.round(p(lockonId, "aftercast", context)),
                cooldown: Math.round(p(lockonId, "recharge", context)),
                active: 1,
                range: p(lockonId, "reach", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(lockonId, "reach", pokemon) : 9, geometry: "line", style: "lock",
                color: 0x6FD8FF, label: config && config.hold ? "锁定·钉死" : "锁定" };
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_lockon:windup", lockonScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hold: config && config.hold ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), target = action.target();
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, lockonScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            const point = at === null ? action.targetPosition() : at.position();
            if (!world.clear(origin, point)) {
                WorldFeedback.emit(world, lockonScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, lockonAbove(point), "world_combat.move.lockon.text.blocked", [], 28);
                done(action);
                return;
            }
            const hold = !!(config && config.hold);
            const ticks = Math.max(60, Math.round(p(lockonId, "lockTicks", action)));
            const pin = Math.max(30, Math.round(p(lockonId, "pinTicks", action)));
            const motes = Math.max(8, Math.round(p(lockonId, "motes", action)));
            MobEffects.apply(world, actor, lockonFocusEffect, ticks, 0);
            MobEffects.consume(world, target, lockonTrackEffect);
            MobEffects.consume(world, target, lockonClampEffect);
            MobEffects.apply(world, target, hold ? lockonClampEffect : lockonTrackEffect, pin, 0);
            lockonReleaseMark(world, actor);
            world.effect(lockonMark, actor, JSON.stringify({ motes: motes, pin: pin, held: hold ? 1 : 0, target: String(target.ref()) }), ticks);
            sound(action, "minecraft:block.beacon.power_select");
            if (self !== null) {
                WorldFeedback.emit(world, lockonScene, 1, self.position(),
                    { moment: "lock", target: String(target.ref()), path: [String(actor.ref()), String(target.ref())],
                        motes: motes, pin: pin, held: hold ? 1 : 0, scale: Math.max(0.6, Math.min(2, ticks / 180)) }, 32);
                WorldFeedback.text(world, lockonAbove(self.position()), lockonReadyText, [Math.round(pin / 20)], 30);
            }
            done(action);
        }
    });
}
